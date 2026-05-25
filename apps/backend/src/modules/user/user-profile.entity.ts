import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserGender } from './user-enums';

// -------------------------------------------------------------------
// User profile entity
// Public identity and personal data (table `user_profiles`).
// -------------------------------------------------------------------
@Entity('user_profiles')
export class UserProfile {
  // ------------------------------------------------------------
  // Attributes
  // ------------------------------------------------------------

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userName: string;

  @Column({ unique: true })
  userNumber: number;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender: UserGender;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'bytea', nullable: true })
  profilePictureData: Buffer | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  profilePictureMimeType: string | null;

  // ------------------------------------------------------------
  // Relations
  // ------------------------------------------------------------

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
