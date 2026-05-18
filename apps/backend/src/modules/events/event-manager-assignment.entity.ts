import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from './event.entity';

export enum EventManagerAssignmentRole {
  EDITOR = 'EDITOR',
  MODERATOR = 'MODERATOR',
}

@Entity('event_manager_assignments')
@Unique('UQ_event_manager_user', ['eventId', 'userId'])
export class EventManagerAssignment {
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

  @Column({ type: 'enum', enum: EventManagerAssignmentRole })
  role: EventManagerAssignmentRole;
}
