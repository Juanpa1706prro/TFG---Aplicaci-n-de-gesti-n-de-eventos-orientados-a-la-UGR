import { Component, OnInit, output } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '@core/services/auth.services';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit {
  readonly registered = output<string>();

  registerForm!: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.buildForms();
  }

  protected buildForms(): void {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email, this.ugrEmail]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            this.hasUppercase,
            this.hasNumber,
            this.hasSpecialCharacter,
          ],
        ],
        confirmPassword: ['', Validators.required],
        operatorKey: [''],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  onRegister(): void {
    if (!this.registerForm.valid || this.loading) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, operatorKey } = this.registerForm.value;
    const payload: { email: string; password: string; operatorKey?: string } = {
      email,
      password,
    };
    const key = (operatorKey as string)?.trim();
    if (key) {
      payload.operatorKey = key;
    }

    this.loading = true;
    this.errorMessage = null;

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.registerForm.reset();
        this.registered.emit('Cuenta creada. Ya puedes iniciar sesión.');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ?? 'No se pudo crear la cuenta. Inténtalo de nuevo.';
      },
    });
  }

  protected ugrEmail(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value as string)?.trim().toLowerCase();
    if (!raw) {
      return null;
    }
    if (raw.endsWith('@correo.ugr.es') || raw.endsWith('@ugr.es')) {
      return null;
    }
    return { ugrEmail: true };
  }

  protected hasUppercase(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/[A-Z]/.test(value)) {
      return { uppercase: true };
    }
    return null;
  }

  protected hasNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/\d/.test(value)) {
      return { number: true };
    }
    return null;
  }

  protected hasSpecialCharacter(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return { specialCharacter: true };
    }
    return null;
  }

  protected passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
