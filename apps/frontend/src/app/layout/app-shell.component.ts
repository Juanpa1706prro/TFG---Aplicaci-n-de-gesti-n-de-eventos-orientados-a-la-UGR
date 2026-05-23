import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { MapComponent } from '@features/map/map';
import { GlobalCapability, SystemRole } from '@core/constants/user-enums';
import { FullUserPayload, UserProfileDetails } from '@core/interfaces/user.profile-interface';
import { API_BASE_URL } from '@core/config/api.config';
import { UserSession } from '@core/interfaces/user-interface';
import {
  canOpenAdminSidebar,
  isElevatedSystemRole,
  systemRoleLabel,
} from '@core/utils/system-role-display.utils';
import { ADMIN_SIDEBAR_MENU_ITEMS } from './admin-sidebar-menu.config';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MapComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent implements OnInit {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly shellUi = inject(ShellUiService);
  readonly adminMenuItems = ADMIN_SIDEBAR_MENU_ITEMS;

  user: UserSession | null = null;
  profile: UserProfileDetails | null = null;

  /** Pantallas de formulario/overlay: el mapa de fondo no debe capturar ratón. */
  readonly blocksMapInteraction = signal(false);

  ngOnInit(): void {
    this.blocksMapInteraction.set(this.urlBlocksMap(this.router.url));
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((url) => this.blocksMapInteraction.set(this.urlBlocksMap(url)));

    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;
      });

    this.http
      .get<{ user: FullUserPayload }>(`${this.API_URL}/user/profile`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.profile = res.user.profile;
        },
        error: () => {
          this.profile = null;
        },
      });
  }

  get username(): string {
    if (this.profile?.userName?.trim()) {
      return this.profile.userName.trim();
    }
    return this.user?.email.split('@')[0] ?? 'Usuario';
  }

  get avatarInitials(): string {
    return this.username.slice(0, 2).toUpperCase();
  }

  get canCreateEvents(): boolean {
    return (
      this.user?.globalCapabilities.includes(
        GlobalCapability.CREATE_AND_MANAGE_OWN_EVENTS,
      ) === true
    );
  }

  get showOperatorRoleEntry(): boolean {
    return isElevatedSystemRole(this.user?.role);
  }

  get operatorRoleLabel(): string {
    return systemRoleLabel(this.user?.role);
  }

  get isAdminRole(): boolean {
    return this.user?.role === SystemRole.ADMIN;
  }

  get sidebarAriaLabel(): string {
    switch (this.shellUi.sidebarView()) {
      case 'settings':
        return 'Configuración';
      case 'admin':
        return 'Administración';
      default:
        return 'Navegación principal';
    }
  }

  toggleSidebar(): void {
    this.shellUi.toggleSidebar();
  }

  closeSidebar(): void {
    this.shellUi.closeSidebar();
  }

  openSettingsSidebar(): void {
    this.shellUi.openSettingsSidebar();
  }

  onOperatorRoleClick(): void {
    if (!canOpenAdminSidebar(this.user?.role)) {
      return;
    }
    this.shellUi.openAdminSidebar();
  }

  backToMainSidebar(): void {
    this.shellUi.backToMainSidebar();
  }

  logout(): void {
    void this.auth.logout().subscribe();
  }

  private urlBlocksMap(url: string): boolean {
    return (
      /\/events\/new(\/|$)/.test(url) ||
      /\/profile(\/|$)/.test(url) ||
      /\/account(\/|$)/.test(url)
    );
  }
}
