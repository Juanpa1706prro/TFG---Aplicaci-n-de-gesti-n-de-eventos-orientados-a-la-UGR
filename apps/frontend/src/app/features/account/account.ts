import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.services';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="account-wrap">
      <h1>Mi cuenta</h1>
      <p class="muted">
        Aquí irá el cambio de contraseña y otros ajustes sensibles. Solo tú puedes abrir esta
        página con tu número de usuario.
      </p>
      <a [routerLink]="['/u', userNumber, 'map']">Volver al mapa</a>
    </div>
  `,
  styles: [
    `
      .account-wrap {
        max-width: 520px;
        margin: 2rem auto;
        padding: 1.5rem;
      }
      .muted {
        color: #64748b;
        margin-bottom: 1rem;
      }
      a {
        color: #1d4ed8;
      }
    `,
  ],
})
export class AccountComponent {
  constructor(public auth: AuthService) {}

  get userNumber(): number {
    return this.auth.currentUserValue?.userNumber ?? 0;
  }
}
