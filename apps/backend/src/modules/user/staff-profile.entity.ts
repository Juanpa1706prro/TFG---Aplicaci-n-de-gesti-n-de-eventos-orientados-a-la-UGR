import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

// -------------------------------------------------------------------
// Staff profile entity
// Department / institute for teaching and research staff.
// -------------------------------------------------------------------
@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.staffProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /** Department or institute for professor / PDI roles. */
  @Column({ type: 'varchar', length: 200 })
  department: string;
}
