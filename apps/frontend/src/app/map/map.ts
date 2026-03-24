import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Router } from '@angular/router';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapComponent implements AfterViewInit {
  // @ViewChild nos permite "agarrar" el div del HTML de forma segura
  constructor(private router: Router) {}
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  map!: maplibregl.Map;

  ngAfterViewInit() {
      // Inicializamos el mapa centrado en la ETSIIT - UGR
      const map = new maplibregl.Map({
        container: this.mapContainer.nativeElement, 
        style: 'https://tiles.openfreemap.org/styles/liberty', // Estilo base gratuito
        center: [-3.6245, 37.1970], // Longitud y Latitud de la facultad de informática
        zoom: 17,
        pitch: 60, // Inclinación para el efecto 3D que pide tu TFG
        bearing: -20 // Rotación de la cámara
      });
  
      map.on('styleimagemissing', (e) => {
        // Creamos una imagen vacía de 1x1 píxeles para que MapLibre no se queje
        const emptyImage = new Uint8Array(4); 
        map.addImage(e.id, { width: 1, height: 1, data: emptyImage });
        console.log(`Iconos evitados`);
      });
  
      // Añadimos controles de navegación (zoom, rotación)
      map.addControl(new maplibregl.NavigationControl());
  
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
  
            // Centramos el mapa en la ubicación real
            map.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              essential: true
            });
  
            // Añadimos el marcador de "Tú estás aquí"
            // Usamos un color distinto (azul) para tu ubicación
            new maplibregl.Marker({ color: '#007AFF' }) 
              .setLngLat([longitude, latitude])
              .setPopup(new maplibregl.Popup().setHTML("<b>Tu ubicación actual</b>"))
              .addTo(map);
              
            console.log(`Ubicación detectada: ${latitude}, ${longitude}`);
          },
          (error) => {
            console.warn("Error de geolocalización o permiso denegado:", error.message);
            // Si falla, el mapa se queda en la UGR por defecto
          },
          {
            enableHighAccuracy: true, // Para que use el GPS si está disponible
            timeout: 5000,
            maximumAge: 0
          }
        );
      }
  
      // RF-14: Marcador de prueba donde estaría un evento
      new maplibregl.Marker({ color: '#ff0000' })
        .setLngLat([-3.6245, 37.1970])
        .setPopup(new maplibregl.Popup().setHTML("<h1>Evento TFG: Presentación</h1>"))
        .addTo(map);
  }
  goToLogin() {
    this.router.navigate(['/auth']);
  }

}