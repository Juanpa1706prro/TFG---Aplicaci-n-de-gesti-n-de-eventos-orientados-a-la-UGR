import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { EventVisibility } from './event-visibility.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  /** URL de la imagen (por ahora texto; subida de ficheros en fase posterior). */
  @Column({ type: 'varchar', length: 2000, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  /** Coordenadas WGS84 para MapLibre (marcador). */
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 20, default: EventVisibility.PUBLIC })
  visibility: EventVisibility;

  /** null = sin límite de asistentes */
  @Column({ type: 'int', nullable: true })
  maxAttendees: number | null;

  /** Inicio del evento (UTC en BD). */
  @Column({ type: 'timestamptz' })
  startsAt: Date;

  /** Fin del evento (UTC en BD). Se usa para filtrar marcadores activos. */
  @Index('IDX_events_endsAt')
  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
