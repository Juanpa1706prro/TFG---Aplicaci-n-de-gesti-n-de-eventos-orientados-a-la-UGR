import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserFaculty, UserGender, UserCampus, UserDegree } from './user-enums';

@Entity('user_profiles')
export class UserProfile {
  // ------------------------------------------------------------
  // Atributes.
  // ------------------------------------------------------------
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userName: string;

  @Column({ unique: true })
  userNumber: number;

  //--- Personal Data ---

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

  // --- Academic Data ---

  @Column({ type: 'enum', enum: UserFaculty, nullable: true })
  faculty: UserFaculty;

  @Column({ type: 'enum', enum: UserCampus, nullable: true })
  campus: UserCampus;

  @Column({ type: 'enum', enum: UserDegree, nullable: true })
  degree: UserDegree;

  // --- Other data ---

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  profilePicture: string;

  // ------------------------------------------------------------
  // Relations.
  // ------------------------------------------------------------

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
