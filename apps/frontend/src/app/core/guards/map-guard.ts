import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { routeParamFromPath } from '@core/utils/route-param.utils';

export const mapGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }

      const loggedUser = authService.currentUserValue!;
      const userNumberInUrl = routeParamFromPath(route, 'userNumber');

      if (loggedUser.userNumber.toString() !== userNumberInUrl) {
        return router.createUrlTree(['/u', loggedUser.userNumber, 'map']);
      }

      return true;
    }),
  );
};
