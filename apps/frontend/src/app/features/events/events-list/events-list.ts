import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { EventsService } from '@core/services/events.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import {
  EventListItemDto,
  EventManagementRole,
} from '@core/interfaces/event-interface';
import { EventVisibility } from '@core/constants/event-enums';
import { eventTimeDisplayText } from '@core/utils/event-time.utils';

type EventsTab = 'active' | 'attended' | 'managed';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './events-list.html',
  styleUrl: './events-list.css',
})
export class EventsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(EventsService);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<EventsTab>('active');
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly activeEvents = signal<EventListItemDto[]>([]);
  readonly attendedEvents = signal<EventListItemDto[]>([]);
  readonly managedEvents = signal<EventListItemDto[]>([]);

  nowMs = Date.now();

  ngOnInit(): void {
    this.shellUi.closeSidebar();

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.nowMs = Date.now();
      });

    this.eventsService
      .getMyEventLists()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lists) => {
          this.activeEvents.set(lists.active);
          this.attendedEvents.set(lists.attended);
          this.managedEvents.set(lists.managed);
          this.loading.set(false);
          this.loadError.set(null);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('No se pudieron cargar los eventos.');
        },
      });
  }

  get showManagedTab(): boolean {
    return this.managedEvents().length > 0;
  }

  get currentList(): EventListItemDto[] {
    switch (this.activeTab()) {
      case 'attended':
        return this.attendedEvents();
      case 'managed':
        return this.managedEvents();
      default:
        return this.activeEvents();
    }
  }

  setTab(tab: EventsTab): void {
    if (tab === 'managed' && !this.showManagedTab) {
      return;
    }
    this.activeTab.set(tab);
  }

  closePage(): void {
    this.navigateToMap();
    this.shellUi.openSidebar();
  }

  openEventOnMap(item: EventListItemDto): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber == null) {
      return;
    }
    this.shellUi.closeSidebar();
    void this.router.navigate(['/u', userNumber, 'map'], {
      queryParams: { event: item.id },
    });
  }

  private navigateToMap(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
  }

  timeLabel(item: EventListItemDto): string {
    return eventTimeDisplayText(item.startsAt, item.endsAt, this.nowMs);
  }

  visibilityLabel(visibility: EventVisibility): string {
    return visibility === EventVisibility.PRIVATE ? 'Privado' : 'Público';
  }

  managementRoleLabel(role: EventManagementRole): string {
    switch (role) {
      case 'creator':
        return 'Creador';
      case 'editor':
        return 'Editor';
      case 'moderator':
        return 'Moderador';
      default:
        return role;
    }
  }

  hasPhoto(url: string | null | undefined): boolean {
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
}
