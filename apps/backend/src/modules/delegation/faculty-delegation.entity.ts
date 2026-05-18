import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { UserFaculty } from '../user/user-enums';

/** Delegación de estudiantes por facultad (estructura base; reglas de gobierno TBD). */
@Entity('faculty_delegations')
@Unique('UQ_faculty_delegation_faculty', ['faculty'])
export class FacultyDelegation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: UserFaculty })
  faculty: UserFaculty;

  @Column({ type: 'varchar', length: 200, default: '' })
  displayName: string;
}
