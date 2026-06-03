import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

/**
 * Ruta raíz: tras hidratar sesión, auth → onboarding (si falta) → mapa.
 */
@Component({
  selector: 'app-entry-shell',
  standalone: true,
  template: '',
})
export class EntryShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.auth.waitForHydration().subscribe(() => {
      const u = this.auth.currentUserValue;
      if (!u) {
        void this.router.navigate(['/auth'], { replaceUrl: true });
        return;
      }
      if (u.profileComplete !== true) {
        void this.router.navigate(['/auth/onboarding'], { replaceUrl: true });
        return;
      }
      if (u.needsPersonaSelection === true) {
        void this.router.navigate(['/auth/select-profile'], { replaceUrl: true });
        return;
      }
      void this.router.navigate(['/u', u.userNumber, 'map'], { replaceUrl: true });
    });
  }
}
