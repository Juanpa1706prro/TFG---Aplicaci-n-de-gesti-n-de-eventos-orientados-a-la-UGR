import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// -------------------------------------------------------------------
// Gemini function declaration: resolve_faculty (step 2 — contract only).
// Wraps faculty-locations.ts resolution for the model before create_event.
// -------------------------------------------------------------------

export const RESOLVE_FACULTY_TOOL_NAME = 'resolve_faculty';

/** Arguments Gemini may pass to the resolve_faculty function declaration. */
export interface ResolveFacultyToolArgs {
  query: string;
}

export const RESOLVE_FACULTY_TOOL: FunctionDeclaration = {
  name: RESOLVE_FACULTY_TOOL_NAME,
  description:
    'Resuelve un centro o facultad de la UGR a coordenadas de mapa y etiqueta oficial. ' +
    'Usar cuando el usuario indique un campus, escuela o facultad (p. ej. ETSIIT, Facultad de Derecho). ' +
    'Devuelve found=false si no hay coincidencia única; en ese caso pregunta al usuario.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'Texto libre: código (ETSIIT), nombre corto o fragmento del nombre oficial del centro UGR.',
      },
    },
    required: ['query'],
  },
};
