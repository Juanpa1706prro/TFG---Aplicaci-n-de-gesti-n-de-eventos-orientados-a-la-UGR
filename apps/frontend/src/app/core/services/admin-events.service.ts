import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import {
  AdminEventDetail,
  AdminEventsListParams,
  AdminEventsListResponse,
  AdminUpdateEventPayload,
} from '@core/interfaces/admin-event.interface';

@Injectable({ providedIn: 'root' })
export class AdminEventsService {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);

  listEvents(params: AdminEventsListParams): Observable<AdminEventsListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit))
      .set('sort', params.sort)
      .set('order', params.order)
      .set('status', params.status);

    if (params.includeDeleted) {
      httpParams = httpParams.set('includeDeleted', 'true');
    }

    const q = params.q?.trim();
    if (q) {
      httpParams = httpParams.set('q', q);
    }

    return this.http.get<AdminEventsListResponse>(`${this.API_URL}/admin/events`, {
      params: httpParams,
    });
  }

  getEvent(id: number): Observable<AdminEventDetail> {
    return this.http.get<AdminEventDetail>(`${this.API_URL}/admin/events/${id}`);
  }

  updateEvent(
    id: number,
    body: AdminUpdateEventPayload,
  ): Observable<{ message: string; event: AdminEventDetail }> {
    return this.http.patch<{ message: string; event: AdminEventDetail }>(
      `${this.API_URL}/admin/events/${id}`,
      body,
    );
  }

  deleteEvent(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/admin/events/${id}`,
    );
  }

  uploadEventPhoto(id: number, file: File): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.put<{ message: string }>(
      `${this.API_URL}/admin/events/${id}/photo`,
      fd,
    );
  }

  deleteEventPhoto(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/admin/events/${id}/photo`,
    );
  }
}
