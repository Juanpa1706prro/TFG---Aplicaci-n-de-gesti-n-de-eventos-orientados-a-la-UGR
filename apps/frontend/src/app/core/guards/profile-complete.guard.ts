import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/** Solo rutas que exigen perfil completo (p. ej. el mapa). */
export const profileCompleteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    void router.navigate(['/auth']);
    return false;
  }

  if (!authService.currentUserValue?.profileComplete) {
    void router.navigate(['/auth/onboarding']);
    return false;
  }

  return true;
};
