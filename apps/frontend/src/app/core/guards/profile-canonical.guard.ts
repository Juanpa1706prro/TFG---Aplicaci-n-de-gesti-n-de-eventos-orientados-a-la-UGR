import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { routeParamFromPath } from '@core/utils/route-param.utils';

/** /u/:me/profile/:me → /u/:me/profile */
export const profileCanonicalGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      const viewUserNumber = route.paramMap.get('viewUserNumber');
      if (!viewUserNumber) {
        return true;
      }

      const shellUserNumber = routeParamFromPath(route, 'userNumber');
      const logged = authService.currentUserValue;

      if (
        logged &&
        shellUserNumber != null &&
        viewUserNumber === logged.userNumber.toString() &&
        viewUserNumber === shellUserNumber
      ) {
        return router.createUrlTree(['/u', logged.userNumber, 'profile']);
      }

      return true;
    }),
  );
};
