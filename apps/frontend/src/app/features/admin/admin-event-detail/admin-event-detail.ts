import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, tap } from 'rxjs';
import { AdminEventsService } from '@core/services/admin-events.service';
import { ShellUiService } from '@core/services/shell-ui.service';
import { AdminEventDetail } from '@core/interfaces/admin-event.interface';
import { EventVisibility } from '@core/constants/event-enums';
import { eventTimeDisplayText } from '@core/utils/event-time.utils';
import { adminEventPhotoUrl } from '@core/utils/image-api.util';

@Component({
  selector: 'app-admin-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-event-detail.html',
  styleUrl: './admin-event-detail.css',
})
export class AdminEventDetailComponent implements OnInit {
  private readonly adminEvents = inject(AdminEventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = signal<AdminEventDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly showDeleteConfirm = signal(false);

  private sessionUserNumber: number | null = null;

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
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
          this.event.set(null);
        }),
        switchMap((eventId) => this.adminEvents.getEvent(eventId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          this.event.set(detail);
          this.loading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.event.set(null);
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  get editLink(): (string | number)[] | null {
    const session = this.sessionUserNumber;
    const id = this.event()?.id;
    if (session == null || id == null) {
      return null;
    }
    return ['/u', session, 'admin', 'events', id, 'edit'];
  }

  get listLink(): (string | number)[] | null {
    if (this.sessionUserNumber == null) {
      return null;
    }
    return ['/u', this.sessionUserNumber, 'admin', 'events'];
  }

  eventTimeLabel(): string {
    const e = this.event();
    if (!e) {
      return '';
    }
    return eventTimeDisplayText(e.startsAt, e.endsAt, Date.now());
  }

  visibilityLabel(v: EventVisibility): string {
    return v === EventVisibility.PRIVATE ? 'Reunión' : 'Evento público';
  }

  formatDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  closeToList(): void {
    const link = this.listLink;
    if (link) {
      void this.router.navigate(link);
    }
  }

  closeToMap(): void {
    if (this.sessionUserNumber != null) {
      void this.router.navigate(['/u', this.sessionUserNumber, 'map']);
    }
  }

  openDeleteConfirm(): void {
    this.deleteError.set(null);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    if (this.deleting()) {
      return;
    }
    this.showDeleteConfirm.set(false);
  }

  confirmDelete(): void {
    const e = this.event();
    if (!e || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.adminEvents
      .deleteEvent(e.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.showDeleteConfirm.set(false);
          this.shellUi.requestMapRefresh();
          this.closeToList();
        },
        error: (err) => {
          this.deleting.set(false);
          const body = (err as { error?: { message?: string | string[] } })?.error
            ?.message;
          this.deleteError.set(
            Array.isArray(body)
              ? body.join(' ')
              : typeof body === 'string' && body.trim()
                ? body
                : 'No se pudo eliminar el evento.',
          );
        },
      });
  }

  eventPhotoSrc(eventId: number): string {
    return adminEventPhotoUrl(eventId);
  }
}
