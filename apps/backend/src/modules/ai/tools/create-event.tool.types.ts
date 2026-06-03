// -------------------------------------------------------------------
// TypeScript mirror of create_event tool args (step 2 — contract only).
// Used by AgentToolsService in step 3 to type parsed functionCall args.
// -------------------------------------------------------------------

/** Matches EventVisibility enum values exposed to Gemini. */
export type EventVisibilityToolValue = 'public' | 'private';

/** Arguments Gemini may pass to the create_event function declaration. */
export interface CreateEventToolArgs {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  /** ISO 8601 with timezone offset. */
  startsAt: string;
  /** ISO 8601; must be after startsAt. */
  endsAt: string;
  visibility?: EventVisibilityToolValue;
  /** Omit when there is no attendee cap. */
  maxAttendees?: number;
}
