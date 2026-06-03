import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from './event.entity';
import { EventParticipantStatus } from './event-participant-status.enum';

// -------------------------------------------------------------------
// Event participant entity
// Invited users for private meetings (reuniones). One row per invitee.
// -------------------------------------------------------------------
@Entity('event_participants')
@Unique('UQ_event_participant_user', ['eventId', 'userId'])
export class EventParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  invitedById: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @Column({
    type: 'enum',
    enum: EventParticipantStatus,
    default: EventParticipantStatus.PENDING,
  })
  status: EventParticipantStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;
}
