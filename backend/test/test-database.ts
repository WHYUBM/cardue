import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/data-source.js';

/**
 * Prepares a database dedicated to the end-to-end tests.
 *
 * The tests must not depend on the development database, and must not touch it.
 * Rolling each test back in a transaction isolates what the tests *write*, but
 * it cannot hide rows that were already there: a single vehicle created by hand
 * while trying the app is enough to make an assertion like "the list holds one
 * vehicle" fail. The fix is a separate database, created on first run and
 * migrated to the same schema.
 *
 * Its name is derived from the configured one — `cardue` becomes
 * `cardue_test` — so there is no extra environment variable to keep in sync.
 *
 * Side effect: it points `POSTGRES_DB` at the test database before returning,
 * so the `AppModule` built by the tests connects there too.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const testDatabase = `${process.env.POSTGRES_DB}_test`;

  // `CREATE DATABASE` cannot run inside the database being created, so it goes
  // through `postgres`, the maintenance database every cluster has. The options
  // are rebuilt from a patched environment rather than by spreading them, which
  // keeps this working whatever driver the builder is configured for.
  const admin = new DataSource(
    buildDataSourceOptions({ ...process.env, POSTGRES_DB: 'postgres' }),
  );
  await admin.initialize();
  try {
    const existing: unknown[] = await admin.query(
      'select 1 from pg_database where datname = $1',
      [testDatabase],
    );
    if (existing.length === 0) {
      // The name is derived from configuration, not from user input, so the
      // interpolation here cannot carry anything a parameter would protect.
      await admin.query(`create database "${testDatabase}"`);
    }
  } finally {
    await admin.destroy();
  }

  process.env.POSTGRES_DB = testDatabase;

  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();
  // Same migrations as production: a schema built any other way would let the
  // tests pass against something that will never exist.
  await dataSource.runMigrations();

  return dataSource;
}
