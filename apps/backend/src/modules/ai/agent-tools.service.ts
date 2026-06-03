import { HttpException, Injectable } from '@nestjs/common';
import { resolveFacultyLocation } from '../../common/faculty/faculty-locations';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { EventVisibility } from '../events/event-visibility.enum';
import {
  EventsService,
  type EventListItemView,
} from '../events/events.service';
import { FriendsService, type FriendListItemView } from '../friends/friends.service';
import type { AgentToolResult } from './interfaces/agent-tool-result.interface';
import {
  CREATE_EVENT_TOOL_NAME,
  CREATE_MEETING_TOOL_NAME,
  RESOLVE_FACULTY_TOOL_NAME,
  SEARCH_FRIENDS_TOOL_NAME,
  LIST_MY_EVENTS_TOOL_NAME,
  type ListMyEventsScope,
  type ListMyEventsTimeframe,
  type ListMyEventsToolArgs,
  type CreateMeetingToolArgs,
  type SearchFriendsToolArgs,
} from './tools';

type ParsedCreateEventDto = Omit<CreateEventDto, 'managers'>;

type ParsedCreateMeetingArgs = ParsedCreateEventDto & {
  participantsUserNumbers: number[];
};

// -------------------------------------------------------------------
// Agent tool executor (step 3: domain actions, no Gemini loop yet).
// -------------------------------------------------------------------

