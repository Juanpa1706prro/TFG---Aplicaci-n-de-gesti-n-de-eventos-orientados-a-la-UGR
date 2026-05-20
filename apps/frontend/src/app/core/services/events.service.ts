import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import {
  CreateEventPayload,
  CreatedEventDto,
  EventDetailDto,
  MapMarkerDto,
  MyEventListsDto,
} from '@core/interfaces/event-interface';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly API_URL = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getMapMarkers(): Observable<MapMarkerDto[]> {
    return this.http.get<MapMarkerDto[]>(`${this.API_URL}/events/map-markers`);
  }

  getMyEventLists(): Observable<MyEventListsDto> {
    return this.http.get<MyEventListsDto>(`${this.API_URL}/events/my-lists`);
  }

  getEventDetail(eventId: number): Observable<EventDetailDto> {
    return this.http.get<EventDetailDto>(`${this.API_URL}/events/${eventId}`);
  }

  attend(eventId: number): Observable<EventDetailDto> {
    return this.http.post<EventDetailDto>(
      `${this.API_URL}/events/${eventId}/attendance`,
      {},
    );
  }

  unattend(eventId: number): Observable<EventDetailDto> {
    return this.http.delete<EventDetailDto>(
      `${this.API_URL}/events/${eventId}/attendance`,
    );
  }

  create(
    payload: CreateEventPayload,
  ): Observable<{ message: string; event: CreatedEventDto }> {
    return this.http.post<{ message: string; event: CreatedEventDto }>(
      `${this.API_URL}/events`,
      payload,
    );
  }
}
