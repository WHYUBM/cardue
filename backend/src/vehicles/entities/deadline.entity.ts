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
import { Vehicle } from './vehicle.entity.js';

/**
 * The four deadline kinds fixed by the domain: they exist at most once per
 * vehicle and their name is not up to the user.
 */
export const STANDARD_DEADLINE_TYPES = [
  'bollo',
  'assicurazione',
  'revisione',
  'tagliando',
] as const;

/**
 * The kind a user-defined deadline carries.
 *
 * Custom deadlines are the same rows as the standard ones — same table, same
 * date handling, same derived status — and differ only in being named by the
 * user and repeatable. Giving them their own table would have duplicated the
 * whole deadline machinery to gain a title column.
 */
export const CUSTOM_DEADLINE_TYPE = 'custom';

/**
 * Every deadline kind the application stores.
 *
 * Mirrors `DeadlineType` in `frontend/src/types/index.ts`. The two definitions
 * have to be kept in step by hand until a shared workspace exists (ADR 0006).
 */
export const DEADLINE_TYPES = [
  ...STANDARD_DEADLINE_TYPES,
  CUSTOM_DEADLINE_TYPE,
] as const;

export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export type StandardDeadlineType = (typeof STANDARD_DEADLINE_TYPES)[number];

/** True for the four fixed kinds, false for a user-defined one. */
export function isStandardDeadlineType(
  type: DeadlineType,
): type is StandardDeadlineType {
  return type !== CUSTOM_DEADLINE_TYPE;
}

/**
 * A single deadline belonging to a vehicle.
 *
 * Note what is deliberately absent: the urgency state. `DeadlineStatus`
 * (expired/urgent/upcoming/ok/paused) is derived from the due date on read, so
 * persisting it would leave a label that silently rots as time passes.
 */
@Entity('deadlines')
// The interface offers exactly one date field per standard kind per vehicle, so
// a second row of the same kind could never be reached: the constraint keeps the
// database from holding data the application has no way to show.
//
// Custom deadlines are excluded through the partial index: their whole point is
// that a vehicle can have several, told apart by their title.
// `deleted_at IS NULL` is part of the condition, and it matters: without it a
// deleted `bollo` would keep occupying the slot and the same kind could never
// be added again.
@Index('uq_deadline_vehicle_type', ['vehicleId', 'type'], {
  unique: true,
  where: `type <> '${CUSTOM_DEADLINE_TYPE}' AND deleted_at IS NULL`,
})
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
   * User-given name, for custom deadlines only.
   *
   * `null` for the four standard kinds, whose name comes from the type and is
   * translated by the interface. Nullable rather than empty-string so that
   * "has no title" is one state, not two.
   */
  @Column({ type: 'varchar', length: 80, nullable: true })
  title: string | null;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Needed by synchronisation to tell which version is the more recent. */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Tombstone; see the note on `Vehicle` (ADR 0010). */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
