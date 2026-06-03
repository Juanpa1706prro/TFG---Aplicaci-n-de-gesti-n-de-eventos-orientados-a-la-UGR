import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { StaffFunction, SystemRole } from './user-enums';
import { UserProfile } from './user-profile.entity';
import { StudentProfile } from './student-profile.entity';
import { StaffProfile } from './staff-profile.entity';
import { UserStaffFunction } from './user-staff-function.entity';

// -------------------------------------------------------------------
// User entity
// TypeORM model for table `users` (auth, roles, session persona, refresh tokens).
// -------------------------------------------------------------------
@Entity('users')
export class User {
  // ------------------------------------------------------------
  // Attributes
  // ------------------------------------------------------------

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: SystemRole, default: SystemRole.USER })
  role: SystemRole;

  @Column({ default: false })
  onboardingCompleted: boolean;

  /**
   * Staff function for the current session. Null until chosen when multiple functions exist.
   */
  @Column({ type: 'enum', enum: StaffFunction, nullable: true })
  activeStaffFunction: StaffFunction | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  hashedRefreshToken: string | null;

  /**
   * Incremented on each refresh rotation (OAuth BCP / reuse detection).
   */
  @Column({ type: 'int', default: 0 })
  refreshTokenVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ------------------------------------------------------------
  // Relations
  // ------------------------------------------------------------

  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: true,
  })
  profile: UserProfile;

  @OneToOne(() => StudentProfile, (sp) => sp.user, { cascade: true })
  studentProfile: StudentProfile | null;

  @OneToOne(() => StaffProfile, (sp) => sp.user, { cascade: true })
  staffProfile: StaffProfile | null;

  @OneToMany(() => UserStaffFunction, (link) => link.user)
  staffFunctionLinks: UserStaffFunction[];
}
