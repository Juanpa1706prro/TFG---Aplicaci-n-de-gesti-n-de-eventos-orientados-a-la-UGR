import {

  Component,

  AfterViewInit,
  OnDestroy,
  ElementRef,

  ViewChild,

  DestroyRef,

  ChangeDetectorRef,

  NgZone,

  inject,

  signal,

} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { interval } from 'rxjs';

import maplibregl from 'maplibre-gl';

import { EventsService } from '@core/services/events.service';

import {
  EventDetailDto,
  EventParticipantDto,
  MapMarkerDto,
} from '@core/interfaces/event-interface';
import {
  eventParticipantDisplayName,
  eventParticipantInitials,
} from '@core/utils/event-participant.utils';

import { EventVisibility } from '@core/constants/event-enums';

import { eventTimeDisplayText } from '@core/utils/event-time.utils';
import { openGoogleMapsDirectionsFromCurrentLocation } from '@core/utils/google-maps-directions.utils';



type MarkerHandle = {

  data: MapMarkerDto;

  timeEl: HTMLElement;

  mapMarker: maplibregl.Marker;

};



@Component({

  selector: 'app-map',

  standalone: true,

  imports: [CommonModule, RouterLink, RouterOutlet],

  templateUrl: './map.html',

  styleUrl: './map.css',

})

