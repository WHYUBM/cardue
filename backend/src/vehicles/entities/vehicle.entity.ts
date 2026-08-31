import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Deadline } from './deadline.entity.js';

/**
 * A vehicle owned by the user, together with its deadlines.
 *
 * Mirrors `Vehicle` in `frontend/src/types/index.ts`.
 *
 * TODO: There is no owner column yet because authentication does not exist:
 * every vehicle currently belongs to everyone. Adding `user_id` will be its own
 * migration once there are accounts.
 */
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  make: string;

  @Column({ type: 'varchar', length: 60 })
  model: string;

  /** Registration year. `smallint` is ample and documents the range. */
  @Column({ type: 'smallint' })
  year: number;

  /**
   * Plate in uppercase with no spaces; the frontend `formatPlate` handles
   * presentation.
   *
   * Not unique: the constraint belongs to the owner, not to the database as a
   * whole, and there is no owner yet. Two users may legitimately track the same
   * plate — a car that changed hands.
   */
  @Column({ type: 'varchar', length: 10 })
  plate: string;

  /**
   * Odometer reading in kilometres.
   *
   * Always present, defaulting to 0: a vehicle with no reading is treated as
   * new rather than as unknown. Keeping it non-nullable is what lets the
   * distance-based maintenance intervals be computed without a special case
   * for "we do not know" — and 0 is the honest answer for a car just bought.
   *
   * TODO: Once the make-model catalog has a real source (ADR 0004), this is the
   * value the recommended maintenance tasks are derived from.
   */
  @Column({ name: 'mileage_km', type: 'integer', default: 0 })
  mileageKm: number;

  @OneToMany(() => Deadline, (deadline) => deadline.vehicle, {
    cascade: true,
    eager: true,
  })
  deadlines: Deadline[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
