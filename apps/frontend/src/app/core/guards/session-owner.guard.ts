import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { routeParamFromPath } from '@core/utils/route-param.utils';

/**
 * El segmento /u/:userNumber debe ser siempre el usuario de la sesión.
 * Compatibilidad: /u/:otro/profile → /u/:yo/profile/:otro
 */
export const sessionOwnerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }

      const logged = authService.currentUserValue!;
      const shellUserNumber = routeParamFromPath(route, 'userNumber');

      if (shellUserNumber != null && logged.userNumber.toString() === shellUserNumber) {
        return true;
      }

      const legacyProfile = state.url.match(/^\/u\/(\d+)\/profile\/?$/);
      if (legacyProfile) {
        const viewedUserNumber = legacyProfile[1];
        return router.createUrlTree([
          '/u',
          logged.userNumber,
          'profile',
          viewedUserNumber,
        ]);
      }

      return router.createUrlTree(['/u', logged.userNumber, 'map']);
    }),
  );
};
