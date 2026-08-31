import { DataSource, type DataSourceOptions } from 'typeorm';
import { Deadline } from '../vehicles/entities/deadline.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { migrations } from './migrations/index.js';

/**
 * Database configuration, shared by the running application and the TypeORM CLI.
 *
 * Both need the same connection and the same entity list; building it in one
 * place is what keeps a migration from being generated against a schema that
 * differs from the one the app actually uses.
 */
export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: Number(env.POSTGRES_PORT),
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,

    // Makes the uuid primary keys default to `gen_random_uuid()`, part of the
    // PostgreSQL core since version 13, instead of the `uuid_generate_v4()` of
    // the uuid-ossp extension, which would have to be installed first.
    uuidExtension: 'pgcrypto',

    // Entities are listed by class reference rather than by glob: under ESM the
    // path globs of TypeORM are a known source of trouble, and a missing class
    // here fails at compile time instead of at runtime (ADR 0006).
    entities: [Vehicle, Deadline],
    // Same rule for migrations, kept in order in `migrations/index.ts`.
    migrations,

    // Never true, not even in development: the schema changes only through
    // versioned migrations, so it has a history to replay on the VPS (ADR 0006).
    synchronize: false,
  };
}

/**
 * DataSource used by the TypeORM CLI (`npm run db:*`).
 *
 * The CLI runs against the build output in `dist/`, not against the sources:
 * the entities use decorators, which Node's built-in type stripping does not
 * transform, so there is no way to load the TypeScript directly under ESM.
 */
export default new DataSource(buildDataSourceOptions());
