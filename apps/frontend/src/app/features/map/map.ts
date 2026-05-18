import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  DestroyRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import maplibregl from 'maplibre-gl';
import { EventsService } from '@core/services/events.service';
import { MapMarkerDto } from '@core/interfaces/event-interface';
import { EventVisibility } from '@core/constants/event-enums';
import { eventCountdownText } from '@core/utils/event-time.utils';
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapComponent implements AfterViewInit {
  // ---- View References ----
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly destroyRef = inject(DestroyRef);

  // ---- Properties ----
  public map!: maplibregl.Map;
  mapMarkers: MapMarkerDto[] = [];
  nowMs = Date.now();

  // ---- Constructor ----
  constructor(
    private eventsService: EventsService,
  ) {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.nowMs = Date.now();
      });
  }

  countdownLabel(m: MapMarkerDto): string {
    return eventCountdownText(m.startsAt, m.durationMinutes, this.nowMs);
  }
  // ---- Lifecycle Hooks ----

  /**
   * Escapa texto de usuario para HTML en popups de MapLibre.
   */
  private escapeHtml(raw: string): string {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private addEventMarkers(map: maplibregl.Map): void {
    this.eventsService.getMapMarkers().subscribe({
      next: (markers) => {
        this.mapMarkers = markers;
        for (const m of markers) {          const isPrivate = m.visibility === EventVisibility.PRIVATE;
          const color = isPrivate ? '#7C3AED' : '#DC2626';
          const kindLabel = isPrivate ? 'Privado' : 'Público';
          const html = `<strong>${this.escapeHtml(m.title)}</strong><br/><span>${this.escapeHtml(m.location)}</span><br/><em>${kindLabel}</em>`;
          new maplibregl.Marker({ color })
            .setLngLat([m.longitude, m.latitude])
            .setPopup(new maplibregl.Popup({ maxWidth: '280px' }).setHTML(html))
            .addTo(map);
        }
      },
      error: (err) => {
        this.mapMarkers = [];
        console.warn('No se pudieron cargar los eventos en el mapa:', err);
      },    });
  }

  /**
   * Initializes the MapLibre engine after the view is ready.
   * Handles map styling, geolocation, and initial markers.
   */
  ngAfterViewInit() {
    this.initializeMap();
  }

  // ---- Map Logic ----

  /**
   * Configures and renders the map instance.
   */
  private initializeMap(): void {
    // Inicializamos el mapa centrado en la ETSIIT - UGR
    const map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/liberty', // Estilo base gratuito
      center: [-3.6245, 37.197], // Longitud y Latitud de la facultad de informática
      zoom: 17,
      pitch: 60, // Inclinación para el efecto 3D que pide tu TFG
      bearing: -20, // Rotación de la cámara
    });

    map.on('styleimagemissing', (e) => {
      // Creamos una imagen vacía de 1x1 píxeles para que MapLibre no se queje
      const emptyImage = new Uint8Array(4);
      map.addImage(e.id, { width: 1, height: 1, data: emptyImage });
      console.log(`Iconos evitados`);
    });

    // Añadimos controles de navegación (zoom, rotación)
    map.addControl(new maplibregl.NavigationControl());

    map.on('load', () => {
      this.addEventMarkers(map);
    });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;

          // Centramos el mapa en la ubicación real
          map.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true,
          });

          // Añadimos el marcador de "Tú estás aquí"
          // Usamos un color distinto (azul) para tu ubicación
          new maplibregl.Marker({ color: '#007AFF' })
            .setLngLat([longitude, latitude])
            .setPopup(new maplibregl.Popup().setHTML('<b>Tu ubicación actual</b>'))
            .addTo(map);

          console.log(`Ubicación detectada: ${latitude}, ${longitude}`);
        },
        (error) => {
          console.warn('Error de geolocalización o permiso denegado:', error.message);
          // Si falla, el mapa se queda en la UGR por defecto
        },
        {
          enableHighAccuracy: true, // Para que use el GPS si está disponible
          timeout: 5000,
          maximumAge: 0,
        },
      );
    }

    this.map = map;
  }

}
