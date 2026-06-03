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

// -------------------------------------------------------------------
// Friendship entity
// Confirmed friendship between two users (one row per pair).
// userLowId / userHighId = min/max of the two user ids (canonical pair).
// -------------------------------------------------------------------
@Entity('friendships')
@Unique('UQ_friendship_pair', ['userLowId', 'userHighId'])
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userLowId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userLowId' })
  userLow: User;

  @Column()
  userHighId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userHighId' })
  userHigh: User;

  @CreateDateColumn()
  createdAt: Date;
}
