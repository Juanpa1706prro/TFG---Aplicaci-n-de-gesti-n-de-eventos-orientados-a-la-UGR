import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.staffProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /** Departamento o instituto para profesorado/PDI. */
  @Column({ type: 'varchar', length: 200 })
  department: string;
}
