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

  effect,

} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

import maplibregl from 'maplibre-gl';

import { EventsService } from '@core/services/events.service';
import { FriendsService } from '@core/services/friends.service';
import { NotificationsService } from '@core/services/notifications.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { MapThemeService } from '@core/services/map-theme.service';
import { RoutingApiService } from '@core/services/routing-api.service';
import { ROUTING_UI_BLOCKED } from '@core/config/routing-availability.config';

import {
  EventDetailDto,
  EventParticipantDto,
  MapMarkerDto,
} from '@core/interfaces/event-interface';
import { FriendListItemDto } from '@core/interfaces/friend-interface';
import {
  eventParticipantDisplayName,
  eventParticipantInitials,
} from '@core/utils/event-participant.utils';

import { EventParticipantStatus, EventVisibility } from '@core/constants/event-enums';

import {
  applyEventMapMarkerPhaseClass,
  clearEventMapMarkerPhaseClasses,
  eventMarkerTimeText,
  eventTimeDisplayText,
  msUntilNextDetailTimeRefresh,
  msUntilNextMarkerStateRefresh,
} from '@core/utils/event-time.utils';
import type { MapDirectionsTravelMode } from '@core/interfaces/route-directions.interface';
import { getCurrentLngLat } from '@core/utils/google-maps-directions.utils';
import {
  clearRouteFromMap,
  showRouteOnMap,
} from '@core/utils/map-route-layer.util';
import {
  MapThemePreference,
  MapVisualTheme,
} from '@core/config/map-styles.config';
import { applyMapAtmosphere } from '@core/utils/map-atmosphere.utils';
import {
  bindMap3DBuildingsSync,
  syncMap3DBuildings,
} from '@core/utils/map-3d-buildings.utils';
import {
  captureMarkerSyncCamera,
  MarkerSyncCameraSnapshot,
  shouldRunMarkerSync,
} from '@core/utils/map-marker-sync-threshold.utils';
import { applyMapLandcoverTheme } from '@core/utils/map-landcover-theme.utils';
import {
  mapStyleUrlForTheme,
  msUntilNextAutoThemeBoundary,
  resolveVisualTheme,
} from '@core/utils/map-theme.utils';
import {
  buildMarkersById,
  clusterMarkersForMapView,
  DEFAULT_SCREEN_CLUSTER_CONFIG,
  markersFromClusterMembers,
  visibleMarkersDisplayFingerprint,
  VisibleMapMarker,
} from '@core/utils/map-event-cluster.utils';
import {
  bindEventGlDotLayerInteractions,
  clearEventGlDotSource,
  ensureEventGlDotLayer,
  updateEventGlDotSelection,
  updateEventGlDotSource,
  UGR_EVENTS_GL_LAYER_ID,
  usesGlDotLayer,
} from '@core/utils/map-event-gl-layer.utils';
import {
  createUserLocationGroundElement,
  createUserLocationMarkerElement,
  syncUserLocationMarkerVisual,
  updateUserLocationAccuracyRing,
} from '@core/utils/map-user-location-marker.utils';
import {
  eventPhotoUrl,
  userProfilePhotoUrl,
} from '@core/utils/image-api.util';
import { MapDirectionsOverlayComponent } from './components/map-directions-overlay/map-directions-overlay.component';
import { MapClusterPanelComponent } from './components/map-cluster-panel/map-cluster-panel.component';
import { MapInviteFriendsDialogComponent } from './components/map-invite-friends-dialog/map-invite-friends-dialog.component';
import { MapEventDeleteDialogComponent } from './components/map-event-delete-dialog/map-event-delete-dialog.component';

type MarkerHandle = {
  data: MapMarkerDto;
  timeEl: HTMLElement | null;
  clickEl: HTMLElement;
  isDot: boolean;
  mapMarker: maplibregl.Marker;
};

type ClusterMarkerHandle = {
  clusterId: number;
  eventIds: number[];
  mapMarker: maplibregl.Marker;
};

/** Animación global (styles.css); los carteles no heredan map.css por encapsulación. */
const EVENT_MARKER_FLOAT_ANIMATION =
  'ugr-event-map-float 2.8s ease-in-out infinite';



@Component({

  selector: 'app-map',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    MapDirectionsOverlayComponent,
    MapClusterPanelComponent,
    MapInviteFriendsDialogComponent,
    MapEventDeleteDialogComponent,
  ],

  templateUrl: './map.html',

  styleUrl: './map.css',

})

