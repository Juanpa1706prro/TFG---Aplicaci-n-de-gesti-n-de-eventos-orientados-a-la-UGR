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
  // ---- Properties ----
  public loginForm!: FormGroup;

  // ---- Constructor ----
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  // ---- Lifecycle Hooks ----
  ngOnInit(): void {
    this.buildForms();
  }

  // ---- Form Initialization ----
  protected buildForms() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  // ---- Navigation and actions ----

  /**
   * Navigation to personal map page.
   * @param {UserSession}res - Session data returned from backend.
   */
  protected goToMap(res: UserSession): void {
    if (res?.userNumber) {
      this.router.navigate(['/u', res.userNumber, 'map']);
    }
  }

  /**
   * Handles the login form submission.
   * Validates the form, calls the authentication service, and handles the backend response.
   */
  public onLogin(): void {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.goToMap(res);
        },
        error: (err) => {
          console.error('Error logging in:', err);
          alert('Error: ' + (err.error?.message || 'Could not log in'));
        },
      });
    }
  }
}
