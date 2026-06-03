import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserGender } from '@core/constants/user-enums';
import { UpdateProfilePayload } from '@core/interfaces/user.profile-interface';
import { UserProfileApiService } from '@core/services/user-profile-api.service';
import { sessionProfilePhotoUrl } from '@core/utils/image-api.util';
import {
  IMAGE_ACCEPT,
  validateImageFile,
} from '@core/utils/image-file.util';
import { ColumnOverlayComponent } from '../../layout/column-overlay.component';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ColumnOverlayComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css', './profile.css'],
})
export class EditProfileComponent implements OnInit {
  private readonly profileApi = inject(UserProfileApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly imageAccept = IMAGE_ACCEPT;

  hasExistingPhoto = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  photoRemoved = false;
  photoFieldError: string | null = null;

  private userNumber: number | null = null;

  readonly genderOptions = Object.values(UserGender);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(120)]],
    lastName: ['', [Validators.required, Validators.maxLength(120)]],
    gender: [null as UserGender | null],
    birthDate: [''],
    phoneNumber: [''],
    bio: ['', Validators.maxLength(500)],
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

    this.profileApi
      .getFullProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const profile = res.user.profile;
          this.hasExistingPhoto = profile.hasProfilePicture;
          if (profile.hasProfilePicture) {
            this.photoPreviewUrl = sessionProfilePhotoUrl();
          }
          this.form.patchValue({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
            gender: profile.gender,
            birthDate: this.toDateInputValue(profile.birthDate),
            phoneNumber: profile.phoneNumber ?? '',
            bio: profile.bio ?? '',
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

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const err = validateImageFile(file);
    if (err) {
      this.photoFieldError = err;
      return;
    }
    this.photoFieldError = null;
    this.photoRemoved = false;
    this.selectedPhotoFile = file;
    this.revokePhotoPreview();
    this.photoPreviewUrl = URL.createObjectURL(file);
  }

  clearPhoto(): void {
    this.photoFieldError = null;
    this.selectedPhotoFile = null;
    this.revokePhotoPreview();
    if (this.hasExistingPhoto) {
      this.photoRemoved = true;
      this.photoPreviewUrl = null;
    }
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
    };

    this.submitting.set(true);
    this.profileApi
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.syncProfilePhoto(() => {
            this.submitting.set(false);
            void this.router.navigate(['/u', this.userNumber, 'profile']);
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.readErrorMessage(err));
        },
      });
  }

  private syncProfilePhoto(onDone: () => void): void {
    if (this.selectedPhotoFile) {
      this.profileApi.uploadProfilePhoto(this.selectedPhotoFile).subscribe({
        next: onDone,
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            this.readErrorMessage(err, 'No se pudo subir la foto de perfil.'),
          );
        },
      });
      return;
    }
    if (this.photoRemoved) {
      this.profileApi.deleteProfilePhoto().subscribe({
        next: onDone,
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            this.readErrorMessage(err, 'No se pudo eliminar la foto de perfil.'),
          );
        },
      });
      return;
    }
    onDone();
  }

  private revokePhotoPreview(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = null;
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

  private readErrorMessage(err: unknown, fallback = 'No se pudieron guardar los cambios.'): string {
    const body = (err as { error?: { message?: string | string[] } })?.error
      ?.message;
    if (Array.isArray(body)) {
      return body.join(' ');
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return fallback;
  }
}
