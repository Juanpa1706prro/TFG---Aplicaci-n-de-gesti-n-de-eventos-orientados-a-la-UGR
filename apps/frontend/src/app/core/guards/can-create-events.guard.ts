import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { GlobalCapability } from '@core/constants/user-enums';

/**
 * Solo docencia/investigación en sesión (misma regla que el backend al crear eventos).
 */
export const canCreateEventsGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }
      const u = authService.currentUserValue!;
      if (
        !u.globalCapabilities.includes(
          GlobalCapability.CREATE_AND_MANAGE_OWN_EVENTS,
        )
      ) {
        return router.createUrlTree(['/u', u.userNumber, 'map']);
      }
      return true;
    }),
  );
};
