import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';
import { StaffFunction } from '@core/constants/user-enums';

@Component({
  selector: 'app-select-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-profile.html',
  styleUrl: './select-profile.css',
})
export class SelectProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly options: { fn: StaffFunction; label: string }[] = [
    { fn: StaffFunction.ESTUDIANTE, label: 'Estudiante' },
    { fn: StaffFunction.PROFESOR, label: 'Profesor / Profesora' },
    { fn: StaffFunction.PDI_INVESTIGACION, label: 'PDI / Investigación' },
    {
      fn: StaffFunction.SECRETARIA_ADMINISTRACION,
      label: 'Secretaría / Administración',
    },
    { fn: StaffFunction.BIBLIOTECA, label: 'Biblioteca' },
    { fn: StaffFunction.RECTORADO, label: 'Rectorado / Dirección' },
    { fn: StaffFunction.SEGURIDAD, label: 'Seguridad / Servicios' },
    { fn: StaffFunction.OTRO_PERSONAL, label: 'Otro personal UGR' },
  ];

  submitting = false;
  errorMessage: string | null = null;

  availableOptions(): { fn: StaffFunction; label: string }[] {
    const fns = this.auth.currentUserValue?.staffFunctions ?? [];
    const set = new Set(fns);
    return this.options.filter((o) => set.has(o.fn));
  }

  choose(fn: StaffFunction): void {
    this.errorMessage = null;
    this.submitting = true;
    this.auth.setSessionPersona({ staffFunction: fn }).subscribe({
      next: (res) => {
        this.submitting = false;
        void this.router.navigate(['/u', res.user.userNumber, 'map']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'No se pudo guardar la selección.';
      },
    });
  }
}
