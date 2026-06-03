import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// -------------------------------------------------------------------
// Gemini function declaration: create_event (step 2 — contract only).
// Aligned with CreateEventDto; managers and photo omitted in phase 1.
// -------------------------------------------------------------------

export const CREATE_EVENT_TOOL_NAME = 'create_event';

export const CREATE_EVENT_TOOL: FunctionDeclaration = {
  name: CREATE_EVENT_TOOL_NAME,
  description:
    'Crea un evento en el mapa de UGR Eventos. ' +
    'Invocar solo tras confirmación explícita del usuario y cuando tengas título (obligatorio, preguntar si falta), ' +
    'descripción (cadena vacía si no la dio), ubicación en texto, coordenadas WGS84, inicio y fin en ISO 8601. ' +
    'Si falta la hora de fin, pregúntala; si no la sabe, usa 1 hora de duración desde el inicio. ' +
    'Si menciona un centro UGR, usa resolve_faculty antes para coords exactas. ' +
    'Resume todos los datos y pide confirmación antes de llamar a esta función.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Título del evento (máx. 300 caracteres).',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Descripción del evento (puede estar vacía).',
      },
      location: {
        type: SchemaType.STRING,
        description:
          'Ubicación legible: aula, edificio o nombre oficial del centro UGR.',
      },
      latitude: {
        type: SchemaType.NUMBER,
        description: 'Latitud WGS84 del marcador en el mapa.',
      },
      longitude: {
        type: SchemaType.NUMBER,
        description: 'Longitud WGS84 del marcador en el mapa.',
      },
      startsAt: {
        type: SchemaType.STRING,
        description:
          'Inicio del evento en ISO 8601 con zona horaria, p. ej. 2026-06-06T18:00:00+02:00.',
      },
      endsAt: {
        type: SchemaType.STRING,
        description:
          'Fin del evento en ISO 8601; debe ser posterior a startsAt.',
      },
      visibility: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['public', 'private'],
        description:
          'Opcional. public = visible en mapa y listados; private = solo creador y gestores. Por defecto public.',
      },
      maxAttendees: {
        type: SchemaType.INTEGER,
        description:
          'Opcional. Aforo máximo de asistentes; omitir si no hay límite.',
      },
    },
    required: [
      'title',
      'description',
      'location',
      'latitude',
      'longitude',
      'startsAt',
      'endsAt',
    ],
  },
};
