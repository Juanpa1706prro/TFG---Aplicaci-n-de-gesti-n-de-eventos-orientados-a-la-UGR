import { Injectable, signal } from '@angular/core';

export type SidebarView = 'main' | 'settings' | 'admin';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  readonly sidebarOpen = signal(false);
  readonly sidebarView = signal<SidebarView>('main');

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  openSettingsSidebar(): void {
    this.sidebarView.set('settings');
    this.sidebarOpen.set(true);
  }

  openAdminSidebar(): void {
    this.sidebarView.set('admin');
    this.sidebarOpen.set(true);
  }

  backToMainSidebar(): void {
    this.sidebarView.set('main');
  }

  readonly assistantOpen = signal(false);

  openAssistant(): void {
    this.assistantOpen.set(true);
  }

  closeAssistant(): void {
    this.assistantOpen.set(false);
  }

  toggleAssistant(): void {
    this.assistantOpen.update((open) => !open);
  }

  /** Incremented when map markers should reload (mutations, assistant, admin, etc.). */
  readonly mapRefreshTick = signal(0);

  requestMapRefresh(): void {
    this.mapRefreshTick.update((tick) => tick + 1);
  }

  readonly notificationsOpen = signal(false);

  openNotifications(): void {
    this.notificationsOpen.set(true);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
  }

  /** Incremented when notification badge/list should reload. */
  readonly notificationRefreshTick = signal(0);

  requestNotificationRefresh(): void {
    this.notificationRefreshTick.update((tick) => tick + 1);
  }
}
