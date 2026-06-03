import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  AfterViewInit,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminUsersService } from '@core/services/admin-users.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import {
  AdminUserListItem,
  AdminUsersSortField,
  AdminUsersSortOrder,
} from '@core/interfaces/admin-user.interface';
import { SystemRole } from '@core/constants/user-enums';
import { systemRoleLabel } from '@core/utils/system-role-display.utils';
import { adminUserPhotoUrl } from '@core/utils/image-api.util';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users-list.html',
  styleUrl: './admin-users-list.css',
})
export class AdminUsersListComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollRoot') scrollRoot?: ElementRef<HTMLElement>;
  @ViewChild('loadMoreSentinel') loadMoreSentinel?: ElementRef<HTMLElement>;

  private readonly adminUsers = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly search$ = new Subject<string>();
  private nextPage = 0;
  private listFetchGen = 0;
  private loadMoreObserver: IntersectionObserver | null = null;

  readonly users = signal<AdminUserListItem[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly loadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly hasMore = signal(false);

  searchQuery = '';
  sortField: AdminUsersSortField = 'createdAt';
  sortOrder: AdminUsersSortOrder = 'desc';

  ngOnInit(): void {
    this.shellUi.closeSidebar();

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

  onSortChange(): void {
    this.reloadList();
  }

  closePage(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
    this.shellUi.openSidebar();
  }

  openUser(user: AdminUserListItem): void {
    const sessionNumber = this.auth.currentUserValue?.userNumber;
    if (sessionNumber == null) {
      return;
    }
    this.shellUi.closeSidebar();
    void this.router.navigate([
      '/u',
      sessionNumber,
      'admin',
      'users',
      user.userNumber,
    ]);
  }

  displayName(user: AdminUserListItem): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return user.userName?.trim() || `Usuario #${user.userNumber}`;
  }

  roleLabel(role: SystemRole): string {
    return systemRoleLabel(role);
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
    const fetchGen = ++this.listFetchGen;
    if (this.users().length === 0) {
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

    this.adminUsers
      .listUsers({
        page,
        limit: PAGE_SIZE,
        sort: this.sortField,
        order: this.sortOrder,
        q: this.searchQuery.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (gen !== this.listFetchGen) {
            return;
          }
          if (page === 0) {
            this.users.set(res.items);
          } else {
            this.users.update((prev) => [...prev, ...res.items]);
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
              this.loadError.set('No tienes permisos para ver usuarios.');
            } else if (err.status === 404) {
              this.loadError.set(
                'No se encontró el servicio de administración. Reinicia el frontend tras actualizar el proxy.',
              );
            } else {
              this.loadError.set('No se pudieron cargar los usuarios.');
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
          !this.loadingMore()
        ) {
          this.fetchPage(false);
        }
      },
      { root, rootMargin: '120px', threshold: 0 },
    );
    this.loadMoreObserver.observe(sentinel);
  }

  userPhotoSrc(userNumber: number): string {
    return adminUserPhotoUrl(userNumber);
  }
}
