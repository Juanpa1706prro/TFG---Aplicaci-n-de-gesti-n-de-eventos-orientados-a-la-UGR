import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserFaculty, UserCampus, UserDegree } from './user-enums';

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.studentProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'enum', enum: UserFaculty })
  faculty: UserFaculty;

  @Column({ type: 'enum', enum: UserCampus })
  campus: UserCampus;

  @Column({ type: 'enum', enum: UserDegree })
  degree: UserDegree;
}