@Injectable()
export class AgentToolsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly friendsService: FriendsService,
  ) {}

  /**
   * Runs a declared agent tool for the authenticated user.
   * @param {number} userId - JWT user id (event creator when applicable).
   * @param {string} toolName - Function name from Gemini functionCall.
   * @param {unknown} args - Raw JSON args from the model.
   * @returns {Promise<AgentToolResult>} Serializable payload for functionResponse.
   */
  async dispatch(
    userId: number,
    toolName: string,
    args: unknown,
  ): Promise<AgentToolResult> {
    switch (toolName) {
      case RESOLVE_FACULTY_TOOL_NAME:
        return this.resolveFaculty(args);
      case CREATE_EVENT_TOOL_NAME:
        return this.createEvent(userId, args);
      case CREATE_MEETING_TOOL_NAME:
        return this.createMeeting(userId, args);
      case SEARCH_FRIENDS_TOOL_NAME:
        return this.searchFriends(userId, args);
      case LIST_MY_EVENTS_TOOL_NAME:
        return this.listMyEvents(userId, args);
      default:
        return {
          toolName,
          payload: {
            ok: false,
            error: `Función desconocida: ${toolName}`,
          },
        };
    }
  }

  private async createMeeting(
    userId: number,
    args: unknown,
  ): Promise<AgentToolResult> {
    const parsed = this.parseCreateMeetingArgs(args);
    if ('error' in parsed) {
      return {
        toolName: CREATE_MEETING_TOOL_NAME,
        payload: { ok: false, error: parsed.error },
      };
    }

    const dto: CreateEventDto = {
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      visibility: EventVisibility.PRIVATE,
      maxAttendees: parsed.maxAttendees,
      participants: parsed.participantsUserNumbers.map((userNumber) => ({
        userNumber,
      })),
    };

    try {
      const result = await this.eventsService.create(userId, dto);
      return {
        toolName: CREATE_MEETING_TOOL_NAME,
        payload: {
          ok: true,
          eventId: result.event.id,
          title: result.event.title,
          visibility: result.event.visibility,
          message: result.message,
        },
      };
    } catch (err) {
      return {
        toolName: CREATE_MEETING_TOOL_NAME,
        payload: {
          ok: false,
          error: this.toToolError(err),
        },
      };
    }
  }

  private async searchFriends(
    userId: number,
    args: unknown,
  ): Promise<AgentToolResult> {
    const parsed = this.parseSearchFriendsArgs(args);
    if ('error' in parsed) {
      return {
        toolName: SEARCH_FRIENDS_TOOL_NAME,
        payload: { ok: false, error: parsed.error },
      };
    }

    const friends = await this.friendsService.findFriends(userId);
    const matches = this.rankFriendMatches(parsed.query, friends, parsed.limit);

    return {
      toolName: SEARCH_FRIENDS_TOOL_NAME,
      payload: {
        ok: true,
        query: parsed.query,
        matches: matches.map((item) => ({
          userNumber: item.friend.user.userNumber,
          displayName: item.displayName,
          score: item.score,
        })),
      },
    };
  }

  private async listMyEvents(
    userId: number,
    args: unknown,
  ): Promise<AgentToolResult> {
    const parsed = this.parseListMyEventsArgs(args);
    if ('error' in parsed) {
      return {
        toolName: LIST_MY_EVENTS_TOOL_NAME,
        payload: { ok: false, error: parsed.error },
      };
    }

    const lists = await this.eventsService.findMyEventListsForUser(userId);
    const merged = this.selectScopeEvents(parsed.scope, lists);
    const now = new Date();
    const filtered = merged
      .filter((event) => this.matchesTimeframe(event, parsed.timeframe, now))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, parsed.limit);

    return {
      toolName: LIST_MY_EVENTS_TOOL_NAME,
      payload: {
        ok: true,
        scope: parsed.scope,
        timeframe: parsed.timeframe,
        total: filtered.length,
        events: filtered.map((event) => ({
          id: event.id,
          title: event.title,
          location: event.location,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          visibility: event.visibility,
          isMeeting: event.visibility === EventVisibility.PRIVATE,
          createdByMe: event.managementRoles.includes('creator'),
        })),
      },
    };
  }

  private resolveFaculty(args: unknown): AgentToolResult {
    if (!this.isRecord(args)) {
      return {
        toolName: RESOLVE_FACULTY_TOOL_NAME,
        payload: {
          found: false,
          error: 'Los argumentos de resolve_faculty deben ser un objeto JSON.',
        },
      };
    }

    const query = this.readNonEmptyString(args, 'query');
    if (!query) {
      return {
        toolName: RESOLVE_FACULTY_TOOL_NAME,
        payload: {
          found: false,
          error: 'El parámetro query es obligatorio y debe ser texto no vacío.',
        },
      };
    }

    const match = resolveFacultyLocation(query);
    if (!match) {
      return {
        toolName: RESOLVE_FACULTY_TOOL_NAME,
        payload: {
          found: false,
          message:
            'No se encontró un centro UGR único para esa búsqueda. Pide al usuario que aclare el centro.',
        },
      };
    }

    return {
      toolName: RESOLVE_FACULTY_TOOL_NAME,
      payload: {
        found: true,
        facultyCode: match.facultyCode,
        location: match.location,
        latitude: match.latitude,
        longitude: match.longitude,
      },
    };
  }

  private async createEvent(
    userId: number,
    args: unknown,
  ): Promise<AgentToolResult> {
    const parsed = this.parseCreateEventArgs(args);
    if ('error' in parsed) {
      return {
        toolName: CREATE_EVENT_TOOL_NAME,
        payload: { ok: false, error: parsed.error },
      };
    }

    const dto: CreateEventDto = {
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      visibility: parsed.visibility,
      maxAttendees: parsed.maxAttendees,
    };

    try {
      const result = await this.eventsService.create(userId, dto);
      return {
        toolName: CREATE_EVENT_TOOL_NAME,
        payload: {
          ok: true,
          eventId: result.event.id,
          title: result.event.title,
          message: result.message,
        },
      };
    } catch (err) {
      return {
        toolName: CREATE_EVENT_TOOL_NAME,
        payload: {
          ok: false,
          error: this.toToolError(err),
        },
      };
    }
  }

  private parseCreateEventArgs(
    args: unknown,
  ): ParsedCreateEventDto | { error: string } {
    if (!this.isRecord(args)) {
      return { error: 'Los argumentos de create_event deben ser un objeto JSON.' };
    }

    const title = this.readNonEmptyString(args, 'title');
    if (!title) {
      return { error: 'Falta title (texto no vacío).' };
    }
    if (title.length > 300) {
      return { error: 'title no puede superar 300 caracteres.' };
    }

    const description =
      typeof args.description === 'string' ? args.description : null;
    if (description === null) {
      return { error: 'Falta description (texto).' };
    }
    if (description.length > 8000) {
      return { error: 'description no puede superar 8000 caracteres.' };
    }

    const location = this.readNonEmptyString(args, 'location');
    if (!location) {
      return { error: 'Falta location (texto no vacío).' };
    }
    if (location.length > 500) {
      return { error: 'location no puede superar 500 caracteres.' };
    }

    const latitude = this.readFiniteNumber(args, 'latitude');
    if (latitude === null) {
      return { error: 'Falta latitude (número WGS84).' };
    }

    const longitude = this.readFiniteNumber(args, 'longitude');
    if (longitude === null) {
      return { error: 'Falta longitude (número WGS84).' };
    }

    const startsAt = this.readNonEmptyString(args, 'startsAt');
    if (!startsAt) {
      return { error: 'Falta startsAt (ISO 8601).' };
    }

    const endsAt = this.readNonEmptyString(args, 'endsAt');
    if (!endsAt) {
      return { error: 'Falta endsAt (ISO 8601).' };
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (Number.isNaN(startDate.getTime())) {
      return { error: 'startsAt no es una fecha ISO 8601 válida.' };
    }
    if (Number.isNaN(endDate.getTime())) {
      return { error: 'endsAt no es una fecha ISO 8601 válida.' };
    }
    if (endDate <= startDate) {
      return { error: 'endsAt debe ser posterior a startsAt.' };
    }
    if (endDate <= new Date()) {
      return {
        error:
          'La fecha de fin del evento ya ha pasado. Solo se muestran eventos activos (fin en el futuro). ' +
          'Vuelve a proponer fechas futuras con el año correcto.',
      };
    }

    let visibility: EventVisibility | undefined;
    if (args.visibility !== undefined && args.visibility !== null) {
      if (args.visibility === EventVisibility.PRIVATE) {
        visibility = EventVisibility.PRIVATE;
      } else if (args.visibility === EventVisibility.PUBLIC) {
        visibility = EventVisibility.PUBLIC;
      } else {
        return {
          error: "visibility debe ser 'public' o 'private'.",
        };
      }
    }

    let maxAttendees: number | null | undefined;
    if (args.maxAttendees !== undefined && args.maxAttendees !== null) {
      if (
        typeof args.maxAttendees !== 'number' ||
        !Number.isInteger(args.maxAttendees) ||
        args.maxAttendees < 1
      ) {
        return {
          error: 'maxAttendees debe ser un entero mayor o igual a 1.',
        };
      }
      maxAttendees = args.maxAttendees;
    }

    return {
      title,
      description,
      location,
      latitude,
      longitude,
      startsAt,
      endsAt,
      visibility,
      maxAttendees,
    };
  }

  private parseCreateMeetingArgs(
    args: unknown,
  ): ParsedCreateMeetingArgs | { error: string } {
    const base = this.parseCreateEventArgs(args);
    if ('error' in base) {
      return base;
    }

    if (!this.isRecord(args)) {
      return { error: 'Los argumentos de create_meeting deben ser un objeto JSON.' };
    }

    const raw = args.participantsUserNumbers;
    if (!Array.isArray(raw) || raw.length === 0) {
      return {
        error:
          'participantsUserNumbers debe ser un array no vacío de números de perfil de amigos.',
      };
    }

    const participants = new Set<number>();
    for (const value of raw) {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return {
          error:
            'Cada elemento de participantsUserNumbers debe ser un número entero (userNumber de 6 dígitos).',
        };
      }
      if (value < 100_000 || value > 999_999) {
        return {
          error:
            'Cada userNumber de participantsUserNumbers debe tener 6 dígitos (entre 100000 y 999999).',
        };
      }
      participants.add(value);
    }

    if (participants.size === 0) {
      return {
        error:
          'Debe haber al menos un número de perfil válido en participantsUserNumbers.',
      };
    }

    if (participants.size > 50) {
      return {
        error:
          'No puedes invitar a más de 50 amigos a la vez desde el asistente. Reduce la lista.',
      };
    }

    return {
      ...base,
      visibility: EventVisibility.PRIVATE,
      participantsUserNumbers: Array.from(participants),
    };
  }

  private parseSearchFriendsArgs(
    args: unknown,
  ): { query: string; limit: number } | { error: string } {
    if (!this.isRecord(args)) {
      return {
        error: 'Los argumentos de search_friends deben ser un objeto JSON.',
      };
    }

    const query = this.readNonEmptyString(args, 'query');
    if (!query) {
      return { error: 'Falta query (texto no vacío).' };
    }

    let limit = 10;
    if (args.limit !== undefined && args.limit !== null) {
      const value = this.readFiniteNumber(args, 'limit');
      if (value === null || !Number.isInteger(value)) {
        return { error: 'limit debe ser un entero positivo.' };
      }
      if (value < 1 || value > 50) {
        return { error: 'limit debe estar entre 1 y 50.' };
      }
      limit = value;
    }

    return { query, limit };
  }

  private parseListMyEventsArgs(
    args: unknown,
  ): { scope: ListMyEventsScope; timeframe: ListMyEventsTimeframe; limit: number } | { error: string } {
    if (args === undefined || args === null) {
      return { scope: 'all', timeframe: 'all', limit: 12 };
    }
    if (!this.isRecord(args)) {
      return {
        error: 'Los argumentos de list_my_events deben ser un objeto JSON.',
      };
    }

    let scope: ListMyEventsScope = 'all';
    if (args.scope !== undefined && args.scope !== null) {
      if (
        args.scope !== 'attended' &&
        args.scope !== 'created' &&
        args.scope !== 'all'
      ) {
        return { error: "scope debe ser 'attended', 'created' o 'all'." };
      }
      scope = args.scope;
    }

    let timeframe: ListMyEventsTimeframe = 'all';
    if (args.timeframe !== undefined && args.timeframe !== null) {
      if (
        args.timeframe !== 'today' &&
        args.timeframe !== 'this_week' &&
        args.timeframe !== 'upcoming' &&
        args.timeframe !== 'all'
      ) {
        return {
          error:
            "timeframe debe ser 'today', 'this_week', 'upcoming' o 'all'.",
        };
      }
      timeframe = args.timeframe;
    }

    let limit = 12;
    if (args.limit !== undefined && args.limit !== null) {
      const value = this.readFiniteNumber(args, 'limit');
      if (value === null || !Number.isInteger(value)) {
        return { error: 'limit debe ser un entero positivo.' };
      }
      if (value < 1 || value > 50) {
        return { error: 'limit debe estar entre 1 y 50.' };
      }
      limit = value;
    }

    return { scope, timeframe, limit };
  }

  private rankFriendMatches(
    query: string,
    friends: FriendListItemView[],
    limit: number,
  ): { friend: FriendListItemView; displayName: string; score: number }[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    const parsedNumber = Number.parseInt(q, 10);

    const scored = friends.map((friend) => {
      const first = (friend.user.firstName ?? '').trim();
      const last = (friend.user.lastName ?? '').trim();
      const fullName = `${first} ${last}`.trim();
      const fullLower = fullName.toLowerCase();
      const firstLower = first.toLowerCase();
      const lastLower = last.toLowerCase();

      let score = 0;

      if (
        Number.isFinite(parsedNumber) &&
        friend.user.userNumber === parsedNumber
      ) {
        score = 100;
      } else if (fullLower === q) {
        score = 95;
      } else if (fullLower.includes(q)) {
        score = 80;
      } else if (firstLower.startsWith(q) || lastLower.startsWith(q)) {
        score = 70;
      } else if (fullLower.split(' ').some((part) => part.startsWith(q))) {
        score = 60;
      }

      return {
        friend,
        displayName: fullName || `Usuario #${friend.user.userNumber}`,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const filtered =
      scored[0]?.score > 0 ? scored.filter((x) => x.score > 0) : scored;

    return filtered.slice(0, limit);
  }

  private selectScopeEvents(
    scope: ListMyEventsScope,
    lists: Awaited<ReturnType<EventsService['findMyEventListsForUser']>>,
  ): EventListItemView[] {
    if (scope === 'attended') {
      return lists.attended;
    }
    if (scope === 'created') {
      return lists.managed.filter((event) =>
        event.managementRoles.includes('creator'),
      );
    }

    const map = new Map<number, EventListItemView>();
    for (const event of lists.attended) {
      map.set(event.id, event);
    }
    for (const event of lists.managed.filter((e) =>
      e.managementRoles.includes('creator'),
    )) {
      map.set(event.id, event);
    }
    return Array.from(map.values());
  }

  private matchesTimeframe(
    event: EventListItemView,
    timeframe: ListMyEventsTimeframe,
    now: Date,
  ): boolean {
    if (timeframe === 'all') {
      return true;
    }
    if (timeframe === 'upcoming') {
      return event.startsAt >= now;
    }
    if (timeframe === 'this_week') {
      return this.isInCurrentMadridWeek(event.startsAt, now);
    }
    return this.isSameMadridDay(event.startsAt, now);
  }

  private isSameMadridDay(a: Date, b: Date): boolean {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return a.toLocaleDateString('en-CA', options) === b.toLocaleDateString('en-CA', options);
  }

  private isInCurrentMadridWeek(eventDate: Date, now: Date): boolean {
    const eventDay = this.toMadridUtcMidnight(eventDate);
    const nowDay = this.toMadridUtcMidnight(now);

    const nowDayOfWeekSundayFirst = nowDay.getUTCDay(); // 0:Sun..6:Sat
    const daysSinceMonday = (nowDayOfWeekSundayFirst + 6) % 7; // 0:Mon..6:Sun

    const weekStart = new Date(nowDay);
    weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    return eventDay >= weekStart && eventDay <= weekEnd;
  }

  private toMadridUtcMidnight(value: Date): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);

    const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? '0');
    const day = Number(parts.find((p) => p.type === 'day')?.value ?? '0');

    return new Date(Date.UTC(year, month - 1, day));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private readNonEmptyString(
    obj: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = obj[key];
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private readFiniteNumber(
    obj: Record<string, unknown>,
    key: string,
  ): number | null {
    const value = obj[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    return value;
  }

  private toToolError(err: unknown): string {
    if (err instanceof HttpException) {
      const response = err.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (response as { message: string | string[] }).message;
        return Array.isArray(message) ? message.join('; ') : message;
      }
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Error desconocido al ejecutar la herramienta.';
  }
}