export class MapComponent implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;



  private readonly destroyRef = inject(DestroyRef);

  private readonly ngZone = inject(NgZone);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly eventsService = inject(EventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly markerHandles: MarkerHandle[] = [];
  private mapReady = false;
  private pendingEventId: number | null = null;
  private openingEventFromList = false;



  readonly selectedEvent = signal<MapMarkerDto | null>(null);
  readonly eventDetail = signal<EventDetailDto | null>(null);
  readonly eventDetailLoading = signal(false);
  readonly attendActionLoading = signal(false);
  readonly attendError = signal<string | null>(null);



  nowMs = Date.now();



  public map!: maplibregl.Map;

  private userLocationMarker: maplibregl.Marker | null = null;

  constructor() {

    interval(1000)

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe(() => {

        this.nowMs = Date.now();

        this.refreshMarkerTimeLabels();

        this.cdr.markForCheck();

      });

  }



  timeLabel(m: MapMarkerDto): string {

    return eventTimeDisplayText(m.startsAt, m.endsAt, this.nowMs);

  }



  visibilityLabel(visibility: EventVisibility): string {

    return visibility === EventVisibility.PRIVATE ? 'Privado' : 'Público';

  }



  participantName(p: EventParticipantDto): string {
    return eventParticipantDisplayName(p);
  }

  participantInitials(p: EventParticipantDto): string {
    return eventParticipantInitials(p);
  }

  profileRoute(userNumber: number): string[] {
    return ['/u', String(userNumber), 'profile'];
  }

  attendeesCountLabel(detail: EventDetailDto): string {
    if (detail.maxAttendees == null) {
      return `${detail.attendeeCount} apuntados · sin límite`;
    }
    return `${detail.attendeeCount} / ${detail.maxAttendees} apuntados`;
  }

  canToggleAttendance(detail: EventDetailDto): boolean {
    if (detail.isAttending) {
      return true;
    }
    if (detail.maxAttendees == null) {
      return true;
    }
    return detail.attendeeCount < detail.maxAttendees;
  }



  hasPhoto(source: MapMarkerDto | string | null | undefined): boolean {
    if (source == null) {
      return false;
    }
    const url = typeof source === 'string' ? source : source.photoUrl;
    return this.isSafePhotoUrl(url);
  }



  closeDetail(): void {
    this.selectedEvent.set(null);
    this.eventDetail.set(null);
    this.eventDetailLoading.set(false);
    this.attendError.set(null);
    this.updateMarkerSelection(null);
  }

  toggleAttendance(): void {
    const detail = this.eventDetail();
    if (!detail || this.attendActionLoading() || !this.canToggleAttendance(detail)) {
      return;
    }

    this.attendActionLoading.set(true);
    this.attendError.set(null);

    const request = detail.isAttending
      ? this.eventsService.unattend(detail.id)
      : this.eventsService.attend(detail.id);

    request.subscribe({
      next: (updated) => {
        this.eventDetail.set(updated);
        this.attendActionLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.attendActionLoading.set(false);
        this.attendError.set(this.readAttendError(err));
        this.cdr.markForCheck();
      },
    });
  }

  openDirections(ev: MapMarkerDto): void {
    void openGoogleMapsDirectionsFromCurrentLocation({
      lat: ev.latitude,
      lng: ev.longitude,
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const raw = params.get('event');
        if (!raw) {
          return;
        }
        const eventId = Number.parseInt(raw, 10);
        if (!Number.isFinite(eventId)) {
          return;
        }
        this.pendingEventId = eventId;
        this.tryOpenPendingEvent();
      });
  }

  ngOnDestroy(): void {
    this.userLocationMarker?.remove();
  }

  private isSafePhotoUrl(url: string | null | undefined): url is string {

    if (!url?.trim()) {

      return false;

    }

    try {

      const parsed = new URL(url.trim());

      return parsed.protocol === 'http:' || parsed.protocol === 'https:';

    } catch {

      return false;

    }

  }



  private refreshMarkerTimeLabels(): void {

    for (const handle of this.markerHandles) {

      handle.timeEl.textContent = this.timeLabel(handle.data);

    }

  }



  private updateMarkerSelection(selectedId: number | null): void {

    for (const handle of this.markerHandles) {

      const root = handle.timeEl.closest('.event-map-marker');

      root?.classList.toggle('event-map-marker--selected', handle.data.id === selectedId);

    }

  }



  private selectEvent(m: MapMarkerDto): void {
    this.selectedEvent.set(m);
    this.updateMarkerSelection(m.id);
    this.loadEventDetail(m.id);
    this.flyToEvent(m.longitude, m.latitude);
  }

  private selectEventWithDetail(detail: EventDetailDto): void {
    const marker = this.detailToMarker(detail);
    this.selectedEvent.set(marker);
    this.eventDetail.set(detail);
    this.eventDetailLoading.set(false);
    this.attendError.set(null);
    this.updateMarkerSelection(marker.id);
    this.flyToEvent(marker.longitude, marker.latitude);
  }

  private detailToMarker(detail: EventDetailDto): MapMarkerDto {
    return {
      id: detail.id,
      title: detail.title,
      description: detail.description,
      photoUrl: detail.photoUrl,
      location: detail.location,
      latitude: detail.latitude,
      longitude: detail.longitude,
      visibility: detail.visibility,
      maxAttendees: detail.maxAttendees,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      startsAt: detail.startsAt,
      endsAt: detail.endsAt,
    };
  }

  private flyToEvent(longitude: number, latitude: number): void {
    this.map?.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(this.map.getZoom(), 17),
      essential: true,
    });
  }

  private tryOpenPendingEvent(): void {
    if (this.pendingEventId == null || !this.mapReady) {
      return;
    }

    const eventId = this.pendingEventId;
    this.pendingEventId = null;
    this.openingEventFromList = true;
    this.clearEventQueryParam();

    this.eventsService.getEventDetail(eventId).subscribe({
      next: (detail) => {
        this.ngZone.run(() => {
          this.selectEventWithDetail(detail);
          this.openingEventFromList = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.openingEventFromList = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  private clearEventQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { event: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadEventDetail(eventId: number): void {
    this.eventDetailLoading.set(true);
    this.eventDetail.set(null);
    this.attendError.set(null);

    this.eventsService.getEventDetail(eventId).subscribe({
      next: (detail) => {
        this.eventDetail.set(detail);
        this.eventDetailLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.eventDetail.set(null);
        this.eventDetailLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private readAttendError(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string | string[] } }).error;
      const msg = body?.message;
      if (typeof msg === 'string') {
        return msg;
      }
      if (Array.isArray(msg) && msg.length) {
        return msg.join(', ');
      }
    }
    return 'No se pudo actualizar tu asistencia.';
  }



  private createMarkerElement(m: MapMarkerDto): HTMLElement {

    const root = document.createElement('div');

    root.className = 'event-map-marker-root';



    const shadow = document.createElement('span');

    shadow.className = 'event-map-marker__shadow';

    shadow.setAttribute('aria-hidden', 'true');



    const floatWrap = document.createElement('div');

    floatWrap.className = 'event-map-marker-float';



    const card = document.createElement('button');

    card.type = 'button';

    card.className = `event-map-marker event-map-marker--${m.visibility}`;

    card.setAttribute('aria-label', `Ver evento: ${m.title}`);



    const photoWrap = document.createElement('div');

    photoWrap.className = 'event-map-marker__photo';



    if (this.isSafePhotoUrl(m.photoUrl)) {

      const img = document.createElement('img');

      img.className = 'event-map-marker__img';

      img.src = m.photoUrl;

      img.alt = '';

      img.loading = 'lazy';

      img.addEventListener('error', () => {

        img.remove();

        photoWrap.classList.add('event-map-marker__photo--empty');

      });

      photoWrap.appendChild(img);

    } else {

      photoWrap.classList.add('event-map-marker__photo--empty');

    }



    const body = document.createElement('div');

    body.className = 'event-map-marker__body';



    const title = document.createElement('div');

    title.className = 'event-map-marker__title';

    title.textContent = m.title;



    const time = document.createElement('div');

    time.className = 'event-map-marker__time';

    time.textContent = this.timeLabel(m);



    body.append(title, time);

    card.append(photoWrap, body);

    floatWrap.appendChild(card);

    root.append(floatWrap, shadow);



    card.addEventListener('click', (e) => {

      e.stopPropagation();

      this.ngZone.run(() => this.selectEvent(m));

    });



    return root;

  }



  private clearEventMarkers(): void {

    for (const handle of this.markerHandles) {

      handle.mapMarker.remove();

    }

    this.markerHandles.length = 0;

  }



  private addEventMarkers(map: maplibregl.Map): void {

    this.eventsService.getMapMarkers().subscribe({

      next: (markers) => {

        this.clearEventMarkers();

        if (!this.openingEventFromList && !this.selectedEvent()) {
          this.closeDetail();
        }

        for (const m of markers) {

          const root = this.createMarkerElement(m);

          const timeEl = root.querySelector('.event-map-marker__time') as HTMLElement;



          const mapMarker = new maplibregl.Marker({

            element: root,

            anchor: 'bottom',

            pitchAlignment: 'viewport',

            rotationAlignment: 'viewport',

          })

            .setLngLat([m.longitude, m.latitude])

            .addTo(map);



          this.markerHandles.push({ data: m, timeEl, mapMarker });

        }

        this.tryOpenPendingEvent();
      },

      error: (err) => {

        this.clearEventMarkers();

        this.closeDetail();

        console.warn('No se pudieron cargar los eventos en el mapa:', err);

      },

    });

  }



  private initializeMap(): void {

    const map = new maplibregl.Map({

      container: this.mapContainer.nativeElement,

      style: 'https://tiles.openfreemap.org/styles/liberty',

      center: [-3.6245, 37.197],

      zoom: 17,

      pitch: 60,

      bearing: -20,

    });



    map.on('styleimagemissing', (e) => {

      const emptyImage = new Uint8Array(4);

      map.addImage(e.id, { width: 1, height: 1, data: emptyImage });

    });



    map.addControl(new maplibregl.NavigationControl());



    map.on('load', () => {
      this.mapReady = true;
      this.addEventMarkers(map);
      this.tryOpenPendingEvent();
    });



    map.on('click', () => {

      this.ngZone.run(() => this.closeDetail());

    });



    void this.locateUserOnStart(map);



    this.map = map;

  }



  private locateUserOnStart(map: maplibregl.Map): void {

    if (!('geolocation' in navigator)) {

      return;

    }



    navigator.geolocation.getCurrentPosition(

      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;

        this.setUserLocationMarker(map, lng, lat);

        map.flyTo({
          center: [lng, lat],
          zoom: 16,
          essential: true,
        });
      },

      (error) => {

        console.warn('Error de geolocalización o permiso denegado:', error.message);

      },

      {

        enableHighAccuracy: true,

        timeout: 5000,

        maximumAge: 0,

      },

    );

  }

  private setUserLocationMarker(map: maplibregl.Map, lng: number, lat: number): void {
    if (this.userLocationMarker) {
      this.userLocationMarker.setLngLat([lng, lat]);
      return;
    }

    this.userLocationMarker = new maplibregl.Marker()
      .setLngLat([lng, lat])
      .addTo(map);
  }

}


