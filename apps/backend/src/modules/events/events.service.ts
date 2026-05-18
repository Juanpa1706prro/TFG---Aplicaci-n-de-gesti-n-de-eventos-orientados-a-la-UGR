import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event } from './event.entity';
import {
  EventManagerAssignment,
} from './event-manager-assignment.entity';
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
  durationMinutes: number;
};

export type MapMarkerView = {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  visibility: EventVisibility;
  createdAt: Date;
  startsAt: Date;
  durationMinutes: number;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventManagerAssignment)
    private readonly assignmentRepository: Repository<EventManagerAssignment>,
    private readonly usersService: UsersService,
    private readonly capabilityService: CapabilityService,
  ) {}

  /** Borra eventos ya finalizados (startsAt + duración < ahora). */
  private async purgeExpiredEvents(): Promise<void> {
    await this.eventRepository.query(
      `DELETE FROM events WHERE "startsAt" + ("durationMinutes" * interval '1 minute') < NOW()`,
    );
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

    await this.purgeExpiredEvents();

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
      startsAt: new Date(dto.startsAt),
      durationMinutes: dto.durationMinutes,
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
   * Marcadores para MapLibre: públicos con coordenadas para todos;
   * privados (p. ej. tutorías) solo si el usuario es creador o gestor asignado.
   */
  async findMapMarkersForUser(userId: number): Promise<MapMarkerView[]> {
    await this.purgeExpiredEvents();

    const publicEvents = await this.eventRepository.find({
      where: { visibility: EventVisibility.PUBLIC },
      select: {
        id: true,
        title: true,
        location: true,
        latitude: true,
        longitude: true,
        visibility: true,
        createdAt: true,
        startsAt: true,
        durationMinutes: true,
      },
    });

    const assignmentRows = await this.assignmentRepository.find({
      where: { userId },
      select: { eventId: true },
    });
    const managedEventIds = [
      ...new Set(assignmentRows.map((r) => r.eventId)),
    ];

    const privateAsCreator = await this.eventRepository.find({
      where: {
        visibility: EventVisibility.PRIVATE,
        creatorId: userId,
      },
      select: {
        id: true,
        title: true,
        location: true,
        latitude: true,
        longitude: true,
        visibility: true,
        createdAt: true,
        startsAt: true,
        durationMinutes: true,
      },
    });

    let privateAsManager: Event[] = [];
    if (managedEventIds.length > 0) {
      privateAsManager = await this.eventRepository.find({
        where: {
          visibility: EventVisibility.PRIVATE,
          id: In(managedEventIds),
        },
        select: {
          id: true,
          title: true,
          location: true,
          latitude: true,
          longitude: true,
          visibility: true,
          createdAt: true,
          startsAt: true,
          durationMinutes: true,
        },
      });
    }

    const byId = new Map<number, Event>();

    const consider = (e: Event) => {
      if (
        e.latitude != null &&
        e.longitude != null &&
        Number.isFinite(e.latitude) &&
        Number.isFinite(e.longitude)
      ) {
        byId.set(e.id, e);
      }
    };

    for (const e of publicEvents) {
      consider(e);
    }
    for (const e of privateAsCreator) {
      consider(e);
    }
    for (const e of privateAsManager) {
      consider(e);
    }

    return [...byId.values()]
      .sort((a, b) => a.id - b.id)
      .map((e) => ({
        id: e.id,
        title: e.title,
        location: e.location,
        latitude: e.latitude as number,
        longitude: e.longitude as number,
        visibility: e.visibility,
        createdAt: e.createdAt,
        startsAt: e.startsAt,
        durationMinutes: e.durationMinutes,
      }));
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
      durationMinutes: e.durationMinutes,
    };
  }
}
