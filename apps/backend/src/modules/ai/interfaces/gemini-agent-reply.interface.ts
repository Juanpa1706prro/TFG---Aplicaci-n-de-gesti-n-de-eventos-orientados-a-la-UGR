import type { AgentToolResult } from './agent-tool-result.interface';

/** Result of one Gemini turn with optional tool executions (step 4). */
export interface GeminiAgentReply {
  reply: string;
  toolResults: AgentToolResult[];
}
