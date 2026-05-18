import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

export const mapGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }

      const loggedUser = authService.currentUserValue!;
      const userNumberInUrl =
        route.paramMap.get('userNumber') ?? route.parent?.paramMap.get('userNumber');

      if (loggedUser.userNumber.toString() !== userNumberInUrl) {
        return router.createUrlTree(['/u', loggedUser.userNumber, 'map']);
      }

      return true;
    }),
  );
};
