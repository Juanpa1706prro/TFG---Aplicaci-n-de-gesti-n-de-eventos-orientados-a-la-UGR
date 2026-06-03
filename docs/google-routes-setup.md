# Google Routes API — Configuración

Configuración **fuera del código** en [Google Cloud Console](https://console.cloud.google.com/). La clave se guarda solo en `apps/backend/.env` (no se sube a git).

## Cuenta Google

- Las cuentas institucionales (`@go.ugr.es`, `@correo.ugr.es`) suelen **no poder crear proyectos** en Cloud (`resourcemanager.projects.create`).
- Usar una **cuenta Gmail personal** solo para Google Cloud / Maps Platform es válido para el TFG; la clave en `.env` es independiente del correo con el que desarrollas.
- Entra en la consola en **ventana de incógnito** o cierra sesión de la cuenta UGR antes de iniciar sesión con Gmail.

## Checklist

1. **Proyecto** — Con Gmail personal: selector de proyecto → **Nuevo proyecto** → recurso superior **Sin organización** (ID 0) → nombre p. ej. `ugr-eventos-tfg`.
2. **Facturación** — Vincular cuenta de facturación al proyecto (obligatorio para Routes API; el TFG suele quedar en el uso gratuito mensual).
3. **Habilitar API** — [Routes API](https://console.cloud.google.com/apis/library/routes.googleapis.com) → Activar.
4. **Crear clave API** — [Credenciales](https://console.cloud.google.com/apis/credentials) → Crear credenciales → Clave de API.
5. **Restringir la clave (recomendado)**:
   - Restricción de API: solo **Routes API**.
   - Restricción de aplicación: **Direcciones IP** del servidor (en local, tu IP pública o prueba sin restricción IP solo en desarrollo y restringir antes de desplegar).
6. **Presupuesto (opcional)** — [Facturación → Presupuestos](https://console.cloud.google.com/billing) → alerta p. ej. 5 €.
7. **Guardar en el repo local**:
   ```bash
   cd apps/backend
   copy .env.example .env   # Windows
   # Editar .env y pegar: GOOGLE_ROUTES_API_KEY=tu_clave_aqui
   ```

## Comprobar que la clave funciona (curl)

Sustituye `TU_CLAVE` y las coordenadas (ejemplo Granada):

```bash
curl -X POST "https://routes.googleapis.com/directions/v2:computeRoutes" ^
  -H "Content-Type: application/json" ^
  -H "X-Goog-Api-Key: TU_CLAVE" ^
  -H "X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline" ^
  -d "{\"origin\":{\"location\":{\"latLng\":{\"latitude\":37.177,\"longitude\":-3.598}}},\"destination\":{\"location\":{\"latLng\":{\"latitude\":37.192,\"longitude\":-3.607}}},\"travelMode\":\"WALK\"}"
```

Respuesta esperada: JSON con `routes[0].polyline.encodedPolyline` (y duración/distancia).

## Integración en el proyecto

### Backend (implementado)

- `POST /routing/directions` — requiere JWT (cookie `access_token`).
- `GET /routing/status` — `{ configured: true|false }` según `.env`.
- Docker: `env_file: ./apps/backend/.env` en `ugr_backend`.

Tras `npm install` en backend (o reiniciar contenedor Docker):

```bash
# Estado (con sesión iniciada en el navegador, copiar cookie o usar Postman)
curl http://localhost:3000/routing/status

curl -X POST http://localhost:3000/routing/directions \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=TU_JWT" \
  -d "{\"originLat\":37.177,\"originLng\":-3.598,\"destinationLat\":37.192,\"destinationLng\":-3.607,\"travelMode\":\"WALK\"}"
```

### Frontend (implementado)

- Proxy: `/routing` → backend.
- `routing-api.service.ts`, `map-route-layer.util.ts`, `route-directions.interface.ts`
- Mapa: botón con `ROUTING_UI_BLOCKED` (en `routing-availability.config.ts`), enlace «Abrir en Google Maps», ruta en MapLibre al desbloquear.

Para probar la ruta en el mapa: en `apps/frontend/src/app/core/config/routing-availability.config.ts` pon `ROUTING_UI_BLOCKED = false`, reinicia el frontend, inicia sesión y pulsa «Cómo llegar».
