import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A person who uses the application.
 *
 * Identity itself lives in Keycloak (ADR 0009): this row exists only to own
 * data and to give the rest of the schema a foreign key to point at. It holds
 * no password — the backend never sees one.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The `sub` claim of Keycloak: the stable identifier of the account.
   *
   * Nullable on purpose. A row can exist before anyone has ever signed in —
   * the migration seeds one to own the vehicles created before authentication
   * existed — and the `sub` is attached at the first login, matching by email.
   * Doing it the other way round would tie the database to a realm that can be
   * recreated, since the `sub` is generated when the realm is imported.
   */
  @Column({ name: 'keycloak_sub', type: 'varchar', length: 64, nullable: true })
  @Index('uq_user_keycloak_sub', { unique: true })
  keycloakSub: string | null;

  @Column({ type: 'varchar', length: 320 })
  @Index('uq_user_email', { unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  // No inverse `vehicles` relation on purpose: importing Vehicle from here
  // would close a cycle — User → Vehicle → Deadline → Vehicle — and under ESM a
  // circular import leaves the class uninitialised when the decorators run.
  // Nothing needs it either: vehicles are always queried by `userId`.

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
