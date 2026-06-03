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
import { AdminEventsService } from '@core/services/admin-events.service';
import { ShellUiService } from '@core/services/shell-ui.service';
import { AdminUpdateEventPayload } from '@core/interfaces/admin-event.interface';
import { EventVisibility } from '@core/constants/event-enums';
import { adminEventPhotoUrl } from '@core/utils/image-api.util';
import {
  IMAGE_ACCEPT,
  validateImageFile,
} from '@core/utils/image-file.util';

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

@Component({
  selector: 'app-admin-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-edit-event.html',
  styleUrl: './admin-edit-event.css',
})
export class AdminEditEventComponent implements OnInit {
  private readonly adminEvents = inject(AdminEventsService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly EventVisibility = EventVisibility;
  readonly imageAccept = IMAGE_ACCEPT;

  hasExistingPhoto = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  photoRemoved = false;
  photoFieldError: string | null = null;

  private sessionUserNumber: number | null = null;
  private eventId: number | null = null;
  readonly showRestoreOption = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', [Validators.maxLength(8000)]],
    location: ['', [Validators.required, Validators.maxLength(500)]],
    latitude: [
      37.197,
      [Validators.required, Validators.min(-90), Validators.max(90)],
    ],
    longitude: [
      -3.61,
      [Validators.required, Validators.min(-180), Validators.max(180)],
    ],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
    visibility: [EventVisibility.PUBLIC as EventVisibility, Validators.required],
    unlimitedAttendees: [true],
    maxAttendees: [null as number | null],
    restore: [false],
  });

  ngOnInit(): void {
    this.shellUi.closeSidebar();
    const shellRoute = this.route.parent ?? this.route;
    const sessionParam = shellRoute.snapshot.paramMap.get('userNumber');
    const parsed = sessionParam ? parseInt(sessionParam, 10) : NaN;
    this.sessionUserNumber = Number.isNaN(parsed) ? null : parsed;

    this.route.paramMap
      .pipe(
        map((params) => params.get('eventId')),
        filter((id): id is string => !!id),
        map((id) => parseInt(id, 10)),
        filter((id) => !Number.isNaN(id)),
        tap((eventId) => {
          this.eventId = eventId;
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((eventId) => this.adminEvents.getEvent(eventId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (e) => {
          this.showRestoreOption.set(!!e.deletedAt);
          this.hasExistingPhoto = e.hasPhoto;
          if (e.hasPhoto && this.eventId != null) {
            this.photoPreviewUrl = adminEventPhotoUrl(this.eventId);
          }
          this.form.patchValue({
            title: e.title,
            description: e.description ?? '',
            location: e.location,
            latitude: e.latitude ?? 37.197,
            longitude: e.longitude ?? -3.61,
            startsAt: isoToDatetimeLocal(e.startsAt),
            endsAt: isoToDatetimeLocal(e.endsAt),
            visibility: e.visibility,
            unlimitedAttendees: e.maxAttendees == null,
            maxAttendees: e.maxAttendees,
            restore: false,
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

  get detailLink(): (string | number)[] | null {
    if (this.sessionUserNumber == null || this.eventId == null) {
      return null;
    }
    return ['/u', this.sessionUserNumber, 'admin', 'events', this.eventId];
  }

  cancel(): void {
    const link = this.detailLink;
    if (link) {
      void this.router.navigate(link);
    }
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

  private revokePhotoPreview(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = null;
  }

  private syncEventPhoto(eventId: number, onDone: () => void): void {
    if (this.selectedPhotoFile) {
      this.adminEvents.uploadEventPhoto(eventId, this.selectedPhotoFile).subscribe({
        next: onDone,
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.readError(err, 'No se pudo subir la foto.'));
        },
      });
      return;
    }
    if (this.photoRemoved) {
      this.adminEvents.deleteEventPhoto(eventId).subscribe({
        next: onDone,
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.readError(err, 'No se pudo eliminar la foto.'));
        },
      });
      return;
    }
    onDone();
  }

  private readError(err: unknown, fallback: string): string {
    const msg = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(msg)) {
      return msg.join(', ');
    }
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  submit(): void {
    if (this.eventId == null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    if (!v.unlimitedAttendees && (v.maxAttendees == null || v.maxAttendees < 1)) {
      this.errorMessage.set(
        'Indica un máximo de asistentes o marca «sin límite».',
      );
      return;
    }

    const startsAt = new Date(v.startsAt);
    const endsAt = new Date(v.endsAt);
    if (endsAt <= startsAt) {
      this.errorMessage.set(
        'La fecha de fin debe ser posterior al inicio del evento.',
      );
      return;
    }

    const payload: AdminUpdateEventPayload = {
      title: v.title.trim(),
      description: v.description.trim(),
      location: v.location.trim(),
      latitude: v.latitude,
      longitude: v.longitude,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxAttendees: v.unlimitedAttendees ? null : v.maxAttendees,
      ...(v.restore && this.showRestoreOption() ? { restore: true } : {}),
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    const eventId = this.eventId;
    this.adminEvents
      .updateEvent(eventId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.syncEventPhoto(eventId, () => {
            this.submitting.set(false);
            this.shellUi.requestMapRefresh();
            this.cancel();
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.readError(err, 'No se pudo guardar el evento.'));
        },
      });
  }
}
