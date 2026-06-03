import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { GeminiService } from './gemini.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import type {
  AiStatusResponse,
  ChatResponse,
} from './interfaces/chat-response.interface';

// -------------------------------------------------------------------
// AI Controller
// Gemini assistant proxy (API key on server). Base route: /ai
// -------------------------------------------------------------------

@Controller('ai')
export class AiController {
  constructor(
    private readonly orchestrator: AgentOrchestratorService,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * Whether GEMINI_API_KEY is configured (public, no JWT).
   * @returns {AiStatusResponse}
   */
  @Public()
  @Get('status')
  status(): AiStatusResponse {
    return { configured: this.gemini.isConfigured() };
  }

  /**
   * Sends a message to the assistant and returns the reply.
   * Requires JWT. Conversation state is kept per sessionId.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {ChatMessageDto} dto - User message and optional session id.
   * @returns {Promise<ChatResponse>}
   */
  @Post('chat')
  chat(
    @Request() req: { user: { sub: number } },
    @Body() dto: ChatMessageDto,
  ): Promise<ChatResponse> {
    return this.orchestrator.chat(
      req.user.sub,
      dto.message,
      dto.sessionId,
      dto.currentLocation,
    );
  }
}
