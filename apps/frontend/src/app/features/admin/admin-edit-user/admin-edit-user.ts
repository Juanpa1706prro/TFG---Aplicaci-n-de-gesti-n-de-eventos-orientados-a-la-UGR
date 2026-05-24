import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, tap } from 'rxjs';
import { AdminUsersService } from '@core/services/admin-users.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { UserGender, SystemRole } from '@core/constants/user-enums';
import { AdminUpdateUserPayload } from '@core/interfaces/admin-user.interface';
import { adminUserPhotoUrl } from '@core/utils/image-api.util';
import {
  IMAGE_ACCEPT,
  validateImageFile,
} from '@core/utils/image-file.util';

@Component({
  selector: 'app-admin-edit-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-edit-user.html',
  styleUrl: './admin-edit-user.css',
})
export class AdminEditUserComponent implements OnInit {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly genderOptions = Object.values(UserGender);
  readonly roleOptions = Object.values(SystemRole);
  readonly imageAccept = IMAGE_ACCEPT;

  hasExistingPhoto = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  photoFieldError: string | null = null;

  private sessionUserNumber: number | null = null;
  private viewedUserNumber: number | null = null;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(120)]],
    lastName: ['', [Validators.required, Validators.maxLength(120)]],
    gender: [null as UserGender | null],
    birthDate: [''],
    phoneNumber: [''],
    bio: ['', Validators.maxLength(500)],
    role: [SystemRole.USER as SystemRole, Validators.required],
  });

  ngOnInit(): void {
    this.shellUi.closeSidebar();
    const shellRoute = this.route.parent ?? this.route;
    const sessionParam = shellRoute.snapshot.paramMap.get('userNumber');
    const parsed = sessionParam ? parseInt(sessionParam, 10) : NaN;
    this.sessionUserNumber = Number.isNaN(parsed) ? null : parsed;

    this.route.paramMap
      .pipe(
        map((params) => params.get('viewUserNumber')),
        filter((n): n is string => !!n),
        map((n) => parseInt(n, 10)),
        filter((n) => !Number.isNaN(n)),
        tap((userNumber) => {
          this.viewedUserNumber = userNumber;
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((userNumber) => this.adminUsers.getUser(userNumber)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (u) => {
          this.hasExistingPhoto = u.hasProfilePicture;
          if (u.hasProfilePicture) {
            this.photoPreviewUrl = adminUserPhotoUrl(u.userNumber);
          }
          this.form.patchValue({
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            gender: u.gender as UserGender | null,
            birthDate: u.birthDate ?? '',
            phoneNumber: u.phoneNumber ?? '',
            bio: u.bio ?? '',
            role: u.role,
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

  get profileLink(): (string | number)[] | null {
    if (this.sessionUserNumber == null || this.viewedUserNumber == null) {
      return null;
    }
    return ['/u', this.sessionUserNumber, 'admin', 'users', this.viewedUserNumber];
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
    this.selectedPhotoFile = file;
    this.revokePhotoPreview();
    this.photoPreviewUrl = URL.createObjectURL(file);
  }

  private revokePhotoPreview(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = null;
  }

  submit(): void {
    if (this.form.invalid || this.viewedUserNumber == null) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const userNumber = this.viewedUserNumber;
    const payload: AdminUpdateUserPayload = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      role: v.role,
      ...(v.gender ? { gender: v.gender } : {}),
      ...(v.birthDate ? { birthDate: v.birthDate } : {}),
      ...(v.phoneNumber.trim() ? { phoneNumber: v.phoneNumber.trim() } : {}),
      ...(v.bio.trim() ? { bio: v.bio.trim() } : { bio: '' }),
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    const navigateBack = (): void => {
      this.submitting.set(false);
      const link = this.profileLink;
      if (link) {
        void this.router.navigate(link);
      }
    };

    this.adminUsers
      .updateUser(userNumber, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.selectedPhotoFile) {
            this.adminUsers.uploadUserPhoto(userNumber, this.selectedPhotoFile).subscribe({
              next: navigateBack,
              error: (err) => {
                this.submitting.set(false);
                this.errorMessage.set(this.readError(err, 'No se pudo subir la foto.'));
              },
            });
          } else {
            navigateBack();
          }
        },
        error: (err) => {
          this.submitting.set(false);
          const body = (err as { error?: { message?: string | string[] } })?.error
            ?.message;
          this.errorMessage.set(
            Array.isArray(body)
              ? body.join(' ')
              : typeof body === 'string' && body.trim()
                ? body
                : 'No se pudieron guardar los cambios.',
          );
        },
      });
  }

  cancel(): void {
    const link = this.profileLink;
    if (link) {
      void this.router.navigate(link);
    }
  }

  private readError(err: unknown, fallback: string): string {
    const body = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(body)) {
      return body.join(' ');
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return fallback;
  }
}
