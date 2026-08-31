import { createHash, randomBytes } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { SESSION_COOKIE } from '../src/auth/auth.constants.js';
import { Session } from '../src/auth/entities/session.entity.js';
import { User } from '../src/auth/entities/user.entity.js';
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

/**
 * Creates an account and an open session inside the test transaction, and
 * returns the cookie that authenticates as that account.
 *
 * Rows are inserted directly rather than through the OIDC flow: an end-to-end
 * test must not depend on Keycloak being up, and the flow itself is not what
 * these tests are about (ADR 0009). What is exercised is everything after the
 * session exists — the guard, and the ownership filtering in the services.
 */
export async function signIn(
  manager: EntityManager,
  email = 'e2e@example.com',
): Promise<{ userId: string; cookie: string }> {
  const user = await manager.save(
    manager.create(User, { email, name: 'Utente E2E', keycloakSub: null }),
  );

  // Same shape the real sign-in produces: an opaque token in the cookie, only
  // its hash in the table.
  const token = randomBytes(32).toString('base64url');
  await manager.save(
    manager.create(Session, {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user.id,
      refreshToken: null,
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    }),
  );

  return { userId: user.id, cookie: `${SESSION_COOKIE}=${token}` };
}
