import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';
import { CompleteOnboardingPayload } from '@core/interfaces/auth-interface';
import {
  StaffFunction,
  UserGender,
  UserFaculty,
  UserCampus,
  UserDegree,
} from '@core/constants/user-enums';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class OnboardingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isCorreoStudent = false;

  readonly staffOptions: { key: StaffFunction; label: string }[] = [
    { key: StaffFunction.ESTUDIANTE, label: 'Estudiante' },
    { key: StaffFunction.PROFESOR, label: 'Profesor / Profesora' },
    { key: StaffFunction.PDI_INVESTIGACION, label: 'PDI / Investigación' },
    {
      key: StaffFunction.SECRETARIA_ADMINISTRACION,
      label: 'Secretaría / Administración',
    },
    { key: StaffFunction.BIBLIOTECA, label: 'Biblioteca' },
    { key: StaffFunction.RECTORADO, label: 'Rectorado / Dirección' },
    { key: StaffFunction.SEGURIDAD, label: 'Seguridad / Servicios' },
    { key: StaffFunction.OTRO_PERSONAL, label: 'Otro personal UGR' },
  ];

  readonly genderOptions = Object.values(UserGender);
  readonly campusEntries = Object.entries(UserCampus) as [
    keyof typeof UserCampus,
    UserCampus,
  ][];
  readonly facultyEntries = Object.entries(UserFaculty) as [
    keyof typeof UserFaculty,
    UserFaculty,
  ][];
  readonly degreeEntries = Object.entries(UserDegree) as [
    keyof typeof UserDegree,
    UserDegree,
  ][];

  readonly StaffFunction = StaffFunction;

  selectedFunctions = new Set<StaffFunction>();

  submitting = false;
  errorMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    gender: [null as UserGender | null],
    birthDate: [''],
    phoneNumber: [''],
    faculty: [null as UserFaculty | null],
    campus: [null as UserCampus | null],
    degree: [null as UserDegree | null],
  });

  ngOnInit(): void {
    const email = this.authService.currentUserValue?.email ?? '';
    this.isCorreoStudent = email.toLowerCase().endsWith('@correo.ugr.es');

    const { faculty, campus, degree, gender, birthDate, phoneNumber } =
      this.form.controls;

    if (this.isCorreoStudent) {
      faculty.setValidators([Validators.required]);
      campus.setValidators([Validators.required]);
      degree.setValidators([Validators.required]);
      gender.clearValidators();
      birthDate.clearValidators();
      phoneNumber.clearValidators();
    } else {
      faculty.clearValidators();
      campus.clearValidators();
      degree.clearValidators();
    }

    faculty.updateValueAndValidity({ emitEvent: false });
    campus.updateValueAndValidity({ emitEvent: false });
    degree.updateValueAndValidity({ emitEvent: false });
    gender.updateValueAndValidity({ emitEvent: false });
    birthDate.updateValueAndValidity({ emitEvent: false });
    phoneNumber.updateValueAndValidity({ emitEvent: false });
  }

  toggleFn(fn: StaffFunction): void {
    if (this.selectedFunctions.has(fn)) {
      this.selectedFunctions.delete(fn);
    } else {
      this.selectedFunctions.add(fn);
    }
  }

  isSelected(fn: StaffFunction): boolean {
    return this.selectedFunctions.has(fn);
  }

  includesStudent(): boolean {
    return this.selectedFunctions.has(StaffFunction.ESTUDIANTE);
  }

  submit(): void {
    this.errorMessage = null;

    if (this.form.controls.firstName.invalid || this.form.controls.lastName.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (this.isCorreoStudent) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      if (!v.faculty || !v.campus || !v.degree) {
        this.errorMessage = 'Indica facultad, campus y titulación.';
        return;
      }

      const payload = {
        firstName: v.firstName,
        lastName: v.lastName,
        faculty: v.faculty as UserFaculty,
        campus: v.campus as UserCampus,
        degree: v.degree as UserDegree,
        ...(v.gender ? { gender: v.gender as UserGender } : {}),
        ...(v.birthDate ? { birthDate: v.birthDate } : {}),
        ...(v.phoneNumber?.trim()
          ? { phoneNumber: v.phoneNumber.trim() }
          : {}),
      };

      this.sendOnboarding(payload);
      return;
    }

    if (this.selectedFunctions.size === 0) {
      this.errorMessage =
        'Selecciona al menos una función (estudiante, profesor, etc.).';
      return;
    }

    if (this.includesStudent()) {
      if (!v.faculty || !v.campus || !v.degree) {
        this.errorMessage =
          'Si marcas Estudiante, elige facultad, campus y titulación.';
        return;
      }
    }

    const payload = {
      firstName: v.firstName,
      lastName: v.lastName,
      staffFunctions: [...this.selectedFunctions],
      ...(this.includesStudent()
        ? {
            faculty: v.faculty as UserFaculty,
            campus: v.campus as UserCampus,
            degree: v.degree as UserDegree,
          }
        : {}),
      ...(v.gender ? { gender: v.gender as UserGender } : {}),
      ...(v.birthDate ? { birthDate: v.birthDate } : {}),
      ...(v.phoneNumber?.trim()
        ? { phoneNumber: v.phoneNumber.trim() }
        : {}),
    };

    this.sendOnboarding(payload);
  }

  private sendOnboarding(payload: CompleteOnboardingPayload): void {
    this.submitting = true;
    this.authService.completeOnboarding(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        void this.router.navigate(['/u', res.user.userNumber, 'map']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'No se pudo guardar. Revisa los datos o inténtalo más tarde.';
      },
    });
  }
}
