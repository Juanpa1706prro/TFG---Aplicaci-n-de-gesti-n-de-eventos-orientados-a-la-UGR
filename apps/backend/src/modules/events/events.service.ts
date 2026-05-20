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
import { User } from '../user/user.entity';
import { UsersService } from '../user/user.service';
import { CapabilityService } from '../user/capability.service';
import { GlobalCapability } from '../user/user-enums';
import { EventVisibility } from './event-visibility.enum';

export type CreatedEventView = {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
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

export type MapMarkerView = {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
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

export type EventUserSummary = {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
};

export type EventDetailView = MapMarkerView & {
  creator: EventUserSummary;
  managers: EventUserSummary[];
  attendees: EventUserSummary[];
  attendeeCount: number;
  isAttending: boolean;
};

export type EventManagementRole = 'creator' | 'editor' | 'moderator';

export type EventListItemView = {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
  location: string;
  visibility: EventVisibility;
  maxAttendees: number | null;
  startsAt: Date;
  endsAt: Date;
  managementRoles: EventManagementRole[];
};

export type MyEventListsView = {
  active: EventListItemView[];
  attended: EventListItemView[];
  managed: EventListItemView[];
};

@Injectable()
export class EventsService {
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

  /** Marca como eliminados los eventos vencidos sin penalizar las lecturas del mapa. */
  @Cron('0 3 * * 0')
  async softDeleteExpiredEventsWeekly(): Promise<void> {
    await this.softDeleteExpiredEvents();
  }

  /** Borra físicamente histórico ya soft-deleted con al menos 2 meses de retención. */
  @Cron('0 4 1 */2 *')
  async hardDeleteOldSoftDeletedEventsEveryTwoMonths(): Promise<void> {
    await this.eventRepository
      .createQueryBuilder()
      .delete()
      .where('"deletedAt" IS NOT NULL')
      .andWhere('"deletedAt" <= NOW() - interval \'2 months\'')
      .execute();
  }

  private async softDeleteExpiredEvents(): Promise<void> {
    await this.eventRepository
      .createQueryBuilder()
      .softDelete()
      .where('"endsAt" <= NOW()')
      .andWhere('"deletedAt" IS NULL')
      .execute();
  }

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
      photoUrl: dto.photoUrl?.trim() ? dto.photoUrl.trim() : null,
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

  /** Listas para la página de eventos (activos, apuntados, gestionados). */
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
   * Marcadores para MapLibre: públicos con coordenadas para todos;
   * privados (p. ej. tutorías) solo si el usuario es creador o gestor asignado.
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
        photoUrl: e.photoUrl,
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

  private toEventListItem(
    e: Event,
    managementRoles: EventManagementRole[] = [],
  ): EventListItemView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      photoUrl: e.photoUrl,
      location: e.location,
      visibility: e.visibility,
      maxAttendees: e.maxAttendees,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      managementRoles,
    };
  }

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
    };
  }

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

  async unattendEvent(eventId: number, userId: number): Promise<EventDetailView> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }

    await this.assertUserCanViewEvent(event, userId);

    await this.attendanceRepository.delete({ eventId, userId });

    return this.findEventDetailForUser(eventId, userId);
  }

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

  private async assertUserCanViewEvent(event: Event, userId: number): Promise<void> {
    if (event.endsAt <= new Date()) {
      throw new NotFoundException('Evento no encontrado.');
    }

    if (event.visibility === EventVisibility.PUBLIC) {
      return;
    }

    if (event.creatorId === userId) {
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

  private toUserSummary(profile: UserProfile): EventUserSummary {
    return {
      userNumber: profile.userNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profilePicture: profile.profilePicture,
    };
  }

  private toMapMarkerView(e: Event): MapMarkerView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      photoUrl: e.photoUrl,
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

  private toCreatedView(e: Event): CreatedEventView {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      photoUrl: e.photoUrl,
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
