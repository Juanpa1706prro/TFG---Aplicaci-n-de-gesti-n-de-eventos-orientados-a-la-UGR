// -------------------------------------------------------------------
// TypeScript mirror of list_my_events tool args (contract only).
// Used by AgentToolsService to query the user's own event lists.
// -------------------------------------------------------------------

export type ListMyEventsScope = 'attended' | 'created' | 'all';
export type ListMyEventsTimeframe = 'today' | 'this_week' | 'upcoming' | 'all';

/** Arguments Gemini may pass to the list_my_events function declaration. */
export interface ListMyEventsToolArgs {
  /**
   * attended: eventos a los que asiste el usuario.
   * created: eventos creados por el usuario.
   * all: combinación de ambos sin duplicados.
   */
  scope?: ListMyEventsScope;
  /**
   * today: solo eventos cuyo inicio es hoy (Europe/Madrid).
   * this_week: eventos de esta semana natural (lunes-domingo, Europe/Madrid).
   * upcoming: eventos desde ahora en adelante.
   * all: sin filtro temporal adicional.
   */
  timeframe?: ListMyEventsTimeframe;
  /** Máximo de elementos a devolver (1..50). */
  limit?: number;
}

