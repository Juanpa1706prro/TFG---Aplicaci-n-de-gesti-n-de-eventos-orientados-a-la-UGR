import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { FacultyDelegation } from './faculty-delegation.entity';

@Entity('delegation_memberships')
@Unique('UQ_delegation_member_user', ['delegationId', 'userId'])
export class DelegationMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  delegationId: number;

  @ManyToOne(() => FacultyDelegation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegationId' })
  delegation: FacultyDelegation;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Ej.: MEMBER, BOARD, CHAIR — gobierno detallado pendiente. */
  @Column({ type: 'varchar', length: 64, default: 'MEMBER' })
  memberRole: string;
}
