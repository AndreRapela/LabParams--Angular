import {
  ApplicationConfig,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './acessos/auth/auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        (request, next) => {
          if (!request.url.startsWith(API_CONFIG.baseUrl)) {
            return next(request);
          }

          const authService = inject(AuthService);
          return from(authService.getSession()).pipe(
            switchMap((session) => {
              const authorizedRequest = session?.access_token
                ? request.clone({
                    setHeaders: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  })
                : request;

              return next(authorizedRequest).pipe(
                catchError((error: { status?: number }) => {
                  if (error.status !== 401 || !session) {
                    return throwError(() => error);
                  }

                  return from(authService.refreshToken()).pipe(
                    switchMap((refreshed) => {
                      const token = authService.getAccessToken();
                      if (!refreshed || !token) {
                        return throwError(() => error);
                      }

                      return next(
                        request.clone({
                          setHeaders: { Authorization: `Bearer ${token}` },
                        })
                      );
                    })
                  );
                })
              );
            })
          );
        },
      ])
    ),
  ],
};
