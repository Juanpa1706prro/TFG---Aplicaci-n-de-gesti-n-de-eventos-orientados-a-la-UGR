import { Component, AfterViewInit, OnInit} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.services';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './auth.html',
    styleUrl: './auth.css',
})
export class AuthComponent implements AfterViewInit, OnInit {

    loginForm!: FormGroup;
    registerForm!: FormGroup;
    isLoginMode = true;
    registerSubmitted = false;

    constructor(
        private router: Router,
        private fb: FormBuilder,
        private authService: AuthService) {}

    ngOnInit(): void {
        this.loginForm = this.fb.group(
            {
                email: ['', [Validators.required, Validators.email]],
                password: [
                    '',
                    [   Validators.required
                    ]
                ]
            },
        );

        this.registerForm = this.fb.group(
            {
                email: ['', [Validators.required, Validators.email]],
                password: [
                    '',
                    [   Validators.required,
                        Validators.minLength(6),
                        this.hasUppercase,
                        this.hasNumber,
                        this.hasSpecialCharacter
                    ]
                ],
                confirmPassword: ['', Validators.required],
            },
            { validatos: this.passwordMatchValidator }
        );
    }

    ngAfterViewInit(): void {
        // Aquí podrías inicializar librerías de terceros si fuera necesario
        console.log('Componente Auth listo y renderizado');
    }

    goToMap(){
        this.router.navigate(['/map']);
    }

    toggleMode(mode: boolean): void {
        this.isLoginMode = mode;
        this.registerSubmitted = false;
    }

    onLogin(): void {
        if (this.loginForm.valid) {
          console.log('Datos de Login:', this.loginForm.value);
          this.goToMap(); // Si todo va bien, al mapa
        }
    }

    onRegister(): void {
        this.registerSubmitted = true; // El usuario ya intentó enviar

        if (this.registerForm.valid) {
            console.log('Enviando datos al servicio...');
            
            // Llamamos al servicio y NOS SUSCRIBIMOS para que se ejecute
            this.authService.register(this.registerForm.value).subscribe({
              next: (res) => {
                console.log('¡Respuesta del servidor!', res);
                alert('Usuario creado con éxito');
              },
              error: (err) => {
                console.error('El servidor ha rechazado la petición:', err);
                alert('Error: ' + (err.error?.message || 'No se pudo conectar con el servidor'));
              }
            });
        }
    }

    // Password functions

    hasUppercase(control: AbstractControl) {
        const value = control.value;
        if (value && !/[A-Z]/.test(value)) {
            return { uppercase: true };
        }
        return null;
    }

    hasNumber(control: AbstractControl) {
        const value = control.value;
        if (value && !/\d/.test(value)) {
            return { number: true };
        }
        return null;
    }

    hasSpecialCharacter(control: AbstractControl) {
        const value = control.value;
        if (value && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            return { specialCharacter: true };
        }
        return null;
    }

    passwordMatchValidator(form: FormGroup) {
        const password = form.get('password')?.value;
        const confirmPassword = form.get('confirmPassword')?.value;
        if (password !== confirmPassword) {
            return { passwordMismatch: true };
        }
        return null;
    }

}