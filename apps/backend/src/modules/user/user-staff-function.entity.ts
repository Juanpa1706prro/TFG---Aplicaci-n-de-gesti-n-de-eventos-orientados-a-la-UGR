import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { StaffFunction } from './user-enums';

// -------------------------------------------------------------------
// User staff function link entity
// Many-to-many style link: user may have multiple StaffFunction values.
// -------------------------------------------------------------------
@Entity('user_staff_functions')
@Unique('UQ_user_staff_fn', ['user', 'function'])
export class UserStaffFunction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.staffFunctionLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: StaffFunction })
  function: StaffFunction;
}
