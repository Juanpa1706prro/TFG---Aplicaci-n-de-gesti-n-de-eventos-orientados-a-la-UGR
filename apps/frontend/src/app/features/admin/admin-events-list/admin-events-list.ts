import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminEventsService } from '@core/services/admin-events.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import {
  AdminEventListItem,
  AdminEventsSortField,
  AdminEventsSortOrder,
  AdminEventsStatusFilter,
} from '@core/interfaces/admin-event.interface';
import { EventVisibility } from '@core/constants/event-enums';
import { eventTimeDisplayText } from '@core/utils/event-time.utils';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-events-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-events-list.html',
  styleUrl: './admin-events-list.css',
})
export class AdminEventsListComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollRoot') scrollRoot?: ElementRef<HTMLElement>;
  @ViewChild('loadMoreSentinel') loadMoreSentinel?: ElementRef<HTMLElement>;

  private readonly adminEvents = inject(AdminEventsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly search$ = new Subject<string>();
  private nextPage = 0;
  private listFetchGen = 0;
  private loadMoreObserver: IntersectionObserver | null = null;
  private readonly nowMs = signal(Date.now());

  readonly events = signal<AdminEventListItem[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly loadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly hasMore = signal(false);

  searchQuery = '';
  sortField: AdminEventsSortField = 'createdAt';
  sortOrder: AdminEventsSortOrder = 'desc';
  statusFilter: AdminEventsStatusFilter = 'all';
  includeDeleted = false;

  ngOnInit(): void {
    this.shellUi.closeSidebar();
    this.nowMs.set(Date.now());

    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadList());

    this.reloadList();
  }

  ngAfterViewInit(): void {
    this.setupLoadMoreObserver();
  }

  onSearchInput(): void {
    this.search$.next(this.searchQuery.trim());
  }

  onFiltersChange(): void {
    this.reloadList();
  }

  closePage(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
    this.shellUi.openSidebar();
  }

  openEvent(event: AdminEventListItem): void {
    const sessionNumber = this.auth.currentUserValue?.userNumber;
    if (sessionNumber == null) {
      return;
    }
    this.shellUi.closeSidebar();
    void this.router.navigate([
      '/u',
      sessionNumber,
      'admin',
      'events',
      event.id,
    ]);
  }

  eventTimeLabel(event: AdminEventListItem): string {
    return eventTimeDisplayText(event.startsAt, event.endsAt, this.nowMs());
  }

  visibilityLabel(v: EventVisibility): string {
    return v === EventVisibility.PRIVATE ? 'Privado' : 'Público';
  }

  statusBadge(event: AdminEventListItem): string {
    if (event.deletedAt) {
      return 'Eliminado';
    }
    if (event.finished) {
      return 'Terminado';
    }
    return 'En curso';
  }

  formatCreatedAt(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  private reloadList(): void {
    this.nextPage = 0;
    this.hasMore.set(false);
    this.loadError.set(null);
    this.nowMs.set(Date.now());
    const fetchGen = ++this.listFetchGen;
    if (this.events().length === 0) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }
    this.fetchPage(true, fetchGen);
  }

  private fetchPage(resetScroll: boolean, fetchGen?: number): void {
    const page = this.nextPage;
    const gen = fetchGen ?? this.listFetchGen;
    const loadingMore = page > 0;
    if (loadingMore) {
      this.loadingMore.set(true);
    }

    this.adminEvents
      .listEvents({
        page,
        limit: PAGE_SIZE,
        sort: this.sortField,
        order: this.sortOrder,
        status: this.statusFilter,
        includeDeleted: this.includeDeleted,
        q: this.searchQuery.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (gen !== this.listFetchGen) {
            return;
          }
          if (page === 0) {
            this.events.set(res.items);
          } else {
            this.events.update((prev) => [...prev, ...res.items]);
          }
          this.hasMore.set(res.hasMore);
          this.nextPage = page + 1;
          this.loading.set(false);
          this.refreshing.set(false);
          this.loadingMore.set(false);
          this.loadError.set(null);
          if (resetScroll && this.scrollRoot?.nativeElement) {
            this.scrollRoot.nativeElement.scrollTop = 0;
          }
          queueMicrotask(() => this.setupLoadMoreObserver());
        },
        error: (err: { status?: number }) => {
          if (gen !== this.listFetchGen) {
            return;
          }
          this.loading.set(false);
          this.refreshing.set(false);
          this.loadingMore.set(false);
          if (page === 0) {
            if (err.status === 403) {
              this.loadError.set('No tienes permisos para ver eventos.');
            } else {
              this.loadError.set('No se pudieron cargar los eventos.');
            }
          }
        },
      });
  }

  private setupLoadMoreObserver(): void {
    this.loadMoreObserver?.disconnect();
    const root = this.scrollRoot?.nativeElement;
    const sentinel = this.loadMoreSentinel?.nativeElement;
    if (!root || !sentinel) {
      return;
    }

    this.loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((e) => e.isIntersecting) &&
          this.hasMore() &&
          !this.loading() &&
          !this.loadingMore() &&
          !this.refreshing()
        ) {
          this.fetchPage(false);
        }
      },
      { root, rootMargin: '120px', threshold: 0 },
    );
    this.loadMoreObserver.observe(sentinel);
  }
}
