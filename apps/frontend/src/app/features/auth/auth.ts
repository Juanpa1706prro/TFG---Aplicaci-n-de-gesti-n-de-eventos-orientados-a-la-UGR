import { Component } from '@angular/core';
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
  // ---- Properties ----
  isLoginMode = true;

  /**
   * Toggles the authentication view between Login and Register modes.
   * @param {boolean} mode - The desired mode (true for login, false for register).
   */
  protected toggleMode(mode: boolean): void {
    this.isLoginMode = mode;
  }
}
