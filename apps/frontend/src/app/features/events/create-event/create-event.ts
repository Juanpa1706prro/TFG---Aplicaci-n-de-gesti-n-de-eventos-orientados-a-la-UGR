import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import maplibregl from 'maplibre-gl';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EventsService } from '@core/services/events.service';
import {
  EventManagerAssignmentRole,
  EventVisibility,
} from '@core/constants/event-enums';
import {
  CreateEventPayload,
  UpdateEventPayload,
} from '@core/interfaces/event-interface';
import {
  UserFaculty,
  USER_FACULTY_LABELS,
  FACULTY_COORDINATES,
} from '@core/constants/user-enums';
import { requiredRouteParamFromPath } from '@core/utils/route-param.utils';
import { eventPhotoUrl } from '@core/utils/image-api.util';
import {
  IMAGE_ACCEPT,
  validateImageFile,
} from '@core/utils/image-file.util';

function defaultDatetimeLocalNextHour(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultDatetimeLocalEventEnd(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(30);
  d.setHours(d.getHours() + 2);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const USER_FACULTY_CODE_LIST = Object.values(UserFaculty) as UserFaculty[];

type ManagerRow = {
  userNumber: string;
  role: EventManagerAssignmentRole;
};

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.css',
})
export class CreateEventComponent implements OnInit, OnDestroy {
  @ViewChild('pickerMapHost') pickerMapHost?: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Mapa a pantalla completa para colocar el marcador con el ratón. */
  private pickerMap: maplibregl.Map | null = null;
  private pickerMarker: maplibregl.Marker | null = null;
  locationPickerOpen = false;

  readonly EventManagerAssignmentRole = EventManagerAssignmentRole;
  readonly EventVisibility = EventVisibility;
  readonly USER_FACULTY_LABELS = USER_FACULTY_LABELS;
  readonly facultyPresetList = USER_FACULTY_CODE_LIST;
  readonly imageAccept = IMAGE_ACCEPT;
  readonly roleLabels: Record<EventManagerAssignmentRole, string> = {
    [EventManagerAssignmentRole.EDITOR]: 'Editor',
    [EventManagerAssignmentRole.MODERATOR]: 'Moderador',
  };

