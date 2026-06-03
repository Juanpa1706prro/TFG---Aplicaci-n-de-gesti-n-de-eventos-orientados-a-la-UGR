// -------------------------------------------------------------------
// Result of executing an agent tool (step 3).
// payload is JSON-serializable for Gemini functionResponse in step 4.
// -------------------------------------------------------------------

/** Uniform return shape from AgentToolsService.dispatch(). */
export interface AgentToolResult {
  toolName: string;
  payload: Record<string, unknown>;
}
