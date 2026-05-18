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
// User Entity
// Represents the 'users' table in the database.
// -------------------------------------------------------------------
@Entity('users')
export class User {
  // ------------------------------------------------------------
  // Atributes.
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
   * Función con la que actúa la sesión. Si hay varias funciones en staff, queda null hasta que el usuario elija.
   */
  @Column({ type: 'enum', enum: StaffFunction, nullable: true })
  activeStaffFunction: StaffFunction | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  hashedRefreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  // ------------------------------------------------------------
  // Relations.
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
