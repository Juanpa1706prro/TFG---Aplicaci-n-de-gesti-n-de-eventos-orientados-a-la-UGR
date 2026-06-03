import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, In, MoreThan } from 'typeorm';
import { Event } from './event.entity';
import {
  EventManagerAssignment,
  EventManagerAssignmentRole,
} from './event-manager-assignment.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventParticipant } from './event-participant.entity';
import { EventParticipantStatus } from './event-participant-status.enum';
import { UserProfile } from '../user/user-profile.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../user/user.entity';
import { UsersService } from '../user/user.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CapabilityService } from '../user/capability.service';
import { GlobalCapability } from '../user/user-enums';
import { EventVisibility } from './event-visibility.enum';
import { AllowedImageMimeType } from '../../common/image/image.constants';
import {
  hasStoredImage,
  parseUploadedImage,
} from '../../common/image/image-validation.util';

// -------------------------------------------------------------------
// Events Service
// Event CRUD, visibility rules, attendance, photos and scheduled cleanup.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Response shape after creating or updating an event. */
export type CreatedEventView = {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  latitude: number | null;
  longitude: number | null;
  visibility: EventVisibility;
  maxAttendees: number | null;
  creatorId: number;
  createdAt: Date;
  startsAt: Date;
  endsAt: Date;
};

/** Lightweight event data for map markers. */
export type MapMarkerView = {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  latitude: number;
  longitude: number;
  visibility: EventVisibility;
  maxAttendees: number | null;
  createdAt: Date;
  updatedAt: Date;
  startsAt: Date;
  endsAt: Date;
};

/** Public user summary shown on event detail (creator, managers, attendees). */
export type EventUserSummary = {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
};

/** Invitee row on a meeting (reunión) detail panel. */
export type EventParticipantView = {
  user: EventUserSummary;
  status: EventParticipantStatus;
  respondedAt: Date | null;
};

/** Full event detail for the side panel / event page. */
export type EventDetailView = MapMarkerView & {
  creator: EventUserSummary;
  managers: EventUserSummary[];
  attendees: EventUserSummary[];
  attendeeCount: number;
  isAttending: boolean;
  viewerIsCreator: boolean;
  isMeeting: boolean;
  viewerParticipantStatus: EventParticipantStatus | null;
  participants: EventParticipantView[];
  confirmedCount: number;
  pendingCount: number;
};

/** How the current user relates to an event in "my lists". */
export type EventManagementRole = 'creator' | 'editor' | 'moderator';

/** Row in the user's event list tabs. */
export type EventListItemView = {
  id: number;
  title: string;
  description: string;
  hasPhoto: boolean;
  location: string;
  visibility: EventVisibility;
  maxAttendees: number | null;
  startsAt: Date;
  endsAt: Date;
  managementRoles: EventManagementRole[];
};

/** Grouped lists for GET /events/my-lists. */
export type MyEventListsView = {
  active: EventListItemView[];
  attended: EventListItemView[];
  managed: EventListItemView[];
};

