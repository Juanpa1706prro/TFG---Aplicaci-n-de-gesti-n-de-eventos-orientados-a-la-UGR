import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * El mapa es privado: solo el propio número de usuario.
 * (Perfil completo lo controla profileCompleteGuard en la ruta.)
 */
export const mapGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const loggedUser = authService.currentUserValue;
  const userNumberInUrl = route.paramMap.get('userNumber');

  if (!loggedUser) {
    void router.navigate(['/auth']);
    return false;
  }

  if (loggedUser.userNumber.toString() !== userNumberInUrl) {
    void router.navigate(['/u', loggedUser.userNumber, 'map']);
    return false;
  }

  return true;
};
