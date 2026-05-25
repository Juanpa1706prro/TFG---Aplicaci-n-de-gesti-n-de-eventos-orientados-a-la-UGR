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
import { UserProfile } from '../user/user-profile.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../user/user.entity';
import { UsersService } from '../user/user.service';
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

/** Full event detail for the side panel / event page. */
export type EventDetailView = MapMarkerView & {
  creator: EventUserSummary;
  managers: EventUserSummary[];
  attendees: EventUserSummary[];
  attendeeCount: number;
  isAttending: boolean;
  viewerIsCreator: boolean;
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
    private readonly usersService: UsersService,
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
   * @throws {BadRequestException} On invalid dates or manager invites.
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

    const managers = dto.managers ?? [];
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
      message: 'Evento creado',
      event: this.toCreatedView(saved),
    };
  }

  /**
   * Lists for the events page: active visible, attended and managed.
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
   * Map markers for MapLibre: public events for everyone; private only for creator/managers.
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
   * Full event detail with creator, managers, attendees and viewer flags.
   * @param {number} eventId - Event id.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<EventDetailView>}
   * @throws {NotFoundException} If the event does not exist or is not visible.
   * @throws {ForbiddenException} If the user may not view a private event.
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

    const isAttending = attendances.some((row) => row.userId === userId);

    return {
      ...this.toMapMarkerView(event),
      creator: this.toUserSummary(event.creator.profile),
      managers: assignments.map((row) => this.toUserSummary(row.user.profile)),
      attendees: attendances.map((row) => this.toUserSummary(row.user.profile)),
      attendeeCount: attendances.length,
      isAttending,
      viewerIsCreator: event.creatorId === userId,
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
    if (dto.visibility != null) {
      event.visibility =
        dto.visibility === EventVisibility.PRIVATE
          ? EventVisibility.PRIVATE
          : EventVisibility.PUBLIC;
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
      message: 'Evento actualizado',
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

    await this.assertUserCanViewEvent(event, userId);

    await this.attendanceRepository.delete({ eventId, userId });

    return this.findEventDetailForUser(eventId, userId);
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
   * Active events visible to the user (public + private as creator or manager).
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<Event[]>}
   */
  private async findVisibleActiveEventsForUser(userId: number): Promise<Event[]> {
    const now = new Date();

    const publicEvents = await this.eventRepository.find({
      where: { visibility: EventVisibility.PUBLIC, endsAt: MoreThan(now) },
    });

    const assignmentRows = await this.assignmentRepository.find({
      where: { userId },
      select: { eventId: true },
    });
    const managedEventIds = [...new Set(assignmentRows.map((r) => r.eventId))];

    const privateAsCreator = await this.eventRepository.find({
      where: {
        visibility: EventVisibility.PRIVATE,
        creatorId: userId,
        endsAt: MoreThan(now),
      },
    });

    let privateAsManager: Event[] = [];
    if (managedEventIds.length > 0) {
      privateAsManager = await this.eventRepository.find({
        where: {
          visibility: EventVisibility.PRIVATE,
          id: In(managedEventIds),
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
    for (const e of privateAsManager) {
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
   * Enforces visibility rules: public, creator, manager, or finished (creator only).
   * @param {Event} event - Target event.
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<void>}
   * @throws {NotFoundException} For hidden finished events.
   * @throws {ForbiddenException} For private events without access.
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

    const isManager = await this.assignmentRepository.exists({
      where: { eventId: event.id, userId },
    });
    if (isManager) {
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
