import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from './roles';
import { UserProfile } from './user-profile.entity';

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

  @Column({ unique: true })
  userNumber: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

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
}
