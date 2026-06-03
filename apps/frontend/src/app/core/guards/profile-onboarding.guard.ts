import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

export const profileOnboardingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }
      const u = authService.currentUserValue;
      if (u?.profileComplete === true) {
        if (u.needsPersonaSelection === true) {
          return router.createUrlTree(['/auth/select-profile']);
        }
        return router.createUrlTree(['/u', u.userNumber, 'map']);
      }
      return true;
    }),
  );
};
