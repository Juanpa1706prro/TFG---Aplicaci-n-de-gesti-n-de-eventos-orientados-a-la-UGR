import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { EventVisibility } from './event-visibility.enum';

// -------------------------------------------------------------------
// Event entity
// TypeORM model for table `events` (map markers, detail, soft delete).
// -------------------------------------------------------------------
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'bytea', nullable: true })
  photoData: Buffer | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  photoMimeType: string | null;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  /** WGS84 coordinates for MapLibre marker placement. */
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 20, default: EventVisibility.PUBLIC })
  visibility: EventVisibility;

  /** null = unlimited attendees */
  @Column({ type: 'int', nullable: true })
  maxAttendees: number | null;

  /** Event start (UTC in database). */
  @Column({ type: 'timestamptz' })
  startsAt: Date;

  /** Event end (UTC in database). Used to filter active map markers. */
  @Index('IDX_events_endsAt')
  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
