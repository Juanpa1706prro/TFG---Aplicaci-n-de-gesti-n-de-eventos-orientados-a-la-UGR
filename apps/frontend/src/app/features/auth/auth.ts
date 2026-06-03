import { Component } from '@angular/core';
import { APP_LOGO_ALT, APP_LOGO_MARK_URL } from '@core/config/brand.config';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [LoginComponent, RegisterComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent {
  readonly logoUrl = APP_LOGO_MARK_URL;
  readonly logoAlt = APP_LOGO_ALT;
  isLoginMode = true;
  successMessage: string | null = null;

  protected toggleMode(mode: boolean): void {
    this.isLoginMode = mode;
    if (mode) {
      this.successMessage = null;
    }
  }

  protected onRegistered(message: string): void {
    this.isLoginMode = true;
    this.successMessage = message;
  }
}
