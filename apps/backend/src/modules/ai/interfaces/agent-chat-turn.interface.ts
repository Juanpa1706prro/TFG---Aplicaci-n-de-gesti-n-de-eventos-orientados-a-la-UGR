/** One user or assistant message in a chat session (phase 0). */
export type AgentChatTurn = {
  role: 'user' | 'model';
  text: string;
};
