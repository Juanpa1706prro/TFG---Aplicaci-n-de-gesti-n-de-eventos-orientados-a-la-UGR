import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import {
  NotificationListDto,
  NotificationUnreadCountDto,
} from '@core/interfaces/notification-interface';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly API_URL = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  list(options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Observable<NotificationListDto> {
    let params = new HttpParams();
    if (options?.limit != null) {
      params = params.set('limit', String(options.limit));
    }
    if (options?.offset != null) {
      params = params.set('offset', String(options.offset));
    }
    if (options?.unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }
    return this.http.get<NotificationListDto>(`${this.API_URL}/notifications`, {
      params,
    });
  }

  getUnreadCount(): Observable<NotificationUnreadCountDto> {
    return this.http.get<NotificationUnreadCountDto>(
      `${this.API_URL}/notifications/unread-count`,
    );
  }

  markAsRead(notificationId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.API_URL}/notifications/${notificationId}/read`,
      {},
    );
  }

  markReadByEvent(eventId: number): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(
      `${this.API_URL}/notifications/read-by-event/${eventId}`,
      {},
    );
  }
}
