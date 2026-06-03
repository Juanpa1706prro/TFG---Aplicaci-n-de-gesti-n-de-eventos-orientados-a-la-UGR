import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  AgentAction,
  ChatCurrentLocation,
  ChatMessageRequest,
  ChatMessageResponse,
} from '@core/interfaces/ai-chat.interface';
import { AiChatService } from '@core/services/ai-chat.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';

type ChatLine = {
  role: 'user' | 'assistant';
  text: string;
  actions?: AgentAction[];
};

const SESSION_STORAGE_KEY = 'ugr-ai-session-id';

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.css',
})
export class AiAssistantPanelComponent implements OnInit {
  private readonly aiChat = inject(AiChatService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly shellUi = inject(ShellUiService);

  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;

  readonly configured = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lines = signal<ChatLine[]>([]);

  draft = '';
  private sessionId: string | null = null;

  ngOnInit(): void {
    this.sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

    this.aiChat
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.configured.set(res.configured),
        error: () => this.configured.set(false),
      });
  }

  close(): void {
    this.shellUi.closeAssistant();
  }

  newConversation(): void {
    this.sessionId = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.lines.set([]);
    this.error.set(null);
    this.draft = '';
  }

  send(): void {
    void this.sendInternal();
  }

  private async sendInternal(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.loading()) {
      return;
    }

    this.draft = '';
    this.error.set(null);
    this.lines.update((prev) => [...prev, { role: 'user', text }]);
    this.loading.set(true);
    this.queueScroll();

    const body: ChatMessageRequest = { message: text };
    if (this.sessionId) {
      body.sessionId = this.sessionId;
    }
    const currentLocation = await this.readCurrentLocation();
    if (currentLocation) {
      body.currentLocation = currentLocation;
    }

    this.aiChat.sendMessage(body).subscribe({
      next: (res) => this.handleChatResponse(res),
      error: (err) => {
        if (this.isStaleSessionError(err) && body.sessionId) {
          this.sessionId = null;
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          const retryBody: ChatMessageRequest = { message: text };
          if (body.currentLocation) {
            retryBody.currentLocation = body.currentLocation;
          }
          this.aiChat.sendMessage(retryBody).subscribe({
            next: (res) => this.handleChatResponse(res),
            error: (retryErr) => {
              this.loading.set(false);
              this.error.set(this.formatChatError(retryErr));
              this.queueScroll();
            },
          });
          return;
        }
        this.loading.set(false);
        this.error.set(this.formatChatError(err));
        this.queueScroll();
      },
    });
  }

  openEventOnMap(eventId: number): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber == null) {
      return;
    }
    void this.router.navigate(['/u', userNumber, 'map'], {
      queryParams: { event: eventId },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private handleChatResponse(res: ChatMessageResponse): void {
    this.sessionId = res.sessionId;
    sessionStorage.setItem(SESSION_STORAGE_KEY, res.sessionId);
    this.lines.update((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: res.reply,
        actions: res.actions?.length ? res.actions : undefined,
      },
    ]);
    this.applyAgentActions(res.actions);
    this.loading.set(false);
    this.queueScroll();
  }

  private applyAgentActions(actions: AgentAction[] | undefined): void {
    for (const action of actions ?? []) {
      if (action.type === 'event_created') {
        this.shellUi.requestMapRefresh();
      }
    }
  }

  private queueScroll(): void {
    requestAnimationFrame(() => {
      this.scrollAnchor?.nativeElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    });
  }

  private readCurrentLocation(): Promise<ChatCurrentLocation | null> {
    if (
      typeof navigator === 'undefined' ||
      !('geolocation' in navigator) ||
      !navigator.geolocation
    ) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: 'Mi ubicación actual',
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 10000,
        },
      );
    });
  }

  private isStaleSessionError(err: {
    status?: number;
    error?: { message?: string | string[] };
  }): boolean {
    if (err?.status !== 404) {
      return false;
    }
    const raw = err?.error?.message;
    const text = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
    return text.includes('Sesión del asistente no encontrada');
  }

  private formatChatError(err: {
    error?: { message?: string | string[] };
    message?: string;
  }): string {
    const raw = err?.error?.message ?? err?.message;
    const text = Array.isArray(raw)
      ? raw.join(', ')
      : String(raw ?? 'No se pudo enviar el mensaje.');

    if (
      text.includes('SERVICE_DISABLED') ||
      text.includes('has not been used in project') ||
      text.includes('generativelanguage.googleapis.com')
    ) {
      return (
        'La API de Gemini no está activada en tu proyecto de Google Cloud. ' +
        'Abre Google Cloud Console → APIs y servicios → habilita «Generative Language API» ' +
        'para el proyecto de tu clave, espera unos minutos y reinicia el backend.'
      );
    }

    if (text.length > 280) {
      return `${text.slice(0, 277)}…`;
    }

    return text;
  }
}
