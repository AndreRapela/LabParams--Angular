import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = await auth.getSession();

  if (!session?.user) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (allowedRoles.length) {
    const currentRole = session.user.app_metadata?.['perfil'] as string | undefined;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return router.createUrlTree(['/acesso-negado']);
    }
  }

  return true;
};
