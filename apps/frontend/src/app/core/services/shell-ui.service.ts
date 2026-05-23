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
}
