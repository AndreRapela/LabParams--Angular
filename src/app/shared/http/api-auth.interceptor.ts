import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from '../../../config/api.config';
import { AccessBlockReason } from '../../acessos/auth/access-state';
import { AuthService } from '../../acessos/auth/auth.service';

function normalizedBasePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function isApiRequestUrl(
  requestUrl: string,
  apiBaseUrl = API_CONFIG.baseUrl,
  pageOrigin = globalThis.location?.origin ?? 'http://localhost',
): boolean {
  try {
    const request = new URL(requestUrl, pageOrigin);
    const base = new URL(apiBaseUrl, pageOrigin);
    if (request.origin !== base.origin) return false;

    const basePath = normalizedBasePath(base.pathname);
    return (
      basePath === '/' ||
      request.pathname === basePath ||
      request.pathname.startsWith(`${basePath}/`)
    );
  } catch {
    return false;
  }
}

export function accessReasonFromApiError(
  error: unknown,
): AccessBlockReason | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body = error.error as { code?: unknown } | null;
  switch (body?.code) {
    case 'ACESSO_PENDENTE':
      return 'pendente';
    case 'USUARIO_NAO_CADASTRADO':
      return 'nao-cadastrado';
    case 'MIGRACAO_ACESSO_PENDENTE':
      return 'migracao-pendente';
    case 'PERFIL_NAO_AUTORIZADO':
      return 'perfil';
    default:
      return null;
  }
}

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequestUrl(request.url)) return next(request);

  const authService = inject(AuthService);
  const router = inject(Router);
  const accessCheckUrl = `${API_CONFIG.baseUrl}/acesso-atual`;
  const isAccessCheck = request.url === accessCheckUrl;

  const forwardError = (error: unknown) => {
    const reason = isAccessCheck ? null : accessReasonFromApiError(error);
    if (reason) {
      void router.navigate(['/acesso-negado'], {
        queryParams: { motivo: reason },
      });
    }
    return throwError(() => error);
  };

  return from(authService.getSession()).pipe(
    switchMap((session) => {
      const authorizedRequest = session?.access_token
        ? request.clone({
            setHeaders: { Authorization: `Bearer ${session.access_token}` },
          })
        : request;

      return next(authorizedRequest).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !session) {
            return forwardError(error);
          }

          return from(authService.refreshToken()).pipe(
            catchError((refreshError) => {
              void router.navigate(['/login']);
              return throwError(() => refreshError);
            }),
            switchMap((refreshed) => {
              const token = authService.getAccessToken();
              if (!refreshed || !token) {
                void router.navigate(['/login']);
                return throwError(() => error);
              }

              return next(
                request.clone({
                  setHeaders: { Authorization: `Bearer ${token}` },
                }),
              ).pipe(catchError(forwardError));
            }),
          );
        }),
      );
    }),
  );
};
