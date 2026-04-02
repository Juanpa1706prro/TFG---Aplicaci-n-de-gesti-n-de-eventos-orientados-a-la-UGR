import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * Map Guard.
 * Look that the user is authenticated and is only accessing their own private map.
 * @param route - Current route
 * @returns {boolean} True if the user with active session tries to access his own map. False else.
 */
export const mapGuard: CanActivateFn = (route) => {

    // ---- Injections ----
    const authService = inject(AuthService);
    const router = inject(Router);

    //Get current user session and user number from URL
    const loggedUser = authService.currentUserValue;
    const userNumberInUrl = route.paramMap.get('userNumber');

    // ---- Authentication ----
    if (!loggedUser) {
        router.navigate(['/auth']);
        return false;
    }

    // ---- Authorization ----
    if (loggedUser.userNumber.toString() !== userNumberInUrl) {
        console.error('Acceso denegado: El mapa es privado.');

        router.navigate(['/u', loggedUser.userNumber, 'map']);
        return false;
    }

    return true;

};