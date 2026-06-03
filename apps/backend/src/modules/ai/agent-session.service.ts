import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AgentChatTurn } from './interfaces/agent-chat-turn.interface';

// -------------------------------------------------------------------
// In-memory chat sessions (phase 0). Replace with DB in later phases.
// -------------------------------------------------------------------

export type AgentSessionRecord = {
  id: string;
  userId: number;
  messages: AgentChatTurn[];
  updatedAt: number;
};

const MAX_TURNS = 40;

@Injectable()
export class AgentSessionService {
  private readonly sessions = new Map<string, AgentSessionRecord>();

  /**
   * Loads a session owned by the user or creates a new one.
   * @param {number} userId - Authenticated user id.
   * @param {string | undefined} sessionId - Optional existing session id.
   * @returns {AgentSessionRecord} Session record.
   * @throws {NotFoundException} If sessionId is unknown or belongs to another user.
   */
  getOrCreate(userId: number, sessionId?: string): AgentSessionRecord {
    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (existing) {
        if (existing.userId !== userId) {
          throw new NotFoundException('Sesión del asistente no encontrada.');
        }
        return existing;
      }
      // Stale id (p. ej. reinicio del backend): nueva sesión en lugar de 404.
    }

    const id = randomUUID();
    const record: AgentSessionRecord = {
      id,
      userId,
      messages: [],
      updatedAt: Date.now(),
    };
    this.sessions.set(id, record);
    return record;
  }

  /**
   * Appends a turn and trims old history.
   * @param {AgentSessionRecord} session - Session to update.
   * @param {AgentChatTurn} turn - User or model message.
   * @returns {void}
   */
  appendTurn(session: AgentSessionRecord, turn: AgentChatTurn): void {
    session.messages.push(turn);
    if (session.messages.length > MAX_TURNS) {
      session.messages.splice(0, session.messages.length - MAX_TURNS);
    }
    session.updatedAt = Date.now();
  }

  /**
   * Clears conversation history for a new chat in the UI.
   * @param {number} userId - Authenticated user id.
   * @param {string} sessionId - Session to reset.
   * @returns {void}
   */
  reset(userId: number, sessionId: string): void {
    const session = this.getOrCreate(userId, sessionId);
    session.messages = [];
    session.updatedAt = Date.now();
  }
}
