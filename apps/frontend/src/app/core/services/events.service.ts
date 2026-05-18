import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateEventPayload,
  CreatedEventDto,
  MapMarkerDto,
} from '@core/interfaces/event-interface';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly API_URL = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  getMapMarkers(): Observable<MapMarkerDto[]> {
    return this.http.get<MapMarkerDto[]>(`${this.API_URL}/events/map-markers`);
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
