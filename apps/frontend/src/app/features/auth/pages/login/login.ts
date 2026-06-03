import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';
import { UserSession } from '@core/interfaces/user-interface';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForms();
  }

  protected buildForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  protected navigateAfterAuth(res: UserSession): void {
    if (!res?.userNumber) {
      return;
    }
    if (res.profileComplete !== true) {
      void this.router.navigate(['/auth/onboarding']);
      return;
    }
    if (res.needsPersonaSelection === true) {
      void this.router.navigate(['/auth/select-profile']);
      return;
    }
    void this.router.navigate(['/u', res.userNumber, 'map']);
  }

  public onLogin(): void {
    if (!this.loginForm.valid || this.loading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.navigateAfterAuth(res);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ?? 'No se pudo iniciar sesión. Comprueba tus datos.';
      },
    });
  }
}
