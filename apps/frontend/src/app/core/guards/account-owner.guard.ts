import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { routeParamFromPath } from '@core/utils/route-param.utils';

export const accountOwnerGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      const logged = authService.currentUserValue;
      const userNumberInUrl = routeParamFromPath(route, 'userNumber');

      if (!logged) {
        return router.createUrlTree(['/auth']);
      }

      if (logged.userNumber.toString() !== userNumberInUrl) {
        return router.createUrlTree(['/u', logged.userNumber, 'account']);
      }

      return true;
    }),
  );
};
