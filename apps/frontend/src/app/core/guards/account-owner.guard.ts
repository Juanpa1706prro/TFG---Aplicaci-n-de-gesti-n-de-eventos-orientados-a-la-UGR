import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/** Solo el propietario de la cuenta (mismo número de usuario que la sesión). */
export const accountOwnerGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const logged = authService.currentUserValue;
  const userNumberInUrl = route.paramMap.get('userNumber');

  if (!logged) {
    void router.navigate(['/auth']);
    return false;
  }

  if (logged.userNumber.toString() !== userNumberInUrl) {
    void router.navigate(['/u', logged.userNumber, 'account']);
    return false;
  }

  return true;
};
