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

// -------------------------------------------------------------------
// Event attendance entity
// One row per user registered for an event (unique per event + user).
// -------------------------------------------------------------------
@Entity('event_attendances')
@Unique('UQ_event_attendance_user', ['eventId', 'userId'])
export class EventAttendance {
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

  @CreateDateColumn()
  registeredAt: Date;
}
