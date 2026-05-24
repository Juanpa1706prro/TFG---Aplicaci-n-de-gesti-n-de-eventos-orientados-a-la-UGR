import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SystemRole } from '@core/constants/user-enums';
import { AuthService } from '@core/services/auth.services';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.waitForHydration().pipe(
    map(() => {
      if (auth.currentUserValue?.role === SystemRole.ADMIN) {
        return true;
      }
      const userNumber = auth.currentUserValue?.userNumber;
      if (userNumber != null) {
        return router.createUrlTree(['/u', userNumber, 'map']);
      }
      return router.createUrlTree(['/']);
    }),
  );
};
