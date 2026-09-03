import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { getAccessBlockReason } from './access-state';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = await auth.getSession();

  if (!session?.user) {
    return router.createUrlTree(['/login']);
  }

  try {
    const access = await auth.getCurrentAccess();
    const blockReason = getAccessBlockReason(access);
    if (blockReason) {
      return router.createUrlTree(['/acesso-negado'], {
        queryParams: { motivo: blockReason },
      });
    }

    const allowedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];
    if (allowedRoles.length && (!access.perfil || !allowedRoles.includes(access.perfil))) {
      return router.createUrlTree(['/acesso-negado'], {
        queryParams: { motivo: 'perfil' },
      });
    }
  } catch {
    if (!(await auth.getSession())?.user) {
      return router.createUrlTree(['/login']);
    }
    return router.createUrlTree(['/acesso-negado'], {
      queryParams: { motivo: 'indisponivel' },
    });
  }

  return true;
};
