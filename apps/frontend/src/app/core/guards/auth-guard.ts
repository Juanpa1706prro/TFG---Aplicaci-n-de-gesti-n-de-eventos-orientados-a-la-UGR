import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * Authentication Guard.
 * Protects routes that needs an active user session.
 * @returns {boolean} True if the user is authenticated, allowing navigation. False if not.
 */
export const authGuard: CanActivateFn = () => {
  
  // ---- Injections ----
  const authService = inject(AuthService);
  const router = inject(Router);

  // ---- Access Control ----
  if (authService.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/auth']); 
    return false;
  }
};