import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { APP_LOGO_ALT, APP_LOGO_MARK_URL } from '@core/config/brand.config';
import { AuthService } from '@core/services/auth.services';
import { CompleteOnboardingPayload } from '@core/interfaces/auth-interface';
import {
  StaffFunction,
  UserGender,
  UserFaculty,
  UserCampus,
  UserDegree,
  USER_FACULTY_LABELS,
  USER_DEGREE_LABELS,
} from '@core/constants/user-enums';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class OnboardingComponent implements OnInit {
  readonly logoUrl = APP_LOGO_MARK_URL;
  readonly logoAlt = APP_LOGO_ALT;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  isCorreoStudent = false;

  /** Personal @ugr: paso 1 = funciones, paso 2 = datos. */
  ugrWizardStep: 1 | 2 = 1;

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
  readonly facultyOptions = (Object.values(UserFaculty) as UserFaculty[]).map(
    (code) => ({ code, label: USER_FACULTY_LABELS[code] }),
  );
  readonly degreeOptions = (Object.values(UserDegree) as UserDegree[]).map(
    (code) => ({ code, label: USER_DEGREE_LABELS[code] }),
  );

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
    department: [''],
  });

  ngOnInit(): void {
    const email = this.authService.currentUserValue?.email ?? '';
    this.isCorreoStudent = email.toLowerCase().endsWith('@correo.ugr.es');

    const { faculty, campus, degree, gender, birthDate, phoneNumber, department } =
      this.form.controls;

    if (this.isCorreoStudent) {
      faculty.setValidators([Validators.required]);
      campus.setValidators([Validators.required]);
      degree.setValidators([Validators.required]);
      gender.clearValidators();
      birthDate.clearValidators();
      phoneNumber.clearValidators();
      department.clearValidators();
    } else {
      faculty.clearValidators();
      campus.clearValidators();
      degree.clearValidators();
      department.clearValidators();
    }

    faculty.updateValueAndValidity({ emitEvent: false });
    campus.updateValueAndValidity({ emitEvent: false });
    degree.updateValueAndValidity({ emitEvent: false });
    gender.updateValueAndValidity({ emitEvent: false });
    birthDate.updateValueAndValidity({ emitEvent: false });
    phoneNumber.updateValueAndValidity({ emitEvent: false });
    department.updateValueAndValidity({ emitEvent: false });
  }

  toggleFn(fn: StaffFunction): void {
    const next = new Set(this.selectedFunctions);
    if (next.has(fn)) {
      next.delete(fn);
    } else {
      next.add(fn);
    }
    this.selectedFunctions = next;
    if (!this.isCorreoStudent && this.ugrWizardStep === 2) {
      this.applyUgrStep2Validators();
    }
  }

  isSelected(fn: StaffFunction): boolean {
    return this.selectedFunctions.has(fn);
  }

  includesStudent(): boolean {
    return this.selectedFunctions.has(StaffFunction.ESTUDIANTE);
  }

  includesTeachingOrResearch(): boolean {
    return (
      this.selectedFunctions.has(StaffFunction.PROFESOR) ||
      this.selectedFunctions.has(StaffFunction.PDI_INVESTIGACION)
    );
  }

  continueUgrStep1(): void {
    this.errorMessage = null;
    if (this.selectedFunctions.size === 0) {
      this.errorMessage =
        'Selecciona al menos una función (estudiante, profesor, etc.).';
      return;
    }
    this.ugrWizardStep = 2;
    this.applyUgrStep2Validators();
  }

  backUgrStep1(): void {
    this.errorMessage = null;
    this.ugrWizardStep = 1;
    const { faculty, campus, degree, department } = this.form.controls;
    faculty.clearValidators();
    campus.clearValidators();
    degree.clearValidators();
    department.clearValidators();
    faculty.updateValueAndValidity({ emitEvent: false });
    campus.updateValueAndValidity({ emitEvent: false });
    degree.updateValueAndValidity({ emitEvent: false });
    department.updateValueAndValidity({ emitEvent: false });
  }

  private applyUgrStep2Validators(): void {
    const { faculty, campus, degree, department } = this.form.controls;
    if (this.includesStudent()) {
      faculty.setValidators([Validators.required]);
      campus.setValidators([Validators.required]);
      degree.setValidators([Validators.required]);
    } else {
      faculty.clearValidators();
      campus.clearValidators();
      degree.clearValidators();
    }
    if (this.includesTeachingOrResearch()) {
      department.setValidators([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
      ]);
    } else {
      department.clearValidators();
    }
    faculty.updateValueAndValidity({ emitEvent: false });
    campus.updateValueAndValidity({ emitEvent: false });
    degree.updateValueAndValidity({ emitEvent: false });
    department.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    this.errorMessage = null;

    if (!this.isCorreoStudent && this.ugrWizardStep === 1) {
      return;
    }

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

      const payload: CompleteOnboardingPayload = {
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.includesStudent()) {
      if (!v.faculty || !v.campus || !v.degree) {
        this.errorMessage =
          'Si marcas Estudiante, elige facultad, campus y titulación.';
        return;
      }
    }

    if (this.includesTeachingOrResearch()) {
      const d = v.department?.trim() ?? '';
      if (d.length < 2) {
        this.errorMessage =
          'Indica departamento o instituto (obligatorio para profesorado o PDI/investigación).';
        return;
      }
    }

    const payload: CompleteOnboardingPayload = {
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
      ...(this.includesTeachingOrResearch() && v.department?.trim()
        ? { department: v.department.trim() }
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
        this.authService.navigateToAppHome(res.user);
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
