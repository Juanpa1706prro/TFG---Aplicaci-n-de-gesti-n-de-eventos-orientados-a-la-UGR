import type { AgentAction } from '../interfaces/agent-action.interface';
import type { AgentToolResult } from '../interfaces/agent-tool-result.interface';
import { CREATE_EVENT_TOOL_NAME, CREATE_MEETING_TOOL_NAME } from '../tools';

/**
 * Maps successful tool executions to client-facing actions.
 * @param {AgentToolResult[]} toolResults - Tools run during the Gemini turn.
 * @returns {AgentAction[]} Actions for the frontend (e.g. refresh map).
 */
export function deriveAgentActions(
  toolResults: AgentToolResult[],
): AgentAction[] {
  const actions: AgentAction[] = [];

  for (const result of toolResults) {
    if (
      result.toolName !== CREATE_EVENT_TOOL_NAME &&
      result.toolName !== CREATE_MEETING_TOOL_NAME
    ) {
      continue;
    }

    const { payload } = result;
    if (payload.ok !== true) {
      continue;
    }

    const eventId = payload.eventId;
    const title = payload.title;
    if (typeof eventId !== 'number' || typeof title !== 'string') {
      continue;
    }

    actions.push({ type: 'event_created', eventId, title });
  }

  return actions;
}
