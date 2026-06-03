/** Response from GET /ai/status. */
export interface AiStatusResponse {
  configured: boolean;
}

/** Body for POST /ai/chat. */
export interface ChatCurrentLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

/** Body for POST /ai/chat. */
export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
  currentLocation?: ChatCurrentLocation;
}

/** Side-effect from assistant tools (e.g. event created on map). */
export type AgentAction = {
  type: 'event_created';
  eventId: number;
  title: string;
};

/** Response from POST /ai/chat. */
export interface ChatMessageResponse {
  reply: string;
  sessionId: string;
  actions?: AgentAction[];
}
