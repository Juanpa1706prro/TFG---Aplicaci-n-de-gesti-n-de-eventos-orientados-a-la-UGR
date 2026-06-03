import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// -------------------------------------------------------------------
// Gemini function declaration: create_meeting (contract only).
// Creates a private meeting (reunión) with invited participants.
// -------------------------------------------------------------------

export const CREATE_MEETING_TOOL_NAME = 'create_meeting';

export const CREATE_MEETING_TOOL: FunctionDeclaration = {
  name: CREATE_MEETING_TOOL_NAME,
  description:
    'Crea una reunión privada en el mapa de UGR Eventos (evento privado con participantes invitados). ' +
    'Usar solo cuando el usuario haya pedido explícitamente organizar una reunión y ya tengas título, ' +
    'descripción (cadena vacía si no la dio), ubicación en texto, coordenadas WGS84, inicio y fin en ISO 8601, ' +
    'y al menos un amigo invitado (participantsUserNumbers). ' +
    'Antes de llamar, resume los detalles al usuario y confirma que quiere crear la reunión con esas personas.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'Título de la reunión (máx. 300 caracteres).',
      },
      description: {
        type: SchemaType.STRING,
        description: 'Descripción de la reunión (puede estar vacía).',
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
          'Inicio de la reunión en ISO 8601 con zona horaria, p. ej. 2026-06-06T18:00:00+02:00.',
      },
      endsAt: {
        type: SchemaType.STRING,
        description:
          'Fin de la reunión en ISO 8601; debe ser posterior a startsAt.',
      },
      participantsUserNumbers: {
        type: SchemaType.ARRAY,
        description:
          'Números de perfil (userNumber) de los amigos invitados a la reunión. No incluye al propio creador.',
        items: {
          type: SchemaType.INTEGER,
        },
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
      'participantsUserNumbers',
    ],
  },
};

