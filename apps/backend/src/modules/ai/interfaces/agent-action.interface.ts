/** Side-effect reported to the client after a chat turn (step 5). */
export type AgentAction = {
  type: 'event_created';
  eventId: number;
  title: string;
};
