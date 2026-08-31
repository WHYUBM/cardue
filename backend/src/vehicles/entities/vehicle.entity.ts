import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { Deadline } from './deadline.entity.js';

/**
 * A vehicle owned by the user, together with its deadlines.
 *
 * Mirrors `Vehicle` in `frontend/src/types/index.ts`.
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

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_vehicle_user')
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

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

  /**
   * Tombstone (ADR 0010): a deleted row is kept, marked with the moment it went.
   *
   * Synchronisation needs to tell "this record never existed here" from "this
   * record was deleted", otherwise a device that has not seen the deletion
   * would helpfully put the row back. TypeORM leaves these rows out of every
   * query on its own.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
