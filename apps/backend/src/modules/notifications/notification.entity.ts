import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from '../events/event.entity';
import { EventParticipant } from '../events/event-participant.entity';
import { FriendRequest } from '../friends/friend-request.entity';
import { NotificationType } from './notification-type.enum';
import { EventInvitation } from './event-invitation.entity';

// -------------------------------------------------------------------
// Notification entity
// Per-user inbox row; source tables remain the business truth.
// -------------------------------------------------------------------
@Entity('notifications')
@Index('IDX_notifications_recipient_read', ['recipientId', 'readAt'])
@Index('IDX_notifications_recipient_created', ['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column()
  actorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ nullable: true })
  eventId: number | null;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event | null;

  @Column({ nullable: true })
  friendRequestId: number | null;

  @ManyToOne(() => FriendRequest, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'friendRequestId' })
  friendRequest: FriendRequest | null;

  @Column({ nullable: true })
  eventParticipantId: number | null;

  @ManyToOne(() => EventParticipant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'eventParticipantId' })
  eventParticipant: EventParticipant | null;

  @Column({ nullable: true })
  eventInvitationId: number | null;

  @ManyToOne(() => EventInvitation, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'eventInvitationId' })
  eventInvitation: EventInvitation | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
