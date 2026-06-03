import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MapDirectionsTravelMode } from '@core/interfaces/route-directions.interface';

export type MapRouteDisplayInfo = {
  durationLabel: string;
  distanceLabel: string;
  altNote: string | null;
};

@Component({
  selector: 'app-map-directions-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-directions-overlay.component.html',
  styleUrl: './map-directions-overlay.component.css',
})
export class MapDirectionsOverlayComponent {
  readonly travelMode = input.required<MapDirectionsTravelMode>();
  readonly loading = input(false);
  readonly routeDisplay = input<MapRouteDisplayInfo | null>(null);
  readonly error = input<string | null>(null);

  readonly travelModeChange = output<MapDirectionsTravelMode>();
  readonly closed = output<void>();

  selectMode(mode: MapDirectionsTravelMode): void {
    this.travelModeChange.emit(mode);
  }

  close(): void {
    this.closed.emit();
  }
}
