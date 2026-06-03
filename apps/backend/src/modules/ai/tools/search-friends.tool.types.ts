// -------------------------------------------------------------------
// TypeScript mirror of search_friends tool args (contract only).
// Lets Gemini search the user's confirmed friends by name or userNumber.
// -------------------------------------------------------------------

/** Arguments Gemini may pass to the search_friends function declaration. */
export interface SearchFriendsToolArgs {
  /**
   * Texto libre con el nombre, apellidos o número de perfil del amigo.
   * Ejemplos: "Ana", "Ana García", "123456".
   */
  query: string;
  /**
   * Límite máximo de filas a devolver. Opcional; por defecto 10 si se omite.
   * Debe ser un entero positivo pequeño (p. ej. 1–50).
   */
  limit?: number;
}