@Injectable()
export class EventsService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventManagerAssignment)
    private readonly assignmentRepository: Repository<EventManagerAssignment>,
    @InjectRepository(EventAttendance)
    private readonly attendanceRepository: Repository<EventAttendance>,
    @InjectRepository(EventParticipant)
    private readonly participantRepository: Repository<EventParticipant>,
    private readonly usersService: UsersService,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
    private readonly capabilityService: CapabilityService,
  ) {}

  // ------------------------------------------------------------
  // Scheduled jobs
  // ------------------------------------------------------------

  /**
   * Weekly cron: soft-deletes expired events without slowing map reads.
   * @returns {Promise<void>}
   */
  @Cron('0 3 * * 0')
  async softDeleteExpiredEventsWeekly(): Promise<void> {
    await this.softDeleteExpiredEvents();
  }

  /**
   * Bi-monthly cron: hard-deletes soft-deleted events older than two months.
   * @returns {Promise<void>}
   */
  @Cron('0 4 1 */2 *')
  async hardDeleteOldSoftDeletedEventsEveryTwoMonths(): Promise<void> {
    await this.eventRepository
      .createQueryBuilder()
      .delete()
      .where('"deletedAt" IS NOT NULL')
      .andWhere('"deletedAt" <= NOW() - interval \'2 months\'')
      .execute();
  }

  // ------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------

  /**
   * Creates an event and optional editor/moderator assignments.
   * @param {number} creatorUserId - Authenticated creator user id.
   * @param {CreateEventDto} dto - Event payload from POST /events.
   * @returns {Promise<{ message: string; event: CreatedEventView }>}
   * @throws {ForbiddenException} If the user cannot create events.
   * @throws {BadRequestException} On invalid dates, manager invites or meeting participants.
   */
  async create(
    creatorUserId: number,
    dto: CreateEventDto,
  ): Promise<{ message: string; event: CreatedEventView }> {
    const creator = await this.usersService.findByID(creatorUserId);
    if (!creator) {
      throw new ForbiddenException('Usuario no encontrado');
    }
    this.assertUserCanCreateEvents(creator);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior al inicio del evento.',
      );
    }

    const maxAttendees =
      dto.maxAttendees === undefined || dto.maxAttendees === null
        ? null
        : dto.maxAttendees;

    const visibility =
      dto.visibility === EventVisibility.PRIVATE
        ? EventVisibility.PRIVATE
        : EventVisibility.PUBLIC;

    const participantsInput = dto.participants ?? [];
    const managersInput = dto.managers ?? [];

    if (visibility === EventVisibility.PUBLIC && participantsInput.length > 0) {
      throw new BadRequestException(
        'Los eventos públicos no admiten participantes; usa una reunión (privada).',
      );
    }

    if (visibility === EventVisibility.PRIVATE) {
      if (managersInput.length > 0) {
        throw new BadRequestException(
          'Las reuniones no admiten gestores; añade participantes.',
        );
      }
      if (participantsInput.length === 0) {
        throw new BadRequestException(
          'Una reunión requiere al menos otra persona además del creador.',
        );
      }
    }

    const event = this.eventRepository.create({
      creatorId: creatorUserId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      location: dto.location.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      visibility,
      maxAttendees,
      startsAt,
      endsAt,
    });
    const saved = await this.eventRepository.save(event);

    if (visibility === EventVisibility.PRIVATE) {
      const participantRows = await this.buildMeetingParticipants(
        saved.id,
        creatorUserId,
        participantsInput,
      );
      const savedParticipants =
        await this.participantRepository.save(participantRows);
      await this.notificationsService.createMeetingInvitationNotifications(
        creatorUserId,
        saved.id,
        savedParticipants,
      );
    }

    const managers = managersInput;
    const seenNumbers = new Set<number>();
    const assignments: EventManagerAssignment[] = [];

    for (const m of managers) {
      if (seenNumbers.has(m.userNumber)) {
        throw new BadRequestException(
          `El número de usuario ${m.userNumber} está repetido en la lista.`,
        );
      }
      seenNumbers.add(m.userNumber);

      const target = await this.usersService.findByProfileUserNumber(
        m.userNumber,
      );
      if (!target) {
        throw new BadRequestException(
          `No existe ningún usuario con número ${m.userNumber}.`,
        );
      }
      if (target.id === creatorUserId) {
        throw new BadRequestException(
          'No hace falta añadirte a ti mismo como editor o moderador (ya eres el creador).',
        );
      }

      assignments.push(
        this.assignmentRepository.create({
          eventId: saved.id,
          userId: target.id,
          role: m.role,
        }),
      );
    }

    if (assignments.length > 0) {
      await this.assignmentRepository.save(assignments);
    }

    return {
      message:
        visibility === EventVisibility.PRIVATE ? 'Reunión creada' : 'Evento creado',
      event: this.toCreatedView(saved),
    };
  }

  /**
   * Recommends a public event to a friend (informational notification, no RSVP).
   * @param {number} eventId - Public event id.
   * @param {number} inviterUserId - Authenticated user recommending the event.
   * @param {number} targetUserNumber - Friend public profile number.
   * @returns {Promise<{ message: string; invitationId: number }>}
   * @throws {NotFoundException} If the event or user does not exist.
   * @throws {BadRequestException} On invalid target, non-friend or duplicate recommendation.
   * @throws {ForbiddenException} If the user cannot view the event.
   */
  async inviteFriendToPublicEvent(
    eventId: number,
    inviterUserId: number,
    targetUserNumber: number,
  ): Promise<{ message: string; invitationId: number }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event || event.deletedAt) {
      throw new NotFoundException('Evento no encontrado.');
    }

    if (event.visibility !== EventVisibility.PUBLIC) {
      throw new BadRequestException(
        'Solo puedes recomendar eventos públicos a tus amigos.',
      );
    }

    if (event.endsAt <= new Date()) {
      throw new BadRequestException('El evento ya ha finalizado.');
    }

    await this.assertUserCanViewEvent(event, inviterUserId);

    const target =
      await this.usersService.findByProfileUserNumber(targetUserNumber);
    if (!target) {
      throw new NotFoundException(
        `No existe ningún usuario con número ${targetUserNumber}.`,
      );
    }

    if (target.id === inviterUserId) {
      throw new BadRequestException(
        'No puedes recomendarte un evento a ti mismo.',
      );
    }

    if (!(await this.friendsService.areFriends(inviterUserId, target.id))) {
      throw new BadRequestException(
        'Solo puedes recomendar eventos a tus amigos.',
      );
    }

    const result = await this.notificationsService.createPublicEventRecommendation(
      inviterUserId,
      eventId,
      target.id,
    );

    return {
      message: 'Recomendación enviada',
      invitationId: result.invitationId,
    };
  }

  /**
   * Lists for the events page: active (public + reunions visible to the user), attended and managed.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<MyEventListsView>}
   */
  async findMyEventListsForUser(userId: number): Promise<MyEventListsView> {
    const activeEvents = await this.findVisibleActiveEventsForUser(userId);
    const active = activeEvents
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((e) => this.toEventListItem(e));

    const attendances = await this.attendanceRepository.find({
      where: { userId },
      relations: { event: true },
    });
    const attended = attendances
      .map((row) => row.event)
      .filter((e) => e && e.endsAt > new Date())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((e) => this.toEventListItem(e));

    const managed = await this.findManagedEventsForUser(userId);

    return { active, attended, managed };
  }

  /**
   * Map markers for MapLibre: public events for everyone; reunions for creator and invitees.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<MapMarkerView[]>} Events with valid coordinates only.
   */
  async findMapMarkersForUser(userId: number): Promise<MapMarkerView[]> {
    const events = await this.findVisibleActiveEventsForUser(userId);

    return events
      .filter(
        (e) =>
          e.latitude != null &&
          e.longitude != null &&
          Number.isFinite(e.latitude) &&
          Number.isFinite(e.longitude),
      )
      .sort((a, b) => a.id - b.id)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        hasPhoto: hasStoredImage(e.photoData),
        location: e.location,
        latitude: e.latitude as number,
        longitude: e.longitude as number,
        visibility: e.visibility,
        maxAttendees: e.maxAttendees,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
      }));
  }

  /**
   * Full event detail with creator, managers, attendees, meeting participants and viewer flags.
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<EventDetailView>}
   * @throws {NotFoundException} If the event does not exist or is not visible.
   * @throws {ForbiddenException} If the user may not view the reunión.
   */
  async findEventDetailForUser(
    eventId: number,
    userId: number,
  ): Promise<EventDetailView> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: { creator: { profile: true } },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }

    await this.assertUserCanViewEvent(event, userId);

    const isMeeting = event.visibility === EventVisibility.PRIVATE;
    const viewerIsCreator = event.creatorId === userId;

    const assignments = await this.assignmentRepository.find({
      where: { eventId },
      relations: { user: { profile: true } },
      order: { id: 'ASC' },
    });

    const attendances = await this.attendanceRepository.find({
      where: { eventId },
      relations: { user: { profile: true } },
      order: { registeredAt: 'ASC' },
    });

    let participants: EventParticipantView[] = [];
    let viewerParticipantStatus: EventParticipantStatus | null = null;
    let confirmedCount = 0;
    let pendingCount = 0;

    if (isMeeting) {
      const participantRows = await this.participantRepository.find({
        where: {
          eventId,
          status: In([
            EventParticipantStatus.PENDING,
            EventParticipantStatus.ACCEPTED,
          ]),
        },
        relations: { user: { profile: true } },
      });

      const sorted = this.sortMeetingParticipants(participantRows);
      participants = sorted.map((row) => ({
        user: this.toUserSummary(row.user.profile),
        status: row.status,
        respondedAt: row.respondedAt,
      }));
      confirmedCount = participants.filter(
        (p) => p.status === EventParticipantStatus.ACCEPTED,
      ).length;
      pendingCount = participants.filter(
        (p) => p.status === EventParticipantStatus.PENDING,
      ).length;

      if (!viewerIsCreator) {
        const viewerRow = participantRows.find((row) => row.userId === userId);
        viewerParticipantStatus = viewerRow?.status ?? null;
      }
    }

    const isAttending = isMeeting
      ? viewerParticipantStatus === EventParticipantStatus.ACCEPTED
      : attendances.some((row) => row.userId === userId);

    return {
      ...this.toMapMarkerView(event),
      creator: this.toUserSummary(event.creator.profile),
      managers: assignments.map((row) => this.toUserSummary(row.user.profile)),
      attendees: attendances.map((row) => this.toUserSummary(row.user.profile)),
      attendeeCount: attendances.length,
      isAttending,
      viewerIsCreator,
      isMeeting,
      viewerParticipantStatus,
      participants,
      confirmedCount,
      pendingCount,
    };
  }

  /**
   * Partial update by the event creator.
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id (must be creator).
   * @param {UpdateEventDto} dto - Partial fields to update.
   * @returns {Promise<{ message: string; event: CreatedEventView }>}
   */
  async updateEventByCreator(
    eventId: number,
    userId: number,
    dto: UpdateEventDto,
  ): Promise<{ message: string; event: CreatedEventView }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: { creator: true },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    this.assertUserIsCreator(event, userId);

    if (dto.title != null) {
      event.title = dto.title.trim();
    }
    if (dto.description != null) {
      event.description = dto.description.trim();
    }
    if (dto.location != null) {
      event.location = dto.location.trim();
    }
    if (dto.latitude != null) {
      event.latitude = dto.latitude;
    }
    if (dto.longitude != null) {
      event.longitude = dto.longitude;
    }
    if (dto.maxAttendees !== undefined) {
      event.maxAttendees = dto.maxAttendees;
    }

    let startsAt = event.startsAt;
    let endsAt = event.endsAt;
    if (dto.startsAt != null) {
      startsAt = new Date(dto.startsAt);
      event.startsAt = startsAt;
    }
    if (dto.endsAt != null) {
      endsAt = new Date(dto.endsAt);
      event.endsAt = endsAt;
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior al inicio del evento.',
      );
    }

    const saved = await this.eventRepository.save(event);
    return {
      message:
        saved.visibility === EventVisibility.PRIVATE
          ? 'Reunión actualizada'
          : 'Evento actualizado',
      event: this.toCreatedView(saved),
    };
  }

  /**
   * Soft-deletes an event (creator only).
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id (must be creator).
   * @returns {Promise<{ message: string }>}
   */
  async deleteEventByCreator(
    eventId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    this.assertUserIsCreator(event, userId);
    await this.eventRepository.softRemove(event);
    return { message: 'Evento eliminado' };
  }

  /**
   * Registers the user as attending an event (capacity and capability checks).
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<EventDetailView>} Updated detail after registration.
   */
  async attendEvent(eventId: number, userId: number): Promise<EventDetailView> {
    const user = await this.usersService.findByID(userId);
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }
    this.assertUserCanAttendEvents(user);

    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }

    await this.assertUserCanViewEvent(event, userId);

    if (event.endsAt <= new Date()) {
      throw new BadRequestException('El evento ya ha finalizado.');
    }

    if (event.visibility === EventVisibility.PRIVATE) {
      return this.acceptMeetingInvitation(eventId, userId);
    }

    const existing = await this.attendanceRepository.findOne({
      where: { eventId, userId },
    });
    if (existing) {
      return this.findEventDetailForUser(eventId, userId);
    }

    if (event.maxAttendees != null) {
      const count = await this.attendanceRepository.count({ where: { eventId } });
      if (count >= event.maxAttendees) {
        throw new BadRequestException('El evento ha alcanzado el aforo máximo.');
      }
    }

    await this.attendanceRepository.save(
      this.attendanceRepository.create({ eventId, userId }),
    );

    return this.findEventDetailForUser(eventId, userId);
  }

  /**
   * Removes the user's attendance registration for an event.
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<EventDetailView>} Updated detail after removal.
   */
  async unattendEvent(eventId: number, userId: number): Promise<EventDetailView> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }

    if (event.visibility === EventVisibility.PRIVATE) {
      throw new BadRequestException(
        'En una reunión confirma o rechaza la invitación; no puedes usar este endpoint.',
      );
    }

    await this.assertUserCanViewEvent(event, userId);

    await this.attendanceRepository.delete({ eventId, userId });

    return this.findEventDetailForUser(eventId, userId);
  }

  /**
   * Accepts a meeting invitation (PENDING → ACCEPTED) and registers attendance.
   * @param {number} eventId - Meeting event id.
   * @param {number} userId - Invited user id.
   * @returns {Promise<EventDetailView>} Updated event detail.
   */
  async acceptMeetingInvitation(
    eventId: number,
    userId: number,
  ): Promise<EventDetailView> {
    const user = await this.usersService.findByID(userId);
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }
    this.assertUserCanAttendEvents(user);

    const event = await this.requireActiveMeeting(eventId);
    const participant = await this.requireMeetingParticipantRow(eventId, userId);

    if (participant.status === EventParticipantStatus.REJECTED) {
      throw new BadRequestException('Ya rechazaste esta reunión.');
    }

    if (participant.status === EventParticipantStatus.ACCEPTED) {
      return this.findEventDetailForUser(eventId, userId);
    }

    participant.status = EventParticipantStatus.ACCEPTED;
    participant.respondedAt = new Date();
    await this.participantRepository.save(participant);

    await this.ensureAttendanceRegistered(event, userId);

    return this.findEventDetailForUser(eventId, userId);
  }

  /**
   * Rejects a meeting invitation (PENDING → REJECTED). Revokes map access for the invitee.
   * @param {number} eventId - Meeting event id.
   * @param {number} userId - Invited user id.
   * @returns {Promise<{ message: string }>}
   */
  async rejectMeetingInvitation(
    eventId: number,
    userId: number,
  ): Promise<{ message: string }> {
    await this.requireActiveMeeting(eventId);
    const participant = await this.requireMeetingParticipantRow(eventId, userId);

    if (participant.status === EventParticipantStatus.REJECTED) {
      return { message: 'Ya habías rechazado esta reunión.' };
    }

    if (participant.status === EventParticipantStatus.ACCEPTED) {
      throw new BadRequestException(
        'No puedes rechazar una reunión que ya has confirmado.',
      );
    }

    participant.status = EventParticipantStatus.REJECTED;
    participant.respondedAt = new Date();
    await this.participantRepository.save(participant);

    await this.attendanceRepository.delete({ eventId, userId });

    return { message: 'Invitación rechazada' };
  }

  /**
   * Returns stored event photo bytes for admin (includes soft-deleted events).
   * @param {number} eventId - Event id.
   * @returns {Promise<{ data: Buffer; mimeType: AllowedImageMimeType }>}
   */
  async getEventPhotoAsAdmin(
    eventId: number,
  ): Promise<{ data: Buffer; mimeType: AllowedImageMimeType }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      withDeleted: true,
    });
    if (!event || !hasStoredImage(event.photoData) || !event.photoMimeType) {
      throw new NotFoundException('Imagen no encontrada.');
    }
    return {
      data: event.photoData as Buffer,
      mimeType: event.photoMimeType as AllowedImageMimeType,
    };
  }

  /**
   * Returns stored event photo if the user may view the event.
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<{ data: Buffer; mimeType: AllowedImageMimeType }>}
   */
  async getEventPhoto(
    eventId: number,
    userId: number,
  ): Promise<{ data: Buffer; mimeType: AllowedImageMimeType }> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event || !hasStoredImage(event.photoData) || !event.photoMimeType) {
      throw new NotFoundException('Imagen no encontrada.');
    }
    await this.assertUserCanViewEvent(event, userId);
    return {
      data: event.photoData as Buffer,
      mimeType: event.photoMimeType as AllowedImageMimeType,
    };
  }

  /**
   * Stores or replaces the event photo (creator only).
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id (must be creator).
   * @param {Buffer} buffer - Raw image bytes.
   * @param {string} mimeType - Declared MIME type (validated).
   * @returns {Promise<{ message: string }>}
   */
  async setEventPhoto(
    eventId: number,
    userId: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    this.assertUserIsCreator(event, userId);
    const parsed = parseUploadedImage(buffer, mimeType);
    event.photoData = parsed.data;
    event.photoMimeType = parsed.mimeType;
    await this.eventRepository.save(event);
    return { message: 'Imagen del evento actualizada' };
  }

  /**
   * Clears the stored event photo (creator only).
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id (must be creator).
   * @returns {Promise<{ message: string }>}
   */
  async clearEventPhoto(
    eventId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    this.assertUserIsCreator(event, userId);
    event.photoData = null;
    event.photoMimeType = null;
    await this.eventRepository.save(event);
    return { message: 'Imagen del evento eliminada' };
  }

  /**
   * Stores or replaces the event photo as admin (no visibility check).
   * @param {number} eventId - Event id.
   * @param {Buffer} buffer - Raw image bytes.
   * @param {string} mimeType - Declared MIME type (validated).
   * @returns {Promise<{ message: string }>}
   */
  async setEventPhotoAsAdmin(
    eventId: number,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      withDeleted: true,
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    const parsed = parseUploadedImage(buffer, mimeType);
    event.photoData = parsed.data;
    event.photoMimeType = parsed.mimeType;
    await this.eventRepository.save(event);
    return { message: 'Imagen del evento actualizada' };
  }

  /**
   * Clears the stored event photo as admin.
   * @param {number} eventId - Event id.
   * @returns {Promise<{ message: string }>}
   */
  async clearEventPhotoAsAdmin(eventId: number): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      withDeleted: true,
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    event.photoData = null;
    event.photoMimeType = null;
    await this.eventRepository.save(event);
    return { message: 'Imagen del evento eliminada' };
  }

  // ------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------

  /**
   * Soft-deletes all events whose end time has passed.
   * @returns {Promise<void>}
   */
  private async softDeleteExpiredEvents(): Promise<void> {
    await this.eventRepository
      .createQueryBuilder()
      .softDelete()
      .where('"endsAt" <= NOW()')
      .andWhere('"deletedAt" IS NULL')
      .execute();
  }

  /**
   * Resolves and validates meeting invitees for POST /events (private).
   * @param {number} eventId - Saved event id.
   * @param {number} creatorUserId - Creator user id.
   * @param {CreateEventDto['participants']} invites - Raw invite list from DTO.
   * @returns {Promise<EventParticipant[]>} Rows ready to persist (status PENDING).
   * @throws {BadRequestException} On duplicates, self-invite or unknown user numbers.
   */
  private async buildMeetingParticipants(
    eventId: number,
    creatorUserId: number,
    invites: NonNullable<CreateEventDto['participants']>,
  ): Promise<EventParticipant[]> {
    const seenNumbers = new Set<number>();
    const rows: EventParticipant[] = [];

    for (const invite of invites) {
      if (seenNumbers.has(invite.userNumber)) {
        throw new BadRequestException(
          `El número de usuario ${invite.userNumber} está repetido en la lista de participantes.`,
        );
      }
      seenNumbers.add(invite.userNumber);

      const target = await this.usersService.findByProfileUserNumber(
        invite.userNumber,
      );
      if (!target) {
        throw new BadRequestException(
          `No existe ningún usuario con número ${invite.userNumber}.`,
        );
      }
      if (target.id === creatorUserId) {
        throw new BadRequestException(
          'No puedes añadirte a ti mismo como participante (ya eres el creador de la reunión).',
        );
      }

      if (!(await this.friendsService.areFriends(creatorUserId, target.id))) {
        throw new BadRequestException(
          `Solo puedes invitar a tus amigos. El usuario ${invite.userNumber} no está en tu lista de amigos.`,
        );
      }

      rows.push(
        this.participantRepository.create({
          eventId,
          userId: target.id,
          invitedById: creatorUserId,
          status: EventParticipantStatus.PENDING,
          respondedAt: null,
        }),
      );
    }

    return rows;
  }

  /**
   * Ensures the user has permission to create events.
   * @param {User} user - Creator candidate.
   * @throws {ForbiddenException} If capability is missing.
   */
  private assertUserCanCreateEvents(user: User): void {
    const fns = this.usersService.staffFunctionList(user);
    const caps = this.capabilityService.resolveGlobalCapabilities(
      fns,
      user.activeStaffFunction,
    );
    if (!caps.includes(GlobalCapability.CREATE_AND_MANAGE_OWN_EVENTS)) {
      throw new ForbiddenException(
        'Solo el personal con perfil de docencia/investigación puede crear eventos.',
      );
    }
  }

  /**
   * Active events visible to the user (public + reunions as creator or invited participant).
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<Event[]>}
   */
  private async findVisibleActiveEventsForUser(userId: number): Promise<Event[]> {
    const now = new Date();

    const publicEvents = await this.eventRepository.find({
      where: { visibility: EventVisibility.PUBLIC, endsAt: MoreThan(now) },
    });

    const privateAsCreator = await this.eventRepository.find({
      where: {
        visibility: EventVisibility.PRIVATE,
        creatorId: userId,
        endsAt: MoreThan(now),
      },
    });

    const participantRows = await this.participantRepository.find({
      where: {
        userId,
        status: In([
          EventParticipantStatus.PENDING,
          EventParticipantStatus.ACCEPTED,
        ]),
      },
      select: { eventId: true },
    });
    const invitedEventIds = [
      ...new Set(participantRows.map((row) => row.eventId)),
    ];

    let privateAsParticipant: Event[] = [];
    if (invitedEventIds.length > 0) {
      privateAsParticipant = await this.eventRepository.find({
        where: {
          visibility: EventVisibility.PRIVATE,
          id: In(invitedEventIds),
          endsAt: MoreThan(now),
        },
      });
    }

    const byId = new Map<number, Event>();
    for (const e of publicEvents) {
      byId.set(e.id, e);
    }
    for (const e of privateAsCreator) {
      byId.set(e.id, e);
    }
    for (const e of privateAsParticipant) {
      byId.set(e.id, e);
    }

    return [...byId.values()];
  }

  /**
   * Events the user creates or manages (for "managed" list tab).
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<EventListItemView[]>}
   */
  private async findManagedEventsForUser(
    userId: number,
  ): Promise<EventListItemView[]> {
    const now = new Date();

    const created = await this.eventRepository.find({
      where: { creatorId: userId, endsAt: MoreThan(now) },
    });

    const assignments = await this.assignmentRepository.find({
      where: { userId },
      relations: { event: true },
    });

    const byId = new Map<number, { event: Event; roles: Set<EventManagementRole> }>();

    for (const e of created) {
      byId.set(e.id, { event: e, roles: new Set(['creator']) });
    }

    for (const row of assignments) {
      if (!row.event || row.event.endsAt <= now) {
        continue;
      }
      const role =
        row.role === EventManagerAssignmentRole.EDITOR ? 'editor' : 'moderator';
      const existing = byId.get(row.event.id);
      if (existing) {
        existing.roles.add(role);
      } else {
        byId.set(row.event.id, { event: row.event, roles: new Set([role]) });
      }
    }

    return [...byId.values()]
      .sort((a, b) => a.event.startsAt.getTime() - b.event.startsAt.getTime())
      .map(({ event, roles }) =>
        this.toEventListItem(event, [...roles].sort()),
      );
  }

  /**
   * Maps an Event entity to a list item view.
   * @param {Event} e - Event row.
   * @param {EventManagementRole[]} [managementRoles] - Roles for managed tab.
   * @returns {EventListItemView}
   */
  private toEventListItem(
    e: Event,
    managementRoles: EventManagementRole[] = [],
  ): EventListItemView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      hasPhoto: hasStoredImage(e.photoData),
      location: e.location,
      visibility: e.visibility,
      maxAttendees: e.maxAttendees,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      managementRoles,
    };
  }

  /**
   * Ensures the user may register attendance (ATTEND_EVENTS capability).
   * @param {User} user - Attendee candidate.
   * @throws {ForbiddenException} If capability is missing.
   */
  private assertUserCanAttendEvents(user: User): void {
    const fns = this.usersService.staffFunctionList(user);
    const caps = this.capabilityService.resolveGlobalCapabilities(
      fns,
      user.activeStaffFunction,
    );
    if (!caps.includes(GlobalCapability.ATTEND_EVENTS)) {
      throw new ForbiddenException('No puedes apuntarte a eventos con tu perfil actual.');
    }
  }

  /**
   * Ensures the user is the event creator.
   * @param {Event} event - Target event.
   * @param {number} userId - Authenticated user id.
   * @throws {ForbiddenException} If not the creator.
   */
  private assertUserIsCreator(event: Event, userId: number): void {
    if (event.creatorId !== userId) {
      throw new ForbiddenException('Solo el creador puede modificar este evento.');
    }
  }

  /**
   * Whether the user is an invited meeting participant with map/detail access.
   * @param {number} eventId - Meeting event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<boolean>}
   */
  private async userHasMeetingAccess(
    eventId: number,
    userId: number,
  ): Promise<boolean> {
    return this.participantRepository.exists({
      where: {
        eventId,
        userId,
        status: In([
          EventParticipantStatus.PENDING,
          EventParticipantStatus.ACCEPTED,
        ]),
      },
    });
  }

  /**
   * Loads an active private meeting or throws.
   * @param {number} eventId - Event id.
   * @returns {Promise<Event>}
   */
  private async requireActiveMeeting(eventId: number): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    if (event.visibility !== EventVisibility.PRIVATE) {
      throw new BadRequestException('Esta acción solo aplica a reuniones.');
    }
    if (event.endsAt <= new Date()) {
      throw new BadRequestException('La reunión ya ha finalizado.');
    }
    return event;
  }

  /**
   * Loads the invitee row for a meeting or throws.
   * @param {number} eventId - Event id.
   * @param {number} userId - Invited user id.
   * @returns {Promise<EventParticipant>}
   */
  private async requireMeetingParticipantRow(
    eventId: number,
    userId: number,
  ): Promise<EventParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { eventId, userId },
    });
    if (!participant) {
      throw new ForbiddenException('No estás invitado a esta reunión.');
    }
    return participant;
  }

  /**
   * Creates an attendance row if missing (respects maxAttendees).
   * @param {Event} event - Target event.
   * @param {number} userId - Attendee user id.
   * @returns {Promise<void>}
   */
  private async ensureAttendanceRegistered(
    event: Event,
    userId: number,
  ): Promise<void> {
    const existing = await this.attendanceRepository.findOne({
      where: { eventId: event.id, userId },
    });
    if (existing) {
      return;
    }

    if (event.maxAttendees != null) {
      const count = await this.attendanceRepository.count({
        where: { eventId: event.id },
      });
      if (count >= event.maxAttendees) {
        throw new BadRequestException('La reunión ha alcanzado el aforo máximo.');
      }
    }

    await this.attendanceRepository.save(
      this.attendanceRepository.create({ eventId: event.id, userId }),
    );
  }

  /**
   * Enforces visibility rules: public, creator, or meeting participant (PENDING/ACCEPTED).
   * @param {Event} event - Target event.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<void>}
   * @throws {NotFoundException} For hidden finished events.
   * @throws {ForbiddenException} For reunions without access.
   */
  private async assertUserCanViewEvent(event: Event, userId: number): Promise<void> {
    if (event.creatorId === userId) {
      return;
    }

    if (event.endsAt <= new Date()) {
      throw new NotFoundException('Evento no encontrado.');
    }

    if (event.visibility === EventVisibility.PUBLIC) {
      return;
    }

    if (await this.userHasMeetingAccess(event.id, userId)) {
      return;
    }

    throw new ForbiddenException('No tienes acceso a este evento.');
  }

  /**
   * Maps a UserProfile to EventUserSummary.
   * @param {UserProfile} profile - User profile row.
   * @returns {EventUserSummary}
   */
  private toUserSummary(profile: UserProfile): EventUserSummary {
    return {
      userNumber: profile.userNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      hasProfilePicture: hasStoredImage(profile.profilePictureData),
    };
  }

  /**
   * Sorts meeting participants: ACCEPTED first, then PENDING; by display name within each group.
   * @param {EventParticipant[]} rows - Participant rows with user.profile loaded.
   * @returns {EventParticipant[]}
   */
  private sortMeetingParticipants(rows: EventParticipant[]): EventParticipant[] {
    const statusRank = (status: EventParticipantStatus): number =>
      status === EventParticipantStatus.ACCEPTED ? 0 : 1;

    return [...rows].sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) {
        return byStatus;
      }
      return this.profileDisplayName(a.user.profile).localeCompare(
        this.profileDisplayName(b.user.profile),
        'es',
      );
    });
  }

  /**
   * Display name for sorting participant lists.
   * @param {UserProfile} profile - User profile row.
   * @returns {string}
   */
  private profileDisplayName(profile: UserProfile): string {
    const parts = [profile.firstName, profile.lastName].filter(
      (part): part is string => Boolean(part?.trim()),
    );
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return String(profile.userNumber);
  }

  /**
   * Maps an Event to MapMarkerView (assumes coordinates are set).
   * @param {Event} e - Event row.
   * @returns {MapMarkerView}
   */
  private toMapMarkerView(e: Event): MapMarkerView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      hasPhoto: hasStoredImage(e.photoData),
      location: e.location,
      latitude: e.latitude as number,
      longitude: e.longitude as number,
      visibility: e.visibility,
      maxAttendees: e.maxAttendees,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    };
  }

  /**
   * Maps an Event to CreatedEventView.
   * @param {Event} e - Event row.
   * @returns {CreatedEventView}
   */
  private toCreatedView(e: Event): CreatedEventView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      hasPhoto: hasStoredImage(e.photoData),
      location: e.location,
      latitude: e.latitude,
      longitude: e.longitude,
      visibility: e.visibility,
      maxAttendees: e.maxAttendees,
      creatorId: e.creatorId,
      createdAt: e.createdAt,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    };
  }
}
