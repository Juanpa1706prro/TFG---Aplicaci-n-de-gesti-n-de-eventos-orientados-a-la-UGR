import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * Guest Guard.
 * Prevents authenticated users from accessing public routes like Login/Register.
 * If a session exists, redirect to the map.
 * @returns  {boolean | Promise<boolean>} True if the user is a guest.
 */
export const guestGuard: CanActivateFn = () => {

  // ---- Injections ----
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the current user session snapshot
  const loggedUser = authService.currentUserValue;
  
  // ---- Access Control ----
  if (loggedUser) {
    return router.navigate(['/u', loggedUser.userNumber, 'map']); 
  }

  return true;
};