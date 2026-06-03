import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, tap } from 'rxjs';
import { AdminUsersService } from '@core/services/admin-users.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { AdminUserDetail } from '@core/interfaces/admin-user.interface';
import { SystemRole } from '@core/constants/user-enums';
import { systemRoleLabel } from '@core/utils/system-role-display.utils';
import { adminUserPhotoUrl } from '@core/utils/image-api.util';

@Component({
  selector: 'app-admin-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-user-profile.html',
  styleUrl: './admin-user-profile.css',
})
export class AdminUserProfileComponent implements OnInit {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<AdminUserDetail | null>(null);
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
        map((params) => params.get('viewUserNumber')),
        filter((n): n is string => !!n),
        map((n) => parseInt(n, 10)),
        filter((n) => !Number.isNaN(n)),
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
          this.user.set(null);
        }),
        switchMap((userNumber) => this.adminUsers.getUser(userNumber)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          this.user.set(detail);
          this.loading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.user.set(null);
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  get editLink(): (string | number)[] | null {
    const session = this.sessionUserNumber;
    const viewed = this.user()?.userNumber;
    if (session == null || viewed == null) {
      return null;
    }
    return ['/u', session, 'admin', 'users', viewed, 'edit'];
  }

  get listLink(): (string | number)[] | null {
    if (this.sessionUserNumber == null) {
      return null;
    }
    return ['/u', this.sessionUserNumber, 'admin', 'users'];
  }

  displayName(): string {
    const u = this.user();
    if (!u) {
      return '';
    }
    const parts = [u.firstName, u.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return u.userName?.trim() || `Usuario #${u.userNumber}`;
  }

  roleLabel(role: SystemRole): string {
    return systemRoleLabel(role);
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
    const u = this.user();
    if (!u || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.adminUsers
      .deleteUser(u.userNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.showDeleteConfirm.set(false);
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
                : 'No se pudo eliminar el usuario.',
          );
        },
      });
  }

  userPhotoSrc(userNumber: number): string {
    return adminUserPhotoUrl(userNumber);
  }
}
