import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para *ngFor
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// Asegúrate de importar tus Enums y Servicios aquí

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.css'],
  standalone: true, // Asumiendo que usas Standalone Components
  imports: [CommonModule, ReactiveFormsModule] // <--- AQUÍ ESTÁ LA MAGIA PARA EL ERROR 1
})
export class Onboarding implements OnInit {

  // <--- AQUÍ ESTÁ LA SOLUCIÓN AL ERROR 2
  public onboardingForm!: FormGroup;

  // Tus arrays para el HTML
  public faculties = ['ETSIIT', 'F_CIENCIAS', 'ETC']; // Pon tus enums reales aquí
  public genders = ['Masculino', 'Femenino', 'Otro'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    // Inicializamos el formulario aquí
    this.onboardingForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required]],
      gender: [null, [Validators.required]],
      faculty: [null, [Validators.required]],
      bio: ['', [Validators.maxLength(500)]]
    });
  }

  submitProfile(): void {
    if (this.onboardingForm.valid) {
      console.log('Datos listos para enviar:', this.onboardingForm.value);
      // this.userService.updateProfile(...)
    }
  }
}