import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

/**
 * /auth (login/registro): si ya hay sesión, redirige al siguiente paso del flujo (onboarding → perfil → mapa).
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return true;
      }
      const user = authService.currentUserValue!;
      if (user.profileComplete !== true) {
        return router.createUrlTree(['/auth/onboarding']);
      }
      if (user.needsPersonaSelection === true) {
        return router.createUrlTree(['/auth/select-profile']);
      }
      return router.createUrlTree(['/u', user.userNumber, 'map']);
    }),
  );
};
