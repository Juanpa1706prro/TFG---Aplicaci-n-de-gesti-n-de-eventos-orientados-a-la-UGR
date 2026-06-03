import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// -------------------------------------------------------------------
// Gemini function declaration: list_my_events (contract only).
// Reads the user's own lists: attending / created (managed by creator role).
// -------------------------------------------------------------------

export const LIST_MY_EVENTS_TOOL_NAME = 'list_my_events';

export const LIST_MY_EVENTS_TOOL: FunctionDeclaration = {
  name: LIST_MY_EVENTS_TOOL_NAME,
  description:
    'Lista eventos del propio usuario para responder consultas como ' +
    '"a cuáles voy a asistir", "qué tengo hoy", "qué eventos he creado" o "próximamente". ' +
    'Usa scope y timeframe para filtrar antes de contestar.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      scope: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['attended', 'created', 'all'],
        description:
          'attended = eventos a los que asiste; created = eventos creados por el usuario; all = ambos.',
      },
      timeframe: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['today', 'this_week', 'upcoming', 'all'],
        description:
          'today = inicio hoy (Europe/Madrid); this_week = esta semana natural (lunes-domingo, Europe/Madrid); upcoming = desde ahora en adelante; all = sin filtro temporal extra.',
      },
      limit: {
        type: SchemaType.INTEGER,
        description:
          'Número máximo de eventos a devolver. Opcional; por defecto 12. Rango permitido: 1..50.',
      },
    },
  },
};

