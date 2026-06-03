import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import type {
  AiStatusResponse,
  ChatMessageRequest,
  ChatMessageResponse,
} from '@core/interfaces/ai-chat.interface';

// -------------------------------------------------------------------
// AI Chat API Service
// HTTP client for NestJS /ai (Gemini proxy, JWT via interceptor).
// -------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly base = `${API_BASE_URL}/ai`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Whether the backend has GEMINI_API_KEY configured.
   * @returns {Observable<AiStatusResponse>}
   */
  getStatus(): Observable<AiStatusResponse> {
    return this.http.get<AiStatusResponse>(`${this.base}/status`);
  }

  /**
   * Sends a user message and returns the assistant reply.
   * @param {ChatMessageRequest} body - Message and optional session id.
   * @returns {Observable<ChatMessageResponse>}
   */
  sendMessage(body: ChatMessageRequest): Observable<ChatMessageResponse> {
    return this.http.post<ChatMessageResponse>(`${this.base}/chat`, body);
  }
}
