import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from '../events/event.entity';

// -------------------------------------------------------------------
// Event invitation entity
// A user recommends a public event to a friend (informational, no RSVP).
// -------------------------------------------------------------------
@Entity('event_invitations')
@Unique('UQ_event_invitation_triple', ['eventId', 'inviterId', 'inviteeId'])
@Check(`"inviterId" <> "inviteeId"`)
@Index('IDX_event_invitations_invitee', ['inviteeId'])
export class EventInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  inviterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviterId' })
  inviter: User;

  @Column()
  inviteeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviteeId' })
  invitee: User;

  @CreateDateColumn()
  createdAt: Date;
}
