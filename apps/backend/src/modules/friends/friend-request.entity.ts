import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

/** Cola de solicitudes de amistad pendientes; se elimina al aceptar, rechazar o cancelar. */
@Entity('friend_requests')
@Check(`"fromUserId" <> "toUserId"`)
@Index('IDX_friend_requests_to', ['toUserId'])
@Index('IDX_friend_requests_from', ['fromUserId'])
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column()
  toUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
