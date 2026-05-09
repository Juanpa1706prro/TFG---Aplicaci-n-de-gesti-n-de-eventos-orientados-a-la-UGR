import { Component, OnInit } from '@angular/core';
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
  // ---- Properties ----
  registerForm!: FormGroup;

  // ---- Constructor ----
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {}

  // ---- Lifecycle Hooks ----
  ngOnInit(): void {
    this.buildForms();
  }

  // ---- Form Initialization ----
  protected buildForms() {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
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
      },
      { validators: this.passwordMatchValidator },
    );
  }

  // ---- Actions ----

  /**
   * Handles the registration form submission.
   * Validates the form, sends the payload to the backend, and alerts the user of the result.
   */
  onRegister(): void {
    if (this.registerForm.valid) {
      console.log('Enviando datos al servicio...');

      const { email, password } = this.registerForm.value;

      // Llamamos al servicio y NOS SUSCRIBIMOS para que se ejecute
      this.authService.register({ email, password }).subscribe({
        next: (res) => {
          console.log('¡Respuesta del servidor!', res);
          alert('Usuario creado con éxito');
        },
        error: (err) => {
          console.error('El servidor ha rechazado la petición:', err);
          alert('Error: ' + (err.error?.message || 'No se pudo conectar con el servidor'));
        },
      });
    }
  }

  // ---- Custom Validators ----

  /**
   * Validates that the control's value contains at least one uppercase letter.
   * @param {AbstractControl} control - The form control to validate.
   * @returns {ValidationErrors | null} An error object if validation fails, else null.
   */
  protected hasUppercase(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/[A-Z]/.test(value)) {
      return { uppercase: true };
    }
    return null;
  }

  /**
   * Validates that the control's value contains at least one number.
   * @param {AbstractControl} control - The form control to validate.
   * @returns {ValidationErrors | null} An error object if validation fails, else null.
   */
  protected hasNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/\d/.test(value)) {
      return { number: true };
    }
    return null;
  }

  /**
   * Validates that the control's value contains at least one special character.
   * @param {AbstractControl} control - The form control to validate.
   * @returns {ValidationErrors | null} An error object if validation fails, else null.
   */
  protected hasSpecialCharacter(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return { specialCharacter: true };
    }
    return null;
  }

  /**
   * Validates that the password and confirmPassword fields match.
   * @param {AbstractControl} control - The form group containing both password fields.
   * @returns {ValidationErrors | null} An error object if validation fails, else null.
   */
  protected passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
