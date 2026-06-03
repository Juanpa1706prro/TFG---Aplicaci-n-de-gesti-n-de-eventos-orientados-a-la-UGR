import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleGenerativeAI,
  type Content,
  type FunctionCall,
  type Part,
} from '@google/generative-ai';
import { AgentToolsService } from './agent-tools.service';
import { buildAssistantSystemInstructionWithTools } from './assistant-system-instruction';
import type { AgentChatTurn } from './interfaces/agent-chat-turn.interface';
import type { GeminiAgentReply } from './interfaces/gemini-agent-reply.interface';
import { AGENT_TOOL_DECLARATIONS } from './tools';
import {
  getGeminiApiKey,
  getGeminiModel,
  isGeminiConfigured,
} from './utils/ai-config.util';

// -------------------------------------------------------------------
// Gemini API client with function-calling loop (step 4).
// -------------------------------------------------------------------

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class GeminiService {
  constructor(private readonly agentTools: AgentToolsService) {}

  /**
   * Whether GEMINI_API_KEY is set on the server.
   * @returns {boolean}
   */
  isConfigured(): boolean {
    return isGeminiConfigured();
  }

  /**
   * Sends history plus the latest user message to Gemini, executing tools
   * when the model requests function calls until a text reply is produced.
   * @param {number} userId - Authenticated user (passed to create_event).
   * @param {AgentChatTurn[]} history - Prior turns (user/model text only).
   * @param {string} userMessage - Latest user text.
   * @returns {Promise<GeminiAgentReply>} Final assistant text and tool payloads.
   * @throws {ServiceUnavailableException} If GEMINI_API_KEY is missing.
   * @throws {BadGatewayException} If Gemini returns no text or the request fails.
   */
  async generateAgentReply(
    userId: number,
    history: AgentChatTurn[],
    userMessage: string,
  ): Promise<GeminiAgentReply> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El asistente no está configurado en el servidor (falta GEMINI_API_KEY).',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModel(),
      systemInstruction: buildAssistantSystemInstructionWithTools(),
      tools: [{ functionDeclarations: [...AGENT_TOOL_DECLARATIONS] }],
    });

    const contents = this.buildContents(history, userMessage);
    const toolResults: GeminiAgentReply['toolResults'] = [];

    try {
      for (let step = 0; step < MAX_TOOL_ITERATIONS; step++) {
        const result = await model.generateContent({ contents });
        const response = result.response;
        const calls = response.functionCalls();

        if (!calls?.length) {
          const text = response.text()?.trim();
          if (!text) {
            throw new BadGatewayException(
              'El asistente no devolvió una respuesta válida.',
            );
          }
          return { reply: text, toolResults };
        }

        contents.push({
          role: 'model',
          parts: calls.map((call) => ({ functionCall: call })),
        });

        const responseParts = await this.executeFunctionCalls(
          userId,
          calls,
          toolResults,
        );
        contents.push({ role: 'user', parts: responseParts });
      }

      throw new BadGatewayException(
        'El asistente necesitó demasiados pasos internos. Inténtalo de nuevo.',
      );
    } catch (err) {
      if (
        err instanceof ServiceUnavailableException ||
        err instanceof BadGatewayException
      ) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : 'Error desconocido';
      throw new BadGatewayException(this.toUserFacingGeminiError(message));
    }
  }

  private buildContents(
    history: AgentChatTurn[],
    userMessage: string,
  ): Content[] {
    const contents: Content[] = history.map((turn) => ({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    }));

    if (
      contents.length === 0 ||
      contents[contents.length - 1]?.role !== 'user' ||
      contents[contents.length - 1]?.parts?.[0]?.text !== userMessage
    ) {
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
    }

    return contents;
  }

  private async executeFunctionCalls(
    userId: number,
    calls: FunctionCall[],
    toolResults: GeminiAgentReply['toolResults'],
  ): Promise<Part[]> {
    const results = await Promise.all(
      calls.map((call) =>
        this.agentTools.dispatch(userId, call.name, call.args),
      ),
    );

    toolResults.push(...results);

    return results.map((result) => ({
      functionResponse: {
        name: result.toolName,
        response: result.payload,
      },
    }));
  }

  private toUserFacingGeminiError(message: string): string {
    const projectMatch = message.match(/project (\d+)/);
    const projectHint = projectMatch
      ? ` (proyecto Google Cloud nº ${projectMatch[1]})`
      : '';

    if (
      message.includes('SERVICE_DISABLED') ||
      message.includes('has not been used in project')
    ) {
      return (
        `La API «Generative Language API» no está activa en el proyecto de tu clave${projectHint}. ` +
        'En Google Cloud → APIs y servicios → Biblioteca, busca «Generative Language API» y pulsa Habilitar. ' +
        'La clave debe ser del mismo proyecto. Espera unos minutos y reinicia el backend (docker compose restart ugr_backend).'
      );
    }

    if (message.includes('API key not valid')) {
      return 'La clave GEMINI_API_KEY no es válida o tiene restricciones que bloquean el servidor.';
    }

    if (
      message.includes('404') ||
      message.includes('no longer available')
    ) {
      return (
        'El modelo configurado en GEMINI_MODEL ya no está disponible. ' +
        'Actualiza .env a gemini-2.5-flash (o gemini-3.5-flash) y reinicia el backend.'
      );
    }

    if (message.length > 320) {
      return `No se pudo contactar con el asistente: ${message.slice(0, 317)}…`;
    }

    return `No se pudo contactar con el asistente: ${message}`;
  }
}
