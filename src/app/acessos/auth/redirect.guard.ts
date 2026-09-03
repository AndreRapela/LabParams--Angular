import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { getAccessBlockReason } from './access-state';

export const redirectGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = await auth.getSession();

  if (session?.user) {
    try {
      const reason = getAccessBlockReason(await auth.getCurrentAccess());
      return reason
        ? router.createUrlTree(['/acesso-negado'], {
            queryParams: { motivo: reason },
          })
        : router.createUrlTree(['/dashboard-web']);
    } catch {
      if (!(await auth.getSession())?.user) {
        return router.createUrlTree(['/login']);
      }
      return router.createUrlTree(['/acesso-negado'], {
        queryParams: { motivo: 'indisponivel' },
      });
    }
  }

  return router.createUrlTree(['/login']);
};
