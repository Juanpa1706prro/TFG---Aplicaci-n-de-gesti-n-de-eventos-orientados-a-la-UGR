import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { GlobalCapability } from '@core/constants/user-enums';
import { FullUserPayload, UserProfileDetails } from '@core/interfaces/user.profile-interface';
import { API_BASE_URL } from '@core/config/api.config';
import { UserSession } from '@core/interfaces/user-interface';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent implements OnInit {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly shellUi = inject(ShellUiService);

  user: UserSession | null = null;
  profile: UserProfileDetails | null = null;

  ngOnInit(): void {
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

  toggleSidebar(): void {
    this.shellUi.toggleSidebar();
  }

  closeSidebar(): void {
    this.shellUi.closeSidebar();
  }

  logout(): void {
    void this.auth.logout().subscribe();
  }
}
