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

/**
 * Amistad confirmada entre dos usuarios (una fila por pareja).
 * userLowId / userHighId = min/max de los dos user id (par canónico).
 */
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
