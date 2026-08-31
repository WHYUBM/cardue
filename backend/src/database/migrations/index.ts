import type { MigrationInterface } from 'typeorm';
import { InitialSchema1788179255604 } from './1788179255604-InitialSchema.js';
import { CustomDeadlines1788181878395 } from './1788181878395-CustomDeadlines.js';
import { AuthAndTombstones1788188654591 } from './1788188654591-AuthAndTombstones.js';

/** Constructor of a migration class, which is what TypeORM expects. */
type MigrationClass = new () => MigrationInterface;

/**
 * Every migration, in the order it must be applied.
 *
 * Listed explicitly rather than picked up by a path glob, for the same reason
 * the entities are (ADR 0006): globs are unreliable under ESM. Add the import
 * for each newly generated migration here — a migration missing from this array
 * simply never runs.
 */
export const migrations: MigrationClass[] = [
  InitialSchema1788179255604,
  CustomDeadlines1788181878395,
  AuthAndTombstones1788188654591,
];