  submitting = false;
  pageLoading = false;
  loadError = false;
  errorMessage: string | null = null;
  managerRows: ManagerRow[] = [];
  private editEventId: number | null = null;
  hasExistingPhoto = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  photoRemoved = false;
  photoFieldError: string | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', [Validators.required, Validators.maxLength(8000)]],
    facultyPreset: [''],
    startsAt: [defaultDatetimeLocalNextHour(), Validators.required],
    endsAt: [defaultDatetimeLocalEventEnd(), Validators.required],
    location: ['', [Validators.required, Validators.maxLength(500)]],
    latitude: [
      37.197,
      [Validators.required, Validators.min(-90), Validators.max(90)],
    ],
    longitude: [
      -3.6245,
      [Validators.required, Validators.min(-180), Validators.max(180)],
    ],
    visibility: [EventVisibility.PUBLIC],
    unlimitedAttendees: [true],
    maxAttendees: [
      { value: 50, disabled: true },
      [Validators.min(1), Validators.max(1_000_000)],
    ],
  });

  constructor() {
    this.form.controls.unlimitedAttendees.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((unlimited) => {
      const ctrl = this.form.controls.maxAttendees;
      if (unlimited) {
        ctrl.disable();
      } else {
        ctrl.enable();
      }
    });

    this.form.controls.facultyPreset.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((preset) => {
        if (!preset || !USER_FACULTY_CODE_LIST.includes(preset as UserFaculty)) {
          return;
        }
        const code = preset as UserFaculty;
        const coords = FACULTY_COORDINATES[code];
        const label = USER_FACULTY_LABELS[code];
        this.form.patchValue(
          {
            location: label,
            latitude: coords.lat,
            longitude: coords.lng,
          },
          { emitEvent: false },
        );
        this.syncPickerMarkerToFormCoords();
      });
  }

  get isEditMode(): boolean {
    return this.editEventId != null;
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('eventId');
    if (!raw) {
      return;
    }
    const eventId = Number.parseInt(raw, 10);
    if (!Number.isFinite(eventId)) {
      this.loadError = true;
      return;
    }
    this.editEventId = eventId;
    this.pageLoading = true;
    this.eventsService.getEventDetail(eventId).subscribe({
      next: (detail) => {
        if (!detail.viewerIsCreator) {
          this.loadError = true;
          this.pageLoading = false;
          return;
        }
        this.hasExistingPhoto = detail.hasPhoto;
        if (detail.hasPhoto) {
          this.photoPreviewUrl = eventPhotoUrl(detail.id);
        }
        this.form.patchValue({
          title: detail.title,
          description: detail.description ?? '',
          location: detail.location,
          latitude: detail.latitude,
          longitude: detail.longitude,
          startsAt: isoToDatetimeLocal(detail.startsAt),
          endsAt: isoToDatetimeLocal(detail.endsAt),
          visibility: detail.visibility,
          unlimitedAttendees: detail.maxAttendees == null,
          maxAttendees: detail.maxAttendees ?? 50,
        });
        this.pageLoading = false;
      },
      error: () => {
        this.loadError = true;
        this.pageLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.revokePhotoPreview();
    this.destroyPickerMap();
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
    if (
      this.photoPreviewUrl?.startsWith('blob:')
    ) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = null;
  }

  private afterSaveNavigate(): void {
    const n = this.currentUserNumber();
    if (this.editEventId != null) {
      void this.router.navigate(['/u', n, 'map'], {
        queryParams: { event: this.editEventId },
      });
      return;
    }
    void this.router.navigate(['/u', n, 'map']);
  }

  private syncEventPhoto(eventId: number, onDone: () => void): void {
    if (this.selectedPhotoFile) {
      this.eventsService
        .uploadEventPhoto(eventId, this.selectedPhotoFile)
        .subscribe({
          next: onDone,
          error: (err) => {
            this.submitting = false;
            this.errorMessage = this.readHttpError(err, 'No se pudo subir la foto del evento.');
          },
        });
      return;
    }
    if (this.photoRemoved) {
      this.eventsService.deleteEventPhoto(eventId).subscribe({
        next: onDone,
        error: (err) => {
          this.submitting = false;
          this.errorMessage = this.readHttpError(err, 'No se pudo eliminar la foto del evento.');
        },
      });
      return;
    }
    onDone();
  }

  private readHttpError(err: unknown, fallback: string): string {
    const msg = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(msg)) {
      return msg.join(', ');
    }
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  openLocationPicker(): void {
    if (this.locationPickerOpen) {
      return;
    }
    this.locationPickerOpen = true;
    setTimeout(() => this.mountPickerMap(), 0);
  }

  closeLocationPicker(): void {
    this.destroyPickerMap();
    this.locationPickerOpen = false;
  }

  private destroyPickerMap(): void {
    if (this.pickerMarker) {
      this.pickerMarker.remove();
      this.pickerMarker = null;
    }
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
    }
  }

  private mountPickerMap(): void {
    const el = this.pickerMapHost?.nativeElement;
    if (!el) {
      return;
    }
    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    const center: [number, number] = [
      Number.isFinite(lng) ? lng : -3.6245,
      Number.isFinite(lat) ? lat : 37.197,
    ];

    const map = new maplibregl.Map({
      container: el,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom: 16,
      pitch: 45,
      bearing: -15,
    });

    map.on('styleimagemissing', (e) => {
      const emptyImage = new Uint8Array(4);
      map.addImage(e.id, { width: 1, height: 1, data: emptyImage });
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', () => {
      map.resize();
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        this.placeOrMovePickerMarker(map, lng, lat);
      }
      map.on('click', (e) => {
        const { lng: clickLng, lat: clickLat } = e.lngLat;
        this.placeOrMovePickerMarker(map, clickLng, clickLat);
        this.form.patchValue(
          {
            longitude: clickLng,
            latitude: clickLat,
            facultyPreset: '',
          },
          { emitEvent: false },
        );
      });
    });

    this.pickerMap = map;
  }

  /** Si el selector de mapa está abierto, alinea el marcador y la vista con el formulario. */
  private syncPickerMarkerToFormCoords(): void {
    if (!this.pickerMap) {
      return;
    }
    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    this.placeOrMovePickerMarker(this.pickerMap, lng, lat);
    this.pickerMap.flyTo({
      center: [lng, lat],
      zoom: Math.max(this.pickerMap.getZoom(), 15),
      essential: true,
    });
  }

  private placeOrMovePickerMarker(
    map: maplibregl.Map,
    lng: number,
    lat: number,
  ): void {
    if (!this.pickerMarker) {
      const marker = new maplibregl.Marker({
        color: '#2563EB',
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        this.form.patchValue(
          {
            longitude: pos.lng,
            latitude: pos.lat,
            facultyPreset: '',
          },
          { emitEvent: false },
        );
      });

      this.pickerMarker = marker;
    } else {
      this.pickerMarker.setLngLat([lng, lat]);
    }
  }

  addManagerRow(): void {
    this.managerRows.push({
      userNumber: '',
      role: EventManagerAssignmentRole.EDITOR,
    });
  }

  removeManagerRow(index: number): void {
    this.managerRows.splice(index, 1);
  }

  private currentUserNumber(): string {
    return requiredRouteParamFromPath(this.route.snapshot, 'userNumber');
  }

  cancel(): void {
    const n = this.currentUserNumber();
    if (this.editEventId != null) {
      void this.router.navigate(['/u', n, 'map'], {
        queryParams: { event: this.editEventId },
      });
      return;
    }
    void this.router.navigate(['/u', n, 'map']);
  }

  submit(): void {
    this.errorMessage = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (!v.unlimitedAttendees && (v.maxAttendees == null || v.maxAttendees < 1)) {
      this.errorMessage = 'Indica un número máximo de asistentes o marca «sin límite».';
      return;
    }
    const startsAt = new Date(v.startsAt);
    const endsAt = new Date(v.endsAt);
    if (endsAt <= startsAt) {
      this.errorMessage = 'La fecha de fin debe ser posterior al inicio del evento.';
      return;
    }

    const managers: CreateEventPayload['managers'] = [];
    for (const row of this.managerRows) {
      const trimmed = row.userNumber.trim();
      if (!trimmed) {
        continue;
      }
      const num = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(num) || num < 100_000 || num > 999_999) {
        this.errorMessage = `Número de usuario no válido: ${trimmed} (debe ser 6 dígitos).`;
        return;
      }
      managers.push({ userNumber: num, role: row.role });
    }

    this.submitting = true;

    if (this.editEventId != null) {
      const eventId = this.editEventId;
      const updatePayload: UpdateEventPayload = {
        title: v.title.trim(),
        description: v.description.trim(),
        location: v.location.trim(),
        latitude: v.latitude,
        longitude: v.longitude,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        visibility: v.visibility,
        maxAttendees: v.unlimitedAttendees ? null : (v.maxAttendees as number),
      };
      this.eventsService.updateEvent(eventId, updatePayload).subscribe({
        next: () => {
          this.syncEventPhoto(eventId, () => {
            this.submitting = false;
            this.afterSaveNavigate();
          });
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = this.readHttpError(err, 'No se pudo actualizar el evento.');
        },
      });
      return;
    }

    const payload: CreateEventPayload = {
      title: v.title.trim(),
      description: v.description.trim(),
      location: v.location.trim(),
      latitude: v.latitude,
      longitude: v.longitude,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      ...(v.visibility === EventVisibility.PRIVATE
        ? { visibility: EventVisibility.PRIVATE }
        : {}),
      ...(v.unlimitedAttendees
        ? {}
        : { maxAttendees: v.maxAttendees as number }),
      ...(managers.length ? { managers } : {}),
    };

    this.eventsService.create(payload).subscribe({
      next: (res) => {
        const eventId = res.event.id;
        if (this.selectedPhotoFile) {
          this.syncEventPhoto(eventId, () => {
            this.submitting = false;
            this.afterSaveNavigate();
          });
        } else {
          this.submitting = false;
          this.afterSaveNavigate();
        }
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = this.readHttpError(err, 'No se pudo crear el evento.');
      },
    });
  }
}
