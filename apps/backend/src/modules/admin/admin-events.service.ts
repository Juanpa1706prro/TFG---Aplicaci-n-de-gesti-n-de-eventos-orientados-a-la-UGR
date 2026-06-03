import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { EventAttendance } from '../events/event-attendance.entity';
import { EventManagerAssignment } from '../events/event-manager-assignment.entity';
import { EventVisibility } from '../events/event-visibility.enum';
import { ListAdminEventsQueryDto } from './dto/list-admin-events.query.dto';
import { AdminUpdateEventDto } from './dto/admin-update-event.dto';
import { hasStoredImage } from '../../common/image/image-validation.util';

// -------------------------------------------------------------------
// Admin Events Service
// List, read, update and delete events for the operator panel.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Summary row for GET /admin/events list. */
export type AdminEventListItem = {
  id: number;
  title: string;
  location: string;
  visibility: EventVisibility;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  deletedAt: string | null;
  finished: boolean;
  creatorId: number;
  creatorUserNumber: number | null;
  creatorLabel: string | null;
};

/** Full event view for GET /admin/events/:id. */
export type AdminEventDetail = AdminEventListItem & {
  description: string;
  hasPhoto: boolean;
  latitude: number | null;
  longitude: number | null;
  maxAttendees: number | null;
  updatedAt: string;
  attendeeCount: number;
  managerCount: number;
};

@Injectable()
export class AdminEventsService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventAttendance)
    private readonly attendanceRepository: Repository<EventAttendance>,
    @InjectRepository(EventManagerAssignment)
    private readonly assignmentRepository: Repository<EventManagerAssignment>,
  ) {}

  // ------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------

  /**
   * Paginated event list with status filter and optional title/location search.
   * @param {ListAdminEventsQueryDto} query - Pagination, sort, status and search options.
   * @returns {Promise<object>} items, page, limit and hasMore flag.
   */
  async listEvents(query: ListAdminEventsQueryDto): Promise<{
    items: AdminEventListItem[];
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const page = query.page ?? 0;
    const limit = Math.min(query.limit ?? 25, 50);
    const sort = query.sort ?? 'createdAt';
    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const status = query.status ?? 'all';
    const q = query.q?.trim();

    const qb = this.eventRepository
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.creator', 'creator')
      .leftJoinAndSelect('creator.profile', 'creatorProfile');

    if (query.includeDeleted) {
      qb.withDeleted();
    }

    if (status === 'active') {
      qb.andWhere('event.endsAt > NOW()');
    } else if (status === 'finished') {
      qb.andWhere('event.endsAt <= NOW()');
    }

    if (q) {
      const like = `%${this.escapeLike(q)}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('event.title ILIKE :like', { like });
          sub.orWhere('event.location ILIKE :like', { like });
        }),
      );
    }

    if (sort === 'title') {
      qb.orderBy('event.title', order).addOrderBy('event.id', order);
    } else {
      qb.orderBy('event.createdAt', order).addOrderBy('event.id', order);
    }

    qb.skip(page * limit).take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const now = Date.now();

    return {
      items: slice.map((event) => this.toListItem(event, now)),
      page,
      limit,
      hasMore,
    };
  }

  /**
   * Loads a single event with attendee and manager counts (includes soft-deleted).
   * @param {number} id - Event id.
   * @returns {Promise<AdminEventDetail>} Full admin event detail.
   * @throws {NotFoundException} If the event does not exist.
   */
  async getEventDetail(id: number): Promise<AdminEventDetail> {
    const event = await this.eventRepository
      .createQueryBuilder('event')
      .withDeleted()
      .innerJoinAndSelect('event.creator', 'creator')
      .leftJoinAndSelect('creator.profile', 'creatorProfile')
      .where('event.id = :id', { id })
      .getOne();

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const [attendeeCount, managerCount] = await Promise.all([
      this.attendanceRepository.count({ where: { eventId: id } }),
      this.assignmentRepository.count({ where: { eventId: id } }),
    ]);

    return {
      ...this.toListItem(event, Date.now()),
      description: event.description,
      hasPhoto: hasStoredImage(event.photoData),
      latitude: event.latitude,
      longitude: event.longitude,
      maxAttendees: event.maxAttendees,
      updatedAt: this.formatDateTimeIso(event.updatedAt),
      attendeeCount,
      managerCount,
    };
  }

  /**
   * Applies partial updates and optional soft-delete restore, then returns fresh detail.
   * @param {number} id - Event id.
   * @param {AdminUpdateEventDto} dto - Partial event fields and optional restore flag.
   * @returns {Promise<{ message: string; event: AdminEventDetail }>}
   * @throws {NotFoundException} If the event does not exist.
   * @throws {BadRequestException} If endsAt is not after startsAt.
   */
  async updateEvent(
    id: number,
    dto: AdminUpdateEventDto,
  ): Promise<{ message: string; event: AdminEventDetail }> {
    const event = await this.eventRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['creator', 'creator.profile'],
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    if (dto.restore === true && event.deletedAt) {
      await this.eventRepository.restore(id);
      event.deletedAt = null;
    }

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

    await this.eventRepository.save(event);
    return {
      message: 'Evento actualizado',
      event: await this.getEventDetail(id),
    };
  }

  /**
   * Soft-deletes an active event, or permanently removes one already soft-deleted.
   * @param {number} id - Event id.
   * @returns {Promise<{ message: string }>}
   * @throws {NotFoundException} If the event does not exist.
   */
  async deleteEvent(id: number): Promise<{ message: string }> {
    const event = await this.eventRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    if (event.deletedAt) {
      await this.eventRepository.remove(event);
      return { message: 'Evento eliminado permanentemente' };
    }
    await this.eventRepository.softRemove(event);
    return { message: 'Evento eliminado' };
  }

  // ------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------

  /**
   * Maps an Event entity to a list item DTO.
   * @param {Event} event - Event with creator profile loaded.
   * @param {number} nowMs - Current timestamp for finished flag.
   * @returns {AdminEventListItem}
   */
  private toListItem(event: Event, nowMs: number): AdminEventListItem {
    const profile = event.creator?.profile;
    const endsMs = event.endsAt instanceof Date
      ? event.endsAt.getTime()
      : new Date(event.endsAt).getTime();
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
    const creatorLabel =
      parts.length > 0
        ? parts.join(' ')
        : profile?.userName?.trim() || null;

    return {
      id: event.id,
      title: event.title,
      location: event.location,
      visibility: event.visibility,
      startsAt: this.formatDateTimeIso(event.startsAt),
      endsAt: this.formatDateTimeIso(event.endsAt),
      createdAt: this.formatDateTimeIso(event.createdAt),
      deletedAt: event.deletedAt
        ? this.formatDateTimeIso(event.deletedAt)
        : null,
      finished: Number.isFinite(endsMs) && endsMs <= nowMs,
      creatorId: event.creatorId,
      creatorUserNumber: profile?.userNumber ?? null,
      creatorLabel,
    };
  }

  /**
   * Escapes SQL LIKE wildcards in search input.
   * @param {string} value - Raw search string.
   * @returns {string} Escaped string safe for ILIKE patterns.
   */
  private escapeLike(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /**
   * Normalizes a timestamp to ISO 8601 string.
   * @param {Date | string} value - Date column from the database.
   * @returns {string} ISO datetime string.
   */
  private formatDateTimeIso(value: Date | string): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toISOString();
  }
}
