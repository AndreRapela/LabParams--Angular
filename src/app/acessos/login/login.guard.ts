import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';


export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = await auth.getSession();

  if (session?.user) {
    return router.createUrlTree(['/dashboard-web']);
  }

  return true;
};
