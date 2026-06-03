import type { AgentAction } from './agent-action.interface';

/** Response from POST /ai/chat. */
export interface ChatResponse {
  reply: string;
  sessionId: string;
  /** Present when tools created resources this turn (e.g. event_created). */
  actions?: AgentAction[];
}

/** Response from GET /ai/status. */
export interface AiStatusResponse {
  configured: boolean;
}
