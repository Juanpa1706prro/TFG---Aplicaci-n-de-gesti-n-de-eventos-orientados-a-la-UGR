import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnDestroy,
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
import { CreateEventPayload } from '@core/interfaces/event-interface';
import {
  UserFaculty,
  USER_FACULTY_LABELS,
  FACULTY_COORDINATES,
} from '@core/constants/user-enums';

function defaultDatetimeLocalNextHour(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(d.getHours() + 1);
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
export class CreateEventComponent implements OnDestroy {
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
  readonly roleLabels: Record<EventManagerAssignmentRole, string> = {
    [EventManagerAssignmentRole.EDITOR]: 'Editor',
    [EventManagerAssignmentRole.MODERATOR]: 'Moderador',
  };

  submitting = false;
  errorMessage: string | null = null;
  managerRows: ManagerRow[] = [];

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', [Validators.required, Validators.maxLength(8000)]],
    photoUrl: ['', Validators.maxLength(2000)],
    facultyPreset: [''],
    startsAt: [defaultDatetimeLocalNextHour(), Validators.required],
    durationMinutes: [
      90,
      [Validators.required, Validators.min(1), Validators.max(525600)],
    ],
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

  ngOnDestroy(): void {
    this.destroyPickerMap();
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

  cancel(): void {
    const n = this.route.snapshot.paramMap.get('userNumber');
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

    const payload: CreateEventPayload = {
      title: v.title.trim(),
      description: v.description.trim(),
      location: v.location.trim(),
      latitude: v.latitude,
      longitude: v.longitude,
      startsAt: new Date(v.startsAt).toISOString(),
      durationMinutes: v.durationMinutes,
      ...(v.visibility === EventVisibility.PRIVATE
        ? { visibility: EventVisibility.PRIVATE }
        : {}),
      ...(v.photoUrl.trim() ? { photoUrl: v.photoUrl.trim() } : {}),
      ...(v.unlimitedAttendees
        ? {}
        : { maxAttendees: v.maxAttendees as number }),
      ...(managers.length ? { managers } : {}),
    };

    this.submitting = true;
    this.eventsService.create(payload).subscribe({
      next: () => {
        this.submitting = false;
        const n = this.route.snapshot.paramMap.get('userNumber');
        void this.router.navigate(['/u', n, 'map']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg)
          ? msg.join(', ')
          : (msg ?? 'No se pudo crear el evento.');
      },
    });
  }
}
