import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

export const profileCompleteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }
      if (authService.currentUserValue?.profileComplete !== true) {
        return router.createUrlTree(['/auth/onboarding']);
      }
      return true;
    }),
  );
};
