import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// -------------------------------------------------------------------
// Gemini function declaration: search_friends (contract only).
// Returns the user's confirmed friends matching a free-text query.
// -------------------------------------------------------------------

export const SEARCH_FRIENDS_TOOL_NAME = 'search_friends';

export const SEARCH_FRIENDS_TOOL: FunctionDeclaration = {
  name: SEARCH_FRIENDS_TOOL_NAME,
  description:
    'Busca en la lista de amigos confirmados del usuario para resolver nombres a números de perfil (userNumber). ' +
    'Usar cuando el usuario mencione personas para una reunión o evento (p. ej. "Ana García", "mi amigo Carlos"), ' +
    'para obtener candidatos concretos con su userNumber antes de crear la reunión.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description:
          'Nombre, apellidos o número de perfil (userNumber) del amigo. Ejemplos: "Ana", "Ana García", "123456".',
      },
      limit: {
        type: SchemaType.INTEGER,
        description:
          'Número máximo de amigos a devolver. Opcional; por defecto 10 si se omite. Debe ser un entero entre 1 y 50.',
      },
    },
    required: ['query'],
  },
};

