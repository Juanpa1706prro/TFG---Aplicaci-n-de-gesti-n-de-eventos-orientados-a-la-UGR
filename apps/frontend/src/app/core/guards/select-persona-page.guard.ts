import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

/** Solo accesible si falta elegir perfil; si no aplica, al mapa. */
export const selectPersonaPageGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }
      const u = authService.currentUserValue!;
      if (u.profileComplete !== true) {
        return router.createUrlTree(['/auth/onboarding']);
      }
      if (u.needsPersonaSelection !== true) {
        return router.createUrlTree(['/u', String(u.userNumber), 'map']);
      }
      return true;
    }),
  );
};
