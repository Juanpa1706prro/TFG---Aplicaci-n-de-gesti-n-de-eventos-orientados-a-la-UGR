import { Injectable } from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import type { ChatCurrentLocationDto } from './dto/chat-message.dto';
import { GeminiService } from './gemini.service';
import type { ChatResponse } from './interfaces/chat-response.interface';
import { deriveAgentActions } from './utils/derive-agent-actions.util';

// -------------------------------------------------------------------
// Agent orchestrator — chat, tools, and client actions (step 5).
// -------------------------------------------------------------------

@Injectable()
export class AgentOrchestratorService {
  constructor(
    private readonly sessions: AgentSessionService,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * Handles one user message and returns the assistant reply.
   * @param {number} userId - Authenticated user id.
   * @param {string} message - User text.
   * @param {string | undefined} sessionId - Optional session id.
   * @returns {Promise<ChatResponse>} Assistant text and session id for follow-up messages.
   */
  async chat(
    userId: number,
    message: string,
    sessionId?: string,
    currentLocation?: ChatCurrentLocationDto,
  ): Promise<ChatResponse> {
    const session = this.sessions.getOrCreate(userId, sessionId);
    const trimmed = message.trim();

    this.sessions.appendTurn(session, { role: 'user', text: trimmed });

    const historyBeforeReply = session.messages.slice(0, -1);
    const messageForModel = this.buildMessageForModel(trimmed, currentLocation);
    const { reply, toolResults } = await this.gemini.generateAgentReply(
      userId,
      historyBeforeReply,
      messageForModel,
    );

    this.sessions.appendTurn(session, { role: 'model', text: reply });

    const actions = deriveAgentActions(toolResults);
    const response: ChatResponse = {
      reply,
      sessionId: session.id,
    };
    if (actions.length > 0) {
      response.actions = actions;
    }

    return response;
  }

  private buildMessageForModel(
    userMessage: string,
    currentLocation?: ChatCurrentLocationDto,
  ): string {
    if (!currentLocation) {
      return userMessage;
    }

    const label = currentLocation.label?.trim() || 'Mi ubicación actual';
    const lat = currentLocation.latitude.toFixed(6);
    const lng = currentLocation.longitude.toFixed(6);
    return (
      `${userMessage}\n\n` +
      `[CONTEXTO_CLIENTE]\n` +
      `- Ubicación actual del usuario: ${label}\n` +
      `- Coordenadas WGS84: lat=${lat}, lng=${lng}\n` +
      `[/CONTEXTO_CLIENTE]`
    );
  }
}
