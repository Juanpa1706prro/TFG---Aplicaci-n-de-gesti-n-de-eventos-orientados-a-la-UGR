import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Exclude } from 'class-transformer';

// -------------------------------------------------------------------
// User Entity
// Represents the 'users' table in the database.
// -------------------------------------------------------------------
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ unique: true })
  userNumber: number;
}
