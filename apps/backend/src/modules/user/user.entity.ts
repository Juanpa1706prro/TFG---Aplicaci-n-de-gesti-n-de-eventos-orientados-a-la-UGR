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
import { UserRole } from './user-enums';
import { UserProfile } from './user-profile.entity';
import { StudentProfile } from './student-profile.entity';
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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  onboardingCompleted: boolean;

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

  @OneToMany(() => UserStaffFunction, (link) => link.user)
  staffFunctionLinks: UserStaffFunction[];
}
