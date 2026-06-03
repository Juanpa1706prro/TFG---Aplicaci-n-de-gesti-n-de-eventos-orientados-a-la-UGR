import {
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { NotificationsService } from '@core/services/notifications.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import { NotificationItemDto, NotificationType } from '@core/interfaces/notification-interface';
import {
  notificationMessage,
  notificationRelativeTime,
} from '@core/utils/notification-display.utils';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-panel.component.html',
  styleUrl: './notifications-panel.component.css',
})
export class NotificationsPanelComponent {
  private readonly notificationsService = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly shellUi = inject(ShellUiService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly items = signal<NotificationItemDto[]>([]);
  readonly openingId = signal<number | null>(null);

  nowMs = Date.now();

  constructor() {
    effect(() => {
      if (this.shellUi.notificationsOpen()) {
        this.loadList();
      }
    });

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.nowMs = Date.now();
      });
  }

  close(): void {
    this.shellUi.closeNotifications();
  }

  message(item: NotificationItemDto): string {
    return notificationMessage(item);
  }

  timeLabel(item: NotificationItemDto): string {
    return notificationRelativeTime(item.createdAt, this.nowMs);
  }

  isUnread(item: NotificationItemDto): boolean {
    return item.readAt == null;
  }

  openNotification(item: NotificationItemDto): void {
    if (this.openingId() != null) {
      return;
    }

    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber == null) {
      return;
    }

    this.openingId.set(item.id);

    this.notificationsService.markAsRead(item.id).subscribe({
      next: () => {
        this.openingId.set(null);
        this.shellUi.requestNotificationRefresh();
        this.shellUi.closeNotifications();

        if (item.type === NotificationType.FRIEND_REQUEST) {
          void this.router.navigate(['/u', userNumber, 'map', 'friends'], {
            queryParams: { tab: 'requests' },
          });
          return;
        }

        if (item.event) {
          void this.router.navigate(['/u', userNumber, 'map'], {
            queryParams: { event: item.event.id },
          });
          this.shellUi.requestMapRefresh();
          this.notificationsService.markReadByEvent(item.event.id).subscribe({
            next: () => this.shellUi.requestNotificationRefresh(),
          });
        }
      },
      error: () => {
        this.openingId.set(null);
        this.loadError.set('No se pudo abrir la notificación.');
      },
    });
  }

  private loadList(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.notificationsService.list({ limit: 30 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
        this.nowMs = Date.now();
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar las notificaciones.');
      },
    });
  }
}
