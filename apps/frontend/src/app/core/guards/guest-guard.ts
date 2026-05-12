import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * Solo invitados en /auth. Si hay sesión, redirige al onboarding o al mapa.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const loggedUser = authService.currentUserValue;

  if (loggedUser) {
    if (!loggedUser.profileComplete) {
      return router.navigate(['/auth/onboarding']);
    }
    return router.navigate(['/u', loggedUser.userNumber, 'map']);
  }

  return true;
};
