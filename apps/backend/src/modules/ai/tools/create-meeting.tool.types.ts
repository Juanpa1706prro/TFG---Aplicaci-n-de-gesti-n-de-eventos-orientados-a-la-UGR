// -------------------------------------------------------------------
// TypeScript mirror of create_meeting tool args (contract only).
// Used by AgentToolsService to type parsed functionCall args.
// -------------------------------------------------------------------

/** Arguments Gemini may pass to the create_meeting function declaration. */
export interface CreateMeetingToolArgs {
  /** Título de la reunión (máx. 300 caracteres). */
  title: string;
  /** Descripción de la reunión (puede estar vacía). */
  description: string;
  /** Ubicación legible: aula, edificio o nombre oficial del centro UGR. */
  location: string;
  /** Latitud WGS84 del marcador en el mapa. */
  latitude: number;
  /** Longitud WGS84 del marcador en el mapa. */
  longitude: number;
  /** Inicio en ISO 8601 con zona horaria. */
  startsAt: string;
  /** Fin en ISO 8601; debe ser posterior a startsAt. */
  endsAt: string;
  /**
   * Lista de números de perfil (userNumber) de amigos invitados a la reunión.
   * No debe incluir al propio creador; el backend lo añade automáticamente.
   */
  participantsUserNumbers: number[];
}

