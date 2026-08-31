import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Vehicle } from './vehicle.entity.js';

/**
 * The four deadline kinds the application tracks.
 *
 * Mirrors `DeadlineType` in `frontend/src/types/index.ts`. The two definitions
 * have to be kept in step by hand until a shared workspace exists (ADR 0006).
 */
export const DEADLINE_TYPES = [
  'bollo',
  'assicurazione',
  'revisione',
  'tagliando',
] as const;

export type DeadlineType = (typeof DEADLINE_TYPES)[number];

/**
 * A single deadline belonging to a vehicle.
 *
 * Note what is deliberately absent: the urgency state. `DeadlineStatus`
 * (expired/urgent/upcoming/ok/paused) is derived from the due date on read, so
 * persisting it would leave a label that silently rots as time passes.
 */
@Entity('deadlines')
// The interface offers exactly one date field per kind per vehicle, so a second
// row of the same kind could never be reached: the constraint keeps the
// database from holding data the application has no way to show.
@Unique('uq_deadline_vehicle_type', ['vehicleId', 'type'])
export class Deadline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  @Index('idx_deadline_vehicle')
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.deadlines, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'enum', enum: DEADLINE_TYPES, enumName: 'deadline_type' })
  type: DeadlineType;

  /**
   * Due date without a time component.
   *
   * `date` is the right type over `timestamp`: a deadline falls on a calendar
   * day, and a timestamp would drag in a timezone that could shift the day.
   * The pg driver reads this column back as a `YYYY-MM-DD` string, which is
   * exactly the shape the frontend already expects.
   */
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  /** Free-form user notes, such as the insurer or the garage. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Insurance only: the policy is suspended, so no reminder is raised. Used
   * when a vehicle is off the road but the deadline should stay visible.
   */
  @Column({ type: 'boolean', default: false })
  paused: boolean;
}
