import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/** Pantalla de completar datos: solo si hay sesión y faltan datos obligatorios. */
export const profileOnboardingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    void router.navigate(['/auth']);
    return false;
  }

  if (authService.currentUserValue?.profileComplete) {
    const u = authService.currentUserValue;
    void router.navigate(['/u', u.userNumber, 'map']);
    return false;
  }

  return true;
};
