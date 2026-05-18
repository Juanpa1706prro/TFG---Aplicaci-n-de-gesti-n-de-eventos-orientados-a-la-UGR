import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth.services';

/** Mapa y resto de la app: exige haber elegido perfil de sesión si hay varias funciones. */
export const personaSelectedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForHydration().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth']);
      }
      const u = authService.currentUserValue!;
      if (u.profileComplete === true && u.needsPersonaSelection === true) {
        return router.createUrlTree(['/auth/select-profile']);
      }
      return true;
    }),
  );
};
