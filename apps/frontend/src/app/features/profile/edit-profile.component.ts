import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserGender } from '@core/constants/user-enums';
import {
  FullUserPayload,
  UpdateProfilePayload,
} from '@core/interfaces/user.profile-interface';
import { API_BASE_URL } from '@core/config/api.config';
import { ColumnOverlayComponent } from '../../layout/column-overlay.component';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ColumnOverlayComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css', './profile.css'],
})
export class EditProfileComponent implements OnInit {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private userNumber: number | null = null;

  readonly genderOptions = Object.values(UserGender);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(120)]],
    lastName: ['', [Validators.required, Validators.maxLength(120)]],
    gender: [null as UserGender | null],
    birthDate: [''],
    phoneNumber: [''],
    bio: ['', Validators.maxLength(500)],
    profilePicture: ['', Validators.maxLength(2048)],
  });

  ngOnInit(): void {
    const shellRoute = this.route.parent ?? this.route;
    const param = shellRoute.snapshot.paramMap.get('userNumber');
    const parsed = param ? parseInt(param, 10) : NaN;
    if (Number.isNaN(parsed)) {
      this.loading.set(false);
      this.loadError.set(true);
      return;
    }
    this.userNumber = parsed;

    this.http
      .get<{ user: FullUserPayload }>(`${this.API_URL}/user/profile`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const profile = res.user.profile;
          this.form.patchValue({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
            gender: profile.gender,
            birthDate: this.toDateInputValue(profile.birthDate),
            phoneNumber: profile.phoneNumber ?? '',
            bio: profile.bio ?? '',
            profilePicture: profile.profilePicture ?? '',
          });
          this.loading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: UpdateProfilePayload = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      ...(v.gender ? { gender: v.gender } : {}),
      ...(v.birthDate ? { birthDate: v.birthDate } : {}),
      ...(v.phoneNumber.trim() ? { phoneNumber: v.phoneNumber.trim() } : {}),
      ...(v.bio.trim() ? { bio: v.bio.trim() } : { bio: '' }),
      ...(v.profilePicture.trim()
        ? { profilePicture: v.profilePicture.trim() }
        : { profilePicture: '' }),
    };

    this.submitting.set(true);
    this.http
      .patch<{ message: string }>(`${this.API_URL}/user/profile`, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate(['/u', this.userNumber, 'profile']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.readErrorMessage(err));
        },
      });
  }

  cancel(): void {
    if (this.userNumber != null) {
      void this.router.navigate(['/u', this.userNumber, 'profile']);
      return;
    }
    void this.router.navigate(['/']);
  }

  closeToMap(): void {
    if (this.userNumber != null) {
      void this.router.navigate(['/u', this.userNumber, 'map']);
    }
  }

  private toDateInputValue(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  }

  private readErrorMessage(err: unknown): string {
    const body = (err as { error?: { message?: string | string[] } })?.error
      ?.message;
    if (Array.isArray(body)) {
      return body.join(' ');
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return 'No se pudieron guardar los cambios.';
  }
}