export class MapComponent implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;



  private readonly destroyRef = inject(DestroyRef);

  private readonly ngZone = inject(NgZone);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly eventsService = inject(EventsService);
  private readonly friendsService = inject(FriendsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly routingApi = inject(RoutingApiService);
  private readonly authService = inject(AuthService);
  private readonly shellUi = inject(ShellUiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly mapTheme = inject(MapThemeService);

  /** Marcadores visibles en el mapa ahora mismo. */
  private readonly markerHandles: MarkerHandle[] = [];
  private readonly clusterMarkerHandles: ClusterMarkerHandle[] = [];
  /**
   * Pool: marcadores quitados del mapa pero con DOM vivo para reutilizar
   * (evita createElement + new Marker en cada zoom).
   */
  private readonly eventMarkerPool: MarkerHandle[] = [];
  private readonly clusterMarkerPool: ClusterMarkerHandle[] = [];
  private markersById = new Map<number, MapMarkerDto>();
  private allMapMarkers: MapMarkerDto[] = [];
  private clusterSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private clusterSyncBound = false;
  private markerAnimationSyncBound = false;
  private mapInteractionDepth = 0;
  private unbindMap3dSync: (() => void) | null = null;
  private unbindMarkerAnimationSync: (() => void) | null = null;
  private unbindGlDotInteractions: (() => void) | null = null;
  private lastVisibleMarkersFingerprint = '';
  private lastMarkerSyncCamera: MarkerSyncCameraSnapshot | null = null;
  private mapReady = false;
  private pendingEventId: number | null = null;
  private openingEventFromList = false;



  readonly selectedEvent = signal<MapMarkerDto | null>(null);
  readonly clusterPanelEvents = signal<MapMarkerDto[] | null>(null);
  readonly eventDetail = signal<EventDetailDto | null>(null);
  readonly eventDetailLoading = signal(false);
  readonly attendActionLoading = signal(false);
  readonly attendError = signal<string | null>(null);
  readonly ownerDeleteLoading = signal(false);
  readonly ownerDeleteError = signal<string | null>(null);
  readonly showOwnerDeleteConfirm = signal(false);
  readonly showInviteFriends = signal(false);
  readonly inviteFriendsLoading = signal(false);
  readonly inviteFriendsError = signal<string | null>(null);
  readonly inviteFriendsSuccess = signal<string | null>(null);
  readonly inviteActionUserNumber = signal<number | null>(null);
  readonly invitedFriendNumbers = signal<ReadonlySet<number>>(new Set());
  readonly inviteFriendsList = signal<FriendListItemDto[]>([]);

  readonly activeVisualTheme = signal<MapVisualTheme>(
    this.mapTheme.resolveTheme(),
  );
  readonly locatingUser = signal(false);

  // ------------------------------------------------------------
  // In-map directions (Google Routes API via backend /routing)
  // ------------------------------------------------------------

  /** Gate from routing-availability.config; blocks «Cómo llegar» until Google approval. */
  readonly routingUiBlocked = ROUTING_UI_BLOCKED;
  readonly EventParticipantStatus = EventParticipantStatus;
  readonly EventVisibility = EventVisibility;
  /** Full-map directions UI (sidebar hidden, top toolbar). */
  readonly directionsViewActive = signal(false);
  /** WALK or DRIVE for the next computeDirections request. */
  readonly directionsTravelMode = signal<MapDirectionsTravelMode>('WALK');
  readonly directionsLoading = signal(false);
  readonly directionsError = signal<string | null>(null);
  /** Parsed route stats for the directions top bar (Spanish labels). */
  readonly routeDisplay = signal<{
    durationLabel: string;
    distanceLabel: string;
    altNote: string | null;
  } | null>(null);

  nowMs = Date.now();

  public map!: maplibregl.Map;

  private userLocationMarker: maplibregl.Marker | null = null;
  private userLocationGroundMarker: maplibregl.Marker | null = null;
  private unbindUserLocationVisualSync: (() => void) | null = null;
  /** Centro por defecto (Granada) si no hay geolocalización. */
  private static readonly DEFAULT_MAP_CENTER: [number, number] = [-3.6245, 37.197];
  private static readonly DEFAULT_MAP_ZOOM = 17;
  /** Min gap before route-activation refresh (avoids double fetch after mutations). */
  private static readonly MAP_MARKERS_STALE_MS = 2_000;
  private static readonly GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 15_000,
  };
  private pendingInitialCenter: [number, number] | null = null;
  private initialUserCenterApplied = false;
  private initialGeolocationRequested = false;
  private initialGeolocationFailed = false;
  private activeStyleUrl: string | null = null;
  private autoThemeTimer: ReturnType<typeof setTimeout> | null = null;
  private detailTimeTimer: ReturnType<typeof setTimeout> | null = null;
  private markerLabelTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMapMarkersFetchedAt = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearAutoThemeSchedule();
      this.clearDetailTimeSchedule();
      this.clearMarkerLabelSchedule();
    });

    effect(() => {
      const preference = this.mapTheme.themePreference();
      const changeToken = this.mapTheme.preferenceChange();
      void changeToken;

      if (!this.mapReady || !this.map) {
        return;
      }

      this.applyMapTheme(this.mapTheme.resolveTheme(preference));
      this.resetAutoThemeSchedule();
    });

    effect(() => {
      const tick = this.shellUi.mapRefreshTick();
      if (tick === 0 || !this.mapReady || !this.map) {
        return;
      }
      this.refreshMapMarkers();
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (this.mapReady && this.map) {
          requestAnimationFrame(() => this.map.resize());
        }
        if (
          this.isBaseMapRoute(event.urlAfterRedirects) &&
          this.shouldRefreshStaleMapMarkers()
        ) {
          this.refreshMapMarkers();
        }
      });
  }

  selectThemePreference(preference: MapThemePreference): void {
    this.mapTheme.setThemePreference(preference);
  }

  /** Marcador: Inicio (futuro) o Final (ya empezado); sin cuenta atrás. */
  markerTimeLabel(m: MapMarkerDto): string {
    return eventMarkerTimeText(m.startsAt, m.endsAt);
  }

  /** Panel lateral: cuenta atrás si el evento ya empezó; si no, fecha de inicio o finalizado. */
  detailTimeLabel(m: MapMarkerDto): string {
    return eventTimeDisplayText(m.startsAt, m.endsAt, this.nowMs);
  }



  visibilityLabel(visibility: EventVisibility): string {

    return visibility === EventVisibility.PRIVATE ? 'Reunión' : 'Evento público';

  }



  participantName(p: EventParticipantDto): string {
    return eventParticipantDisplayName(p);
  }

  participantInitials(p: EventParticipantDto): string {
    return eventParticipantInitials(p);
  }

  profileRoute(viewUserNumber: number): (string | number)[] {
    const me = this.authService.currentUserValue?.userNumber;
    if (me == null) {
      return ['/'];
    }
    if (viewUserNumber === me) {
      return ['/u', me, 'profile'];
    }
    return ['/u', me, 'profile', viewUserNumber];
  }

  attendeesCountLabel(detail: EventDetailDto): string {
    if (detail.maxAttendees == null) {
      return `${detail.attendeeCount} apuntados · sin límite`;
    }
    return `${detail.attendeeCount} / ${detail.maxAttendees} apuntados`;
  }

  meetingParticipantsSummary(detail: EventDetailDto): string {
    return `${detail.confirmedCount} confirmados · ${detail.pendingCount} pendientes`;
  }

  participantStatusLabel(status: EventParticipantStatus): string {
    return status === EventParticipantStatus.ACCEPTED ? 'Confirmada' : 'Pendiente';
  }

  isParticipantConfirmed(status: EventParticipantStatus): boolean {
    return status === EventParticipantStatus.ACCEPTED;
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



  hasPhoto(
    source:
      | MapMarkerDto
      | EventParticipantDto
      | { hasPhoto?: boolean; hasProfilePicture?: boolean }
      | null
      | undefined,
  ): boolean {
    if (source == null) {
      return false;
    }
    if ('hasPhoto' in source && source.hasPhoto != null) {
      return source.hasPhoto;
    }
    if ('hasProfilePicture' in source && source.hasProfilePicture != null) {
      return source.hasProfilePicture;
    }
    return false;
  }

  eventPhotoSrc(eventId: number): string {
    return eventPhotoUrl(eventId);
  }

  userPhotoSrc(userNumber: number): string {
    return userProfilePhotoUrl(userNumber);
  }



  closeDetail(): void {
    this.exitDirectionsView(false);
    this.resetInviteFriendsState();
    this.selectedEvent.set(null);
    this.eventDetail.set(null);
    this.eventDetailLoading.set(false);
    this.attendError.set(null);
    this.ownerDeleteError.set(null);
    this.showOwnerDeleteConfirm.set(false);
    this.updateMarkerSelection(null);
    this.clearDetailTimeSchedule();
  }

  resetInviteFriendsState(): void {
    this.showInviteFriends.set(false);
    this.inviteFriendsLoading.set(false);
    this.inviteFriendsError.set(null);
    this.inviteFriendsSuccess.set(null);
    this.inviteActionUserNumber.set(null);
    this.invitedFriendNumbers.set(new Set());
    this.inviteFriendsList.set([]);
  }

  closeClusterPanel(): void {
    this.clusterPanelEvents.set(null);
    this.cdr.markForCheck();
  }

  selectEventFromCluster(m: MapMarkerDto): void {
    this.closeClusterPanel();
    this.selectEvent(m);
  }

  openEditOwnEvent(): void {
    const detail = this.eventDetail();
    const me = this.authService.currentUserValue?.userNumber;
    if (!detail?.viewerIsCreator || me == null) {
      return;
    }
    void this.router.navigate(['/u', me, 'events', detail.id, 'edit']);
  }

  openOwnerDeleteConfirm(): void {
    this.ownerDeleteError.set(null);
    this.showOwnerDeleteConfirm.set(true);
    this.cdr.markForCheck();
  }

  closeOwnerDeleteConfirm(): void {
    if (this.ownerDeleteLoading()) {
      return;
    }
    this.showOwnerDeleteConfirm.set(false);
    this.cdr.markForCheck();
  }

  confirmOwnerDelete(): void {
    const detail = this.eventDetail();
    if (!detail?.viewerIsCreator || this.ownerDeleteLoading()) {
      return;
    }

    this.ownerDeleteLoading.set(true);
    this.ownerDeleteError.set(null);

    this.eventsService.deleteEvent(detail.id).subscribe({
      next: () => {
        this.ownerDeleteLoading.set(false);
        this.showOwnerDeleteConfirm.set(false);
        this.closeDetail();
        this.refreshMapMarkers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.ownerDeleteLoading.set(false);
        this.ownerDeleteError.set(this.readOwnerActionError(err));
        this.cdr.markForCheck();
      },
    });
  }

  private readOwnerActionError(err: unknown): string {
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
    return 'No se pudo completar la acción.';
  }

  private refreshMapMarkers(): void {
    if (!this.map) {
      return;
    }
    this.addEventMarkers(this.map);
  }

  private markMapMarkersFetched(): void {
    this.lastMapMarkersFetchedAt = Date.now();
  }

  private shouldRefreshStaleMapMarkers(): boolean {
    return Date.now() - this.lastMapMarkersFetchedAt > MapComponent.MAP_MARKERS_STALE_MS;
  }

  private isBaseMapRoute(url: string): boolean {
    const path = url.split('?')[0];
    return /^\/u\/\d+\/map$/.test(path);
  }

  toggleAttendance(): void {
    const detail = this.eventDetail();
    if (
      !detail ||
      detail.isMeeting ||
      this.attendActionLoading() ||
      !this.canToggleAttendance(detail)
    ) {
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

  acceptMeetingInvitation(): void {
    const detail = this.eventDetail();
    if (
      !detail?.isMeeting ||
      detail.viewerIsCreator ||
      detail.viewerParticipantStatus !== EventParticipantStatus.PENDING ||
      this.attendActionLoading()
    ) {
      return;
    }

    this.attendActionLoading.set(true);
    this.attendError.set(null);

    this.eventsService.acceptMeetingInvitation(detail.id).subscribe({
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

  rejectMeetingInvitation(): void {
    const detail = this.eventDetail();
    if (
      !detail?.isMeeting ||
      detail.viewerIsCreator ||
      detail.viewerParticipantStatus !== EventParticipantStatus.PENDING ||
      this.attendActionLoading()
    ) {
      return;
    }

    this.attendActionLoading.set(true);
    this.attendError.set(null);

    this.eventsService.rejectMeetingInvitation(detail.id).subscribe({
      next: () => {
        this.attendActionLoading.set(false);
        this.closeDetail();
        this.shellUi.requestMapRefresh();
        this.refreshMapMarkers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.attendActionLoading.set(false);
        this.attendError.set(this.readAttendError(err));
        this.cdr.markForCheck();
      },
    });
  }

  openInviteFriendsOverlay(): void {
    const detail = this.eventDetail();
    if (
      !detail ||
      detail.isMeeting ||
      detail.visibility !== EventVisibility.PUBLIC
    ) {
      return;
    }
    this.showInviteFriends.set(true);
    this.inviteFriendsError.set(null);
    this.inviteFriendsSuccess.set(null);
    this.loadInviteFriends();
  }

  closeInviteFriendsOverlay(): void {
    this.showInviteFriends.set(false);
    this.inviteFriendsError.set(null);
    this.inviteFriendsSuccess.set(null);
  }

  loadInviteFriends(): void {
    this.inviteFriendsLoading.set(true);
    this.inviteFriendsError.set(null);
    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        this.inviteFriendsList.set(friends);
        this.inviteFriendsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.inviteFriendsLoading.set(false);
        this.inviteFriendsError.set('No se pudo cargar la lista de amigos.');
        this.cdr.markForCheck();
      },
    });
  }

  inviteFriendToEvent(friend: FriendListItemDto): void {
    const detail = this.eventDetail();
    if (!detail || this.inviteActionUserNumber() !== null) {
      return;
    }

    this.inviteActionUserNumber.set(friend.user.userNumber);
    this.inviteFriendsError.set(null);
    this.inviteFriendsSuccess.set(null);

    this.eventsService
      .inviteFriendToPublicEvent(detail.id, friend.user.userNumber)
      .subscribe({
      next: () => {
        this.invitedFriendNumbers.update((set) => {
          const next = new Set(set);
          next.add(friend.user.userNumber);
          return next;
        });
        this.inviteActionUserNumber.set(null);
        this.inviteFriendsSuccess.set(
          `Recomendación enviada a ${this.friendDisplayName(friend)}.`,
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.inviteActionUserNumber.set(null);
        const msg = err?.error?.message;
        const text = Array.isArray(msg) ? msg.join(' ') : msg;
        if (typeof text === 'string' && text.includes('Ya has recomendado')) {
          this.invitedFriendNumbers.update((set) => {
            const next = new Set(set);
            next.add(friend.user.userNumber);
            return next;
          });
          this.inviteFriendsError.set('Ya habías recomendado este evento a ese amigo.');
        } else {
          this.inviteFriendsError.set(
            typeof text === 'string' && text ? text : 'No se pudo enviar la recomendación.',
          );
        }
        this.cdr.markForCheck();
      },
    });
  }

  friendDisplayName(friend: FriendListItemDto): string {
    const parts = [friend.user.firstName, friend.user.lastName].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return `#${friend.user.userNumber}`;
  }

  /**
   * Label for the primary directions button (Spanish copy for the UI).
   * @returns {string}
   */
  directionsButtonLabel(): string {
    if (this.routingUiBlocked) {
      return 'Cómo llegar (próximamente)';
    }
    if (this.directionsLoading()) {
      return 'Calculando ruta…';
    }
    return 'Cómo llegar';
  }

  /**
   * Starts in-map routing: geolocation → POST /routing/directions → MapLibre line.
   * No-op when ROUTING_UI_BLOCKED is true.
   * @param {MapMarkerDto} ev - Selected event marker (destination).
   * @returns {void}
   */
  openDirections(ev: MapMarkerDto): void {
    if (this.routingUiBlocked) {
      return;
    }
    this.directionsViewActive.set(true);
    this.cdr.markForCheck();
    void this.loadInMapDirections(ev);
  }

  /**
   * Leaves full-screen directions and optionally restores the event sidebar camera.
   * @param {boolean} [restoreEventCamera=true] - Fly back to the selected event with map tilt.
   * @returns {void}
   */
  exitDirectionsView(restoreEventCamera = true): void {
    this.directionsViewActive.set(false);
    this.clearDisplayedRoute();
    if (restoreEventCamera) {
      const ev = this.selectedEvent();
      if (ev && this.map) {
        this.map.flyTo({
          center: [ev.longitude, ev.latitude],
          zoom: Math.max(this.map.getZoom(), 17),
          pitch: 62,
          bearing: -20,
          duration: 900,
          essential: true,
        });
      }
    }
    this.cdr.markForCheck();
  }

  /**
   * Sets walk/drive mode; recalculates while the directions view is active.
   * @param {MapDirectionsTravelMode} mode - WALK or DRIVE.
   * @returns {void}
   */
  setDirectionsTravelMode(mode: MapDirectionsTravelMode): void {
    if (this.directionsTravelMode() === mode) {
      return;
    }
    this.directionsTravelMode.set(mode);
    const ev = this.selectedEvent();
    if (
      ev &&
      !this.routingUiBlocked &&
      this.directionsViewActive() &&
      !this.directionsLoading()
    ) {
      void this.loadInMapDirections(ev);
    }
    this.cdr.markForCheck();
  }

  /**
   * Removes the route line from MapLibre and clears directions UI state.
   * @returns {void}
   */
  clearDisplayedRoute(): void {
    clearRouteFromMap(this.map);
    this.routeDisplay.set(null);
    this.directionsError.set(null);
    this.directionsLoading.set(false);
  }

  /**
   * Fetches the fastest route from the backend and renders it on the map.
   * @param {MapMarkerDto} ev - Destination event.
   * @returns {Promise<void>}
   */
  private async loadInMapDirections(ev: MapMarkerDto): Promise<void> {
    if (!this.mapReady || !this.map) {
      this.directionsError.set('El mapa aún no está listo.');
      this.cdr.markForCheck();
      return;
    }

    this.directionsLoading.set(true);
    this.directionsError.set(null);
    this.routeDisplay.set(null);
    this.cdr.markForCheck();

    try {
      const origin = await getCurrentLngLat();
      const route = await firstValueFrom(
        this.routingApi.computeDirections({
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: ev.latitude,
          destinationLng: ev.longitude,
          travelMode: this.directionsTravelMode(),
        }),
      );

      showRouteOnMap(this.map, route.geoJson, {
        origin: [origin.lng, origin.lat],
        destination: [ev.longitude, ev.latitude],
        overviewFromAbove: true,
        travelMode: route.travelMode,
      });
      this.routeDisplay.set(this.buildRouteDisplay(route));
    } catch {
      this.directionsError.set('No se pudo calcular la ruta.');
      clearRouteFromMap(this.map);
    } finally {
      this.directionsLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Builds display labels for the directions top bar.
   * @param {object} route - Normalized directions response fields.
   * @returns {{ durationLabel: string; distanceLabel: string; altNote: string | null }}
   */
  private buildRouteDisplay(route: {
    distanceMeters: number;
    durationSeconds: number;
    travelMode: MapDirectionsTravelMode;
    routesReturned: number;
  }): {
    durationLabel: string;
    distanceLabel: string;
    altNote: string | null;
  } {
    const distanceLabel =
      route.distanceMeters >= 1000
        ? `${(route.distanceMeters / 1000).toFixed(1)} km`
        : `${route.distanceMeters} m`;
    const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
    const durationLabel = `~${minutes} min`;
    const altNote =
      route.routesReturned > 1
        ? `Ruta más rápida de ${route.routesReturned} opciones`
        : null;
    return { durationLabel, distanceLabel, altNote };
  }

  goToMyLocation(): void {
    this.centerOnUserLocation({ animate: true });
  }

  ngAfterViewInit(): void {
    this.prefetchUserLocationForMapInit();
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
    this.exitDirectionsView(false);
    this.unbindMap3dSync?.();
    this.unbindMap3dSync = null;
    this.unbindMarkerAnimationSync?.();
    this.unbindMarkerAnimationSync = null;
    this.unbindGlDotInteractions?.();
    this.unbindGlDotInteractions = null;
    this.mapInteractionDepth = 0;
    this.setMarkerFloatAnimationsPaused(false);
    this.userLocationMarker?.remove();
    this.userLocationGroundMarker?.remove();
    this.unbindUserLocationVisualSync?.();
    this.unbindUserLocationVisualSync = null;
  }




  private clearDetailTimeSchedule(): void {
    if (this.detailTimeTimer !== null) {
      clearTimeout(this.detailTimeTimer);
      this.detailTimeTimer = null;
    }
  }

  private refreshMarkerTimeLabels(): void {
    for (const handle of this.markerHandles) {
      if (handle.timeEl) {
        handle.timeEl.textContent = this.markerTimeLabel(handle.data);
      }
    }
  }

  private refreshMarkerPhases(): void {
    const nowMs = Date.now();
    for (const handle of this.markerHandles) {
      applyEventMapMarkerPhaseClass(
        handle.clickEl,
        handle.data.startsAt,
        handle.data.endsAt,
        nowMs,
      );
    }
    if (this.map && usesGlDotLayer(this.map.getZoom())) {
      updateEventGlDotSource(this.map, this.allMapMarkers, nowMs);
      updateEventGlDotSelection(this.map, this.selectedEvent()?.id ?? null);
    }
  }

  private refreshMarkerState(): void {
    this.refreshMarkerTimeLabels();
    this.refreshMarkerPhases();
  }

  private clearMarkerLabelSchedule(): void {
    if (this.markerLabelTimer !== null) {
      clearTimeout(this.markerLabelTimer);
      this.markerLabelTimer = null;
    }
  }

  /** Timer en inicio, mitad y fin de cada evento visible (etiqueta + color). */
  private scheduleMarkerStateRefresh(): void {
    this.clearMarkerLabelSchedule();
    const events = this.allMapMarkers.map((m) => ({
      startsAt: m.startsAt,
      endsAt: m.endsAt,
    }));
    const delay = msUntilNextMarkerStateRefresh(events);
    if (delay === null) {
      return;
    }

    this.markerLabelTimer = setTimeout(() => {
      this.ngZone.runOutsideAngular(() => {
        this.refreshMarkerState();
        this.scheduleMarkerStateRefresh();
      });
    }, delay);
  }

  /** Timer solo con el sidebar abierto y evento en curso (o al llegar la hora de inicio). */
  private scheduleDetailTimeRefresh(): void {
    this.clearDetailTimeSchedule();
    const ev = this.selectedEvent();
    if (!ev) {
      return;
    }

    const delay = msUntilNextDetailTimeRefresh(ev.startsAt, ev.endsAt);
    if (delay === null) {
      return;
    }

    this.detailTimeTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.nowMs = Date.now();
        this.cdr.markForCheck();
        this.scheduleDetailTimeRefresh();
      });
    }, delay);
  }

  private resetDetailTimeSchedule(): void {
    this.nowMs = Date.now();
    this.cdr.markForCheck();
    this.scheduleDetailTimeRefresh();
  }

  private updateMarkerSelection(selectedId: number | null): void {
    for (const handle of this.markerHandles) {
      const selected = handle.data.id === selectedId;
      if (handle.isDot) {
        handle.clickEl.classList.toggle('event-map-marker-dot--selected', selected);
      } else {
        handle.clickEl.classList.toggle('event-map-marker--selected', selected);
      }
    }
    if (this.map && usesGlDotLayer(this.map.getZoom())) {
      updateEventGlDotSelection(this.map, selectedId);
    }
  }



  private selectEvent(m: MapMarkerDto): void {
    this.closeClusterPanel();
    if (this.directionsViewActive()) {
      this.exitDirectionsView(false);
    } else {
      this.clearDisplayedRoute();
    }
    this.selectedEvent.set(m);
    this.updateMarkerSelection(m.id);
    this.loadEventDetail(m.id);
    this.flyToEvent(m.longitude, m.latitude);
    this.resetDetailTimeSchedule();
  }

  private selectEventWithDetail(detail: EventDetailDto): void {
    const marker = this.detailToMarker(detail);
    this.selectedEvent.set(marker);
    this.eventDetail.set(detail);
    this.eventDetailLoading.set(false);
    this.attendError.set(null);
    this.updateMarkerSelection(marker.id);
    this.flyToEvent(marker.longitude, marker.latitude);
    this.resetDetailTimeSchedule();
  }

  private detailToMarker(detail: EventDetailDto): MapMarkerDto {
    return {
      id: detail.id,
      title: detail.title,
      description: detail.description,
      hasPhoto: detail.hasPhoto,
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
        this.notificationsService.markReadByEvent(eventId).subscribe({
          next: () => this.shellUi.requestNotificationRefresh(),
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
    this.applyEventMarkerFloatAnimation(floatWrap);

    const card = document.createElement('button');

    card.type = 'button';

    card.className = `event-map-marker event-map-marker--${m.visibility}`;
    applyEventMapMarkerPhaseClass(card, m.startsAt, m.endsAt);

    card.setAttribute('aria-label', `Ver evento: ${m.title}`);



    const photoWrap = document.createElement('div');

    photoWrap.className = 'event-map-marker__photo';



    if (m.hasPhoto) {

      const img = document.createElement('img');

      img.className = 'event-map-marker__img';

      img.src = eventPhotoUrl(m.id);

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

    time.textContent = this.markerTimeLabel(m);



    body.append(title, time);

    card.append(photoWrap, body);

    floatWrap.appendChild(card);
    root.append(floatWrap, shadow);
    this.clearFloatAnimationInlineStyles(root);

    return root;
  }

  /** Punto compacto para vista lejana: muchos eventos visibles sin mega-cluster. */
  private createDotMarkerElement(m: MapMarkerDto): HTMLElement {
    const root = document.createElement('div');
    root.className = 'event-map-marker-root event-map-marker-root--dot';

    const shadow = document.createElement('span');
    shadow.className = 'event-map-marker-dot__shadow';
    shadow.setAttribute('aria-hidden', 'true');

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `event-map-marker-dot event-map-marker-dot--${m.visibility}`;
    applyEventMapMarkerPhaseClass(dot, m.startsAt, m.endsAt);
    dot.setAttribute('aria-label', `Ver evento: ${m.title}`);

    root.append(dot, shadow);
    return root;
  }

  private createClusterMarkerElement(count: number): HTMLElement {
    const root = document.createElement('div');
    root.className = 'event-map-cluster-root';

    const shadow = document.createElement('span');
    shadow.className = 'event-map-cluster__shadow';
    shadow.setAttribute('aria-hidden', 'true');

    const floatWrap = document.createElement('div');
    floatWrap.className = 'event-map-cluster-float';

    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'event-map-cluster';
    bubble.setAttribute('aria-label', `${count} eventos agrupados`);

    const countEl = document.createElement('span');
    countEl.className = 'event-map-cluster__count';
    countEl.textContent = String(count);
    bubble.appendChild(countEl);

    floatWrap.appendChild(bubble);
    root.append(floatWrap, shadow);
    return root;
  }

  /** Paso 2 — Crea un handle de evento nuevo (DOM + Marker + listener, una sola vez). */
  private buildEventMarkerHandle(
    m: MapMarkerDto,
    isDot: boolean,
  ): MarkerHandle {
    const root = isDot
      ? this.createDotMarkerElement(m)
      : this.createMarkerElement(m);
    const timeEl = isDot
      ? null
      : (root.querySelector('.event-map-marker__time') as HTMLElement);
    const clickEl = (isDot
      ? root.querySelector('.event-map-marker-dot')
      : root.querySelector('.event-map-marker')) as HTMLButtonElement;

    const handle: MarkerHandle = {
      data: m,
      timeEl,
      clickEl,
      isDot,
      mapMarker: new maplibregl.Marker({
        element: root,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([m.longitude, m.latitude])
        .addTo(this.map),
    };

    clickEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ngZone.run(() => {
        const marker = this.markersById.get(handle.data.id);
        if (marker) {
          this.selectEvent(marker);
        }
      });
    });

    return handle;
  }

  private buildClusterMarkerHandle(
    item: Extract<VisibleMapMarker, { type: 'cluster' }>,
  ): ClusterMarkerHandle {
    const root = this.createClusterMarkerElement(item.count);
    const bubble = root.querySelector('.event-map-cluster') as HTMLButtonElement;
    const handle: ClusterMarkerHandle = {
      clusterId: item.clusterId,
      eventIds: [...item.eventIds],
      mapMarker: new maplibregl.Marker({
        element: root,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([item.longitude, item.latitude])
        .addTo(this.map),
    };

    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ngZone.run(() =>
        this.openClusterPanel(handle.clusterId, handle.eventIds),
      );
    });

    this.clearFloatAnimationInlineStyles(root);
    return handle;
  }

  /** Paso 2 — Saca del pool o construye; el listener sigue vivo en el DOM reutilizado. */
  private acquireEventMarkerHandle(
    m: MapMarkerDto,
    isDot: boolean,
  ): MarkerHandle {
    const poolIndex = this.eventMarkerPool.findIndex((h) => h.isDot === isDot);
    if (poolIndex >= 0) {
      const handle = this.eventMarkerPool.splice(poolIndex, 1)[0];
      this.updateEventMarkerHandle(handle, m);
      if (!isDot) {
        this.clearFloatAnimationInlineStyles(handle.mapMarker.getElement());
      }
      handle.mapMarker.addTo(this.map);
      return handle;
    }
    return this.buildEventMarkerHandle(m, isDot);
  }

  private acquireClusterMarkerHandle(
    item: Extract<VisibleMapMarker, { type: 'cluster' }>,
  ): ClusterMarkerHandle {
    const handle = this.clusterMarkerPool.pop();
    if (handle) {
      this.updateClusterMarkerHandle(handle, item);
      this.clearFloatAnimationInlineStyles(handle.mapMarker.getElement());
      handle.mapMarker.addTo(this.map);
      return handle;
    }
    return this.buildClusterMarkerHandle(item);
  }

  /** Paso 2 — Quita del mapa y guarda en pool (no destruye el DOM). */
  private releaseEventMarkerHandle(handle: MarkerHandle): void {
    handle.mapMarker.remove();
    handle.clickEl.classList.remove(
      'event-map-marker--selected',
      'event-map-marker-dot--selected',
    );
    clearEventMapMarkerPhaseClasses(handle.clickEl);
    this.eventMarkerPool.push(handle);
  }

  private releaseClusterMarkerHandle(handle: ClusterMarkerHandle): void {
    handle.mapMarker.remove();
    this.clusterMarkerPool.push(handle);
  }

  private drainMarkerPools(): void {
    for (const handle of this.eventMarkerPool) {
      handle.mapMarker.remove();
    }
    this.eventMarkerPool.length = 0;
    for (const handle of this.clusterMarkerPool) {
      handle.mapMarker.remove();
    }
    this.clusterMarkerPool.length = 0;
  }

  private updateEventMarkerHandle(handle: MarkerHandle, m: MapMarkerDto): void {
    handle.data = m;
    handle.mapMarker.setLngLat([m.longitude, m.latitude]);

    if (handle.isDot) {
      handle.clickEl.className = `event-map-marker-dot event-map-marker-dot--${m.visibility}`;
      applyEventMapMarkerPhaseClass(handle.clickEl, m.startsAt, m.endsAt);
      handle.clickEl.setAttribute('aria-label', `Ver evento: ${m.title}`);
      return;
    }

    handle.clickEl.className = `event-map-marker event-map-marker--${m.visibility}`;
    applyEventMapMarkerPhaseClass(handle.clickEl, m.startsAt, m.endsAt);
    handle.clickEl.setAttribute('aria-label', `Ver evento: ${m.title}`);
    const titleEl = handle.clickEl.querySelector('.event-map-marker__title');
    if (titleEl) {
      titleEl.textContent = m.title;
    }
    if (handle.timeEl) {
      handle.timeEl.textContent = this.markerTimeLabel(m);
    }
  }

  private updateClusterMarkerHandle(
    handle: ClusterMarkerHandle,
    item: Extract<VisibleMapMarker, { type: 'cluster' }>,
  ): void {
    handle.clusterId = item.clusterId;
    handle.eventIds = [...item.eventIds];
    handle.mapMarker.setLngLat([item.longitude, item.latitude]);
    const countEl = handle.mapMarker
      .getElement()
      .querySelector('.event-map-cluster__count');
    if (countEl) {
      countEl.textContent = String(item.count);
    }
  }

  private clearEventMarkers(): void {
    while (this.markerHandles.length > 0) {
      this.releaseEventMarkerHandle(this.markerHandles.pop()!);
    }
    while (this.clusterMarkerHandles.length > 0) {
      this.releaseClusterMarkerHandle(this.clusterMarkerHandles.pop()!);
    }
    this.drainMarkerPools();
    this.clearMarkerLabelSchedule();
    this.lastVisibleMarkersFingerprint = '';
    this.lastMarkerSyncCamera = null;
    if (this.map) {
      clearEventGlDotSource(this.map);
    }
  }

  private syncEventGlDotLayer(): void {
    if (!this.map) {
      return;
    }
    ensureEventGlDotLayer(this.map);
    updateEventGlDotSource(this.map, this.allMapMarkers);
    updateEventGlDotSelection(this.map, this.selectedEvent()?.id ?? null);
  }

  private clusterEventIdsKey(eventIds: number[]): string {
    return [...eventIds].sort((a, b) => a - b).join(',');
  }

  private updateVisibleMarkerPositions(displays: VisibleMapMarker[]): void {
    const eventById = new Map(
      this.markerHandles.map((handle) => [handle.data.id, handle]),
    );
    const clusterByKey = new Map(
      this.clusterMarkerHandles.map((handle) => [
        this.clusterEventIdsKey(handle.eventIds),
        handle,
      ]),
    );

    for (const item of displays) {
      if (item.type === 'cluster') {
        const handle = clusterByKey.get(this.clusterEventIdsKey(item.eventIds));
        handle?.mapMarker.setLngLat([item.longitude, item.latitude]);
      } else {
        const handle = eventById.get(item.marker.id);
        if (handle) {
          handle.mapMarker.setLngLat([item.marker.longitude, item.marker.latitude]);
        }
      }
    }
  }

  /**
   * Paso 3 — Diff: solo crea/libera lo que cambió respecto a la vista anterior.
   */
  private applyVisibleMarkersDiff(
    displays: VisibleMapMarker[],
    selectedId: number | null,
  ): void {
    const wantedClusters = new Map<
      string,
      Extract<VisibleMapMarker, { type: 'cluster' }>
    >();
    const wantedEvents: { marker: MapMarkerDto; isDot: boolean }[] = [];

    for (const item of displays) {
      if (item.type === 'cluster') {
        wantedClusters.set(this.clusterEventIdsKey(item.eventIds), item);
      } else {
        wantedEvents.push({
          marker: item.marker,
          isDot: item.displayStyle === 'dot',
        });
      }
    }

    const wantedEventIds = new Set(wantedEvents.map((e) => e.marker.id));

    for (let i = this.clusterMarkerHandles.length - 1; i >= 0; i--) {
      const handle = this.clusterMarkerHandles[i];
      const key = this.clusterEventIdsKey(handle.eventIds);
      if (!wantedClusters.has(key)) {
        this.clusterMarkerHandles.splice(i, 1);
        this.releaseClusterMarkerHandle(handle);
      }
    }

    const activeClusterByKey = new Map(
      this.clusterMarkerHandles.map((handle) => [
        this.clusterEventIdsKey(handle.eventIds),
        handle,
      ]),
    );

    for (const item of wantedClusters.values()) {
      const key = this.clusterEventIdsKey(item.eventIds);
      let handle = activeClusterByKey.get(key);
      if (!handle) {
        handle = this.acquireClusterMarkerHandle(item);
        this.clusterMarkerHandles.push(handle);
        activeClusterByKey.set(key, handle);
      } else {
        this.updateClusterMarkerHandle(handle, item);
      }
    }

    for (let i = this.markerHandles.length - 1; i >= 0; i--) {
      const handle = this.markerHandles[i];
      if (!wantedEventIds.has(handle.data.id)) {
        this.markerHandles.splice(i, 1);
        this.releaseEventMarkerHandle(handle);
      }
    }

    const activeEventById = new Map(
      this.markerHandles.map((handle) => [handle.data.id, handle]),
    );

    for (const { marker, isDot } of wantedEvents) {
      const existing = activeEventById.get(marker.id);

      if (existing) {
        if (existing.isDot !== isDot) {
          const index = this.markerHandles.indexOf(existing);
          if (index >= 0) {
            this.markerHandles.splice(index, 1);
          }
          this.releaseEventMarkerHandle(existing);
          const replacement = this.acquireEventMarkerHandle(marker, isDot);
          this.markerHandles.push(replacement);
          activeEventById.set(marker.id, replacement);
        } else {
          this.updateEventMarkerHandle(existing, marker);
        }
        continue;
      }

      const created = this.acquireEventMarkerHandle(marker, isDot);
      this.markerHandles.push(created);
      activeEventById.set(marker.id, created);
    }

    this.updateMarkerSelection(selectedId);
  }

  private clearClusterSyncTimer(): void {
    if (this.clusterSyncTimer !== null) {
      clearTimeout(this.clusterSyncTimer);
      this.clusterSyncTimer = null;
    }
  }

  /**
   * Congela la animación de flotación en cada marcador visible (no en el contenedor:
   * los Marker de MapLibre a veces no heredan bien el selector del padre).
   */
  private setMarkerFloatAnimationsPaused(paused: boolean): void {
    const markerRoots: HTMLElement[] = [
      ...this.markerHandles.map((h) => h.mapMarker.getElement()),
      ...this.clusterMarkerHandles.map((h) => h.mapMarker.getElement()),
    ];

    for (const root of markerRoots) {
      const floats = root.querySelectorAll<HTMLElement>(
        '.event-map-marker-float, .event-map-cluster-float',
      );
      for (const floatEl of floats) {
        floatEl.classList.toggle('map-marker-float--paused', paused);
        if (floatEl.classList.contains('event-map-marker-float')) {
          this.setEventMarkerFloatPaused(floatEl, paused);
        }
      }
    }
  }

  /** Carteles llevan `animation` inline; la pausa va por `animation-play-state`. */
  private setEventMarkerFloatPaused(floatEl: HTMLElement, paused: boolean): void {
    if (!floatEl.style.animation) {
      this.applyEventMarkerFloatAnimation(floatEl);
    }
    floatEl.style.animationPlayState = paused ? 'paused' : 'running';
  }

  private applyEventMarkerFloatAnimation(floatEl: HTMLElement): void {
    floatEl.classList.remove('map-marker-float--paused');
    floatEl.style.animation = EVENT_MARKER_FLOAT_ANIMATION;
    floatEl.style.animationPlayState = 'running';
  }

  private clearFloatAnimationInlineStyles(root: HTMLElement): void {
    const eventFloat = root.querySelector<HTMLElement>('.event-map-marker-float');
    if (eventFloat) {
      this.applyEventMarkerFloatAnimation(eventFloat);
      return;
    }
    const clusterFloat = root.querySelector<HTMLElement>('.event-map-cluster-float');
    clusterFloat?.classList.remove('map-marker-float--paused');
    clusterFloat?.style.removeProperty('animation-play-state');
  }

  private bindMarkerAnimationPause(map: maplibregl.Map): void {
    if (this.markerAnimationSyncBound) {
      return;
    }
    this.markerAnimationSyncBound = true;

    const onInteractionStart = (): void => {
      this.mapInteractionDepth += 1;
      if (this.mapInteractionDepth === 1) {
        this.setMarkerFloatAnimationsPaused(true);
      }
    };

    const onInteractionEnd = (): void => {
      this.mapInteractionDepth = Math.max(0, this.mapInteractionDepth - 1);
      if (this.mapInteractionDepth === 0) {
        this.setMarkerFloatAnimationsPaused(false);
      }
    };

    const startEvents = ['movestart', 'zoomstart', 'rotatestart', 'pitchstart'] as const;
    const endEvents = ['moveend', 'zoomend', 'rotateend', 'pitchend'] as const;

    for (const event of startEvents) {
      map.on(event, onInteractionStart);
    }
    for (const event of endEvents) {
      map.on(event, onInteractionEnd);
    }

    this.unbindMarkerAnimationSync = () => {
      for (const event of startEvents) {
        map.off(event, onInteractionStart);
      }
      for (const event of endEvents) {
        map.off(event, onInteractionEnd);
      }
      this.markerAnimationSyncBound = false;
      this.mapInteractionDepth = 0;
      this.setMarkerFloatAnimationsPaused(false);
    };

    this.destroyRef.onDestroy(() => this.unbindMarkerAnimationSync?.());
  }

  private bindClusterSync(map: maplibregl.Map): void {
    if (this.clusterSyncBound) {
      return;
    }
    this.clusterSyncBound = true;
    const schedule = () => this.scheduleClusterSync();
    const scheduleForced = () => this.scheduleClusterSync(true);
    map.on('moveend', schedule);
    map.on('zoomend', schedule);
    map.on('rotateend', schedule);
    map.on('pitchend', schedule);
    map.on('resize', scheduleForced);
    this.destroyRef.onDestroy(() => {
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
      map.off('rotateend', schedule);
      map.off('pitchend', schedule);
      map.off('resize', scheduleForced);
      this.clearClusterSyncTimer();
      this.clusterSyncBound = false;
    });
  }

  /**
   * Sincroniza marcadores HTML fuera de NgZone: solo toca DOM/MapLibre,
   * no hay bindings de plantilla que actualizar.
   */
  private runVisibleMarkerSyncOutsideAngular(): void {
    this.ngZone.runOutsideAngular(() => this.syncVisibleMarkers());
  }

  private scheduleClusterSync(force = false): void {
    this.clearClusterSyncTimer();
    this.clusterSyncTimer = setTimeout(() => {
      this.clusterSyncTimer = null;
      if (!this.map || this.allMapMarkers.length === 0) {
        return;
      }
      if (
        !force &&
        !shouldRunMarkerSync(this.map, this.lastMarkerSyncCamera)
      ) {
        return;
      }
      this.runVisibleMarkerSyncOutsideAngular();
    }, 80);
  }

  /** Espera a que el mapa tenga tamaño y bounds válidos antes del primer cluster. */
  private scheduleVisibleMarkersAfterMapReady(map: maplibregl.Map): void {
    const run = () => this.runVisibleMarkerSyncOutsideAngular();
    if (map.loaded()) {
      map.once('idle', run);
      requestAnimationFrame(run);
    } else {
      map.once('load', () => map.once('idle', run));
    }
  }

  private syncVisibleMarkers(): void {
    if (!this.map || this.allMapMarkers.length === 0) {
      if (this.map) {
        clearEventGlDotSource(this.map);
      }
      return;
    }

    const glDotsActive = usesGlDotLayer(this.map.getZoom());
    this.syncEventGlDotLayer();

    const selectedId = this.selectedEvent()?.id ?? null;
    const { displays } = clusterMarkersForMapView(
      this.map,
      this.allMapMarkers,
      DEFAULT_SCREEN_CLUSTER_CONFIG,
      1,
      { htmlDots: !glDotsActive },
    );
    const fingerprint = visibleMarkersDisplayFingerprint(
      displays,
      glDotsActive,
    );

    if (
      fingerprint === this.lastVisibleMarkersFingerprint &&
      (glDotsActive ||
        this.markerHandles.length > 0 ||
        this.clusterMarkerHandles.length > 0)
    ) {
      this.updateVisibleMarkerPositions(displays);
      this.updateMarkerSelection(selectedId);
      this.lastMarkerSyncCamera = captureMarkerSyncCamera(this.map);
      return;
    }

    this.lastVisibleMarkersFingerprint = fingerprint;
    this.applyVisibleMarkersDiff(displays, selectedId);
    this.scheduleMarkerStateRefresh();
    this.lastMarkerSyncCamera = captureMarkerSyncCamera(this.map);
  }

  private openClusterPanel(clusterId: number, eventIds: number[]): void {
    const events = markersFromClusterMembers(eventIds, this.markersById);
    if (events.length === 0) {
      return;
    }
    this.closeDetail();
    this.clusterPanelEvents.set(events);
    this.cdr.markForCheck();
  }

  private addEventMarkers(map: maplibregl.Map): void {
    this.eventsService.getMapMarkers().subscribe({
      next: (markers) => {
        this.markMapMarkersFetched();
        this.clearEventMarkers();
        this.closeClusterPanel();

        if (!this.openingEventFromList && !this.selectedEvent()) {
          this.closeDetail();
        }

        this.allMapMarkers = markers;
        this.markersById = buildMarkersById(markers);
        this.bindClusterSync(map);
        this.scheduleVisibleMarkersAfterMapReady(map);

        this.tryOpenPendingEvent();
      },

      error: (err) => {
        this.markMapMarkersFetched();
        this.clearEventMarkers();
        this.allMapMarkers = [];
        this.markersById.clear();
        this.closeClusterPanel();
        this.closeDetail();
        console.warn('No se pudieron cargar los eventos en el mapa:', err);
      },
    });
  }



  private initializeMap(): void {
    const preference = this.mapTheme.themePreference();
    const initialTheme = this.mapTheme.resolveTheme(preference);
    this.activeVisualTheme.set(initialTheme);

    const initialUrl = mapStyleUrlForTheme(initialTheme);
    this.activeStyleUrl = initialUrl;

    const initialCenter =
      this.pendingInitialCenter ?? MapComponent.DEFAULT_MAP_CENTER;

    const map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: initialUrl,
      center: initialCenter,
      zoom: MapComponent.DEFAULT_MAP_ZOOM,
      pitch: 62,
      bearing: -20,
      minPitch: 0,
      /** Solo un poco de horizonte; por encima los marcadores HTML parecen flotar en el cielo. */
      maxPitch: 68,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      touchZoomRotate: true,
      bearingSnap: 0,
      attributionControl: false,
    });

    this.bindStyleImageFallback(map);
    this.bindStyleLifecycle(map);



    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: false,
        visualizePitch: false,
      }),
      'bottom-right',
    );



    map.on('load', () => {
      this.mapReady = true;
      this.unbindMap3dSync?.();
      this.unbindMap3dSync = bindMap3DBuildingsSync(map, () =>
        this.activeVisualTheme(),
      );
      this.bindMarkerAnimationPause(map);
      this.unbindGlDotInteractions?.();
      this.unbindGlDotInteractions = bindEventGlDotLayerInteractions(map, {
        onClick: (eventId) => {
          this.ngZone.run(() => {
            const marker = this.markersById.get(eventId);
            if (marker) {
              this.selectEvent(marker);
            }
          });
        },
      });
      this.addEventMarkers(map);
      this.tryOpenPendingEvent();
      this.resetAutoThemeSchedule();
      this.applyInitialUserLocation();
      this.bindUserLocationVisualSync(map);
    });



    map.on('click', (e) => {
      const hitGlDot = map.queryRenderedFeatures(e.point, {
        layers: [UGR_EVENTS_GL_LAYER_ID],
      });
      if (hitGlDot.length > 0) {
        return;
      }
      this.ngZone.run(() => {
        this.closeClusterPanel();
        this.closeDetail();
      });
    });



    this.map = map;

  }

  private prefetchUserLocationForMapInit(): void {
    if (!('geolocation' in navigator)) {
      this.initialGeolocationFailed = true;
      return;
    }

    this.initialGeolocationRequested = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const center: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          this.pendingInitialCenter = center;
          if (this.map && this.mapReady) {
            this.applyUserLocationCenter(center, false, position.coords.accuracy);
          }
        });
      },
      () => {
        this.ngZone.run(() => {
          this.initialGeolocationFailed = true;
        });
      },
      MapComponent.GEOLOCATION_OPTIONS,
    );
  }

  private applyInitialUserLocation(): void {
    if (this.initialUserCenterApplied) {
      return;
    }

    if (this.pendingInitialCenter) {
      this.applyUserLocationCenter(this.pendingInitialCenter, false);
      return;
    }

    if (
      this.initialGeolocationFailed ||
      !('geolocation' in navigator)
    ) {
      this.initialUserCenterApplied = true;
      return;
    }

    if (!this.initialGeolocationRequested) {
      this.centerOnUserLocation({ animate: false, markInitial: true });
    }
  }

  private centerOnUserLocation(options: {
    animate?: boolean;
    markInitial?: boolean;
  } = {}): void {
    const animate = options.animate ?? false;

    if (!this.map || this.locatingUser()) {
      return;
    }
    if (!('geolocation' in navigator)) {
      return;
    }

    this.locatingUser.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const center: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          this.pendingInitialCenter = center;
          this.applyUserLocationCenter(center, animate, position.coords.accuracy);
          if (options.markInitial) {
            this.initialUserCenterApplied = true;
          }
          this.locatingUser.set(false);
          this.cdr.markForCheck();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          console.warn('No se pudo obtener tu ubicación:', error.message);
          if (options.markInitial) {
            this.initialUserCenterApplied = true;
          }
          this.locatingUser.set(false);
          this.cdr.markForCheck();
        });
      },
      MapComponent.GEOLOCATION_OPTIONS,
    );
  }

  private applyUserLocationCenter(
    center: [number, number],
    animate: boolean,
    accuracyMeters?: number,
  ): void {
    if (!this.map) {
      return;
    }

    const [lng, lat] = center;
    this.setUserLocationMarker(this.map, lng, lat, accuracyMeters);
    const zoom = Math.max(this.map.getZoom(), MapComponent.DEFAULT_MAP_ZOOM);

    if (animate) {
      this.map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true,
      });
    } else {
      this.map.jumpTo({ center: [lng, lat], zoom });
    }

    this.initialUserCenterApplied = true;
  }

  private setUserLocationMarker(
    map: maplibregl.Map,
    lng: number,
    lat: number,
    accuracyMeters?: number,
  ): void {
    const lngLat: [number, number] = [lng, lat];

    if (this.userLocationMarker) {
      this.userLocationMarker.setLngLat(lngLat);
      updateUserLocationAccuracyRing(
        this.userLocationMarker.getElement(),
        accuracyMeters,
      );
    } else {
      const element = createUserLocationMarkerElement();
      updateUserLocationAccuracyRing(element, accuracyMeters);

      this.userLocationMarker = new maplibregl.Marker({
        element,
        anchor: 'center',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat(lngLat)
        .addTo(map);
    }

    if (this.userLocationGroundMarker) {
      this.userLocationGroundMarker.setLngLat(lngLat);
    } else {
      this.userLocationGroundMarker = new maplibregl.Marker({
        element: createUserLocationGroundElement(),
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'map',
      })
        .setLngLat(lngLat)
        .addTo(map);
    }

    this.refreshUserLocationMarkerVisual();
  }

  private bindUserLocationVisualSync(map: maplibregl.Map): void {
    this.unbindUserLocationVisualSync?.();
    const sync = () => this.refreshUserLocationMarkerVisual();
    const events = ['moveend', 'zoomend', 'pitchend', 'rotateend'] as const;

    for (const event of events) {
      map.on(event, sync);
    }
    sync();

    this.unbindUserLocationVisualSync = () => {
      for (const event of events) {
        map.off(event, sync);
      }
    };
  }

  private refreshUserLocationMarkerVisual(): void {
    if (!this.map || !this.userLocationMarker) {
      return;
    }
    syncUserLocationMarkerVisual(
      this.map,
      this.userLocationMarker.getElement(),
      this.userLocationGroundMarker,
    );
  }

  private bindStyleImageFallback(map: maplibregl.Map): void {
    map.on('styleimagemissing', (e) => {
      const emptyImage = new Uint8Array(4);
      map.addImage(e.id, { width: 1, height: 1, data: emptyImage });
    });
  }

  private clearAutoThemeSchedule(): void {
    if (this.autoThemeTimer !== null) {
      clearTimeout(this.autoThemeTimer);
      this.autoThemeTimer = null;
    }
  }

  /** Programa el siguiente cambio de tema Auto (5:30, 7:00, 19:00, 21:00). */
  private scheduleAutoThemeSync(): void {
    this.clearAutoThemeSchedule();
    if (this.mapTheme.themePreference() !== 'auto' || !this.map) {
      return;
    }

    const delay = msUntilNextAutoThemeBoundary();
    this.autoThemeTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.syncAutoMapThemeIfNeeded();
        this.scheduleAutoThemeSync();
      });
    }, delay);
  }

  private resetAutoThemeSchedule(): void {
    this.clearAutoThemeSchedule();
    if (this.mapTheme.themePreference() !== 'auto' || !this.map) {
      return;
    }
    this.syncAutoMapThemeIfNeeded();
    this.scheduleAutoThemeSync();
  }

  private syncAutoMapThemeIfNeeded(): void {
    if (this.mapTheme.themePreference() !== 'auto' || !this.map) {
      return;
    }
    const theme = resolveVisualTheme('auto');
    const url = mapStyleUrlForTheme(theme);
    if (url === this.activeStyleUrl && theme === this.activeVisualTheme()) {
      return;
    }
    this.applyMapStyleUrl(url, theme);
  }

  private applyMapTheme(theme: MapVisualTheme): void {
    this.applyMapStyleUrl(mapStyleUrlForTheme(theme), theme);
  }

  private applyMapStyleUrl(url: string, theme: MapVisualTheme): void {
    if (!this.map) {
      return;
    }
    if (url === this.activeStyleUrl && theme === this.activeVisualTheme()) {
      return;
    }

    const urlChanged = url !== this.activeStyleUrl;
    this.activeStyleUrl = url;
    this.activeVisualTheme.set(theme);

    if (urlChanged) {
      this.map.setStyle(url);
    } else {
      this.applyVisualThemeTreatments(this.map);
    }
  }

  private applyVisualThemeTreatments(map: maplibregl.Map): void {
    const theme = this.activeVisualTheme();
    applyMapLandcoverTheme(map, theme);
    syncMap3DBuildings(map, theme);
    applyMapAtmosphere(map, theme);
    ensureEventGlDotLayer(map);
    if (this.allMapMarkers.length > 0) {
      updateEventGlDotSource(map, this.allMapMarkers);
      updateEventGlDotSelection(map, this.selectedEvent()?.id ?? null);
    }
    this.ngZone.run(() => this.cdr.markForCheck());
  }

  private bindStyleLifecycle(map: maplibregl.Map): void {
    map.on('style.load', () => {
      this.applyVisualThemeTreatments(map);
      map.once('idle', () => {
        this.applyVisualThemeTreatments(map);
        if (this.allMapMarkers.length > 0) {
          this.runVisibleMarkerSyncOutsideAngular();
        }
      });
    });

    map.on('load', () => this.applyVisualThemeTreatments(map));
  }
}


