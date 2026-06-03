import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapMarkerDto } from '@core/interfaces/event-interface';
import { EventVisibility } from '@core/constants/event-enums';
import { eventMarkerTimeText } from '@core/utils/event-time.utils';
import { eventPhotoUrl } from '@core/utils/image-api.util';

@Component({
  selector: 'app-map-cluster-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-cluster-panel.component.html',
})
export class MapClusterPanelComponent {
  readonly events = input.required<MapMarkerDto[]>();

  readonly closed = output<void>();
  readonly eventSelected = output<MapMarkerDto>();

  close(): void {
    this.closed.emit();
  }

  selectEvent(ev: MapMarkerDto): void {
    this.eventSelected.emit(ev);
  }

  hasPhoto(ev: MapMarkerDto): boolean {
    return ev.hasPhoto;
  }

  eventPhotoSrc(eventId: number): string {
    return eventPhotoUrl(eventId);
  }

  markerTimeLabel(m: MapMarkerDto): string {
    return eventMarkerTimeText(m.startsAt, m.endsAt);
  }

  visibilityLabel(visibility: EventVisibility): string {
    return visibility === EventVisibility.PRIVATE ? 'Reunión' : 'Evento público';
  }
}
