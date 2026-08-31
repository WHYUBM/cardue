import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces accounts (ADR 0009) and the columns synchronisation will need
 * (ADR 0010).
 *
 * Two things the generated version got wrong, and why they are done by hand
 * here:
 *
 * 1. `vehicles.user_id` cannot be added as `NOT NULL` to a table that already
 *    has rows. The column arrives nullable, a first account is seeded, the
 *    existing vehicles are given to it, and only then is the constraint
 *    tightened.
 * 2. The partial unique index on the deadlines has to learn about tombstones.
 *    Without `deleted_at IS NULL` a deleted `bollo` would keep occupying the
 *    slot, and the same kind could never be added to that vehicle again.
 */
export class AuthAndTombstones1788188654591 implements MigrationInterface {
  name = 'AuthAndTombstones1788188654591';

  /**
   * The account the vehicles created before authentication are given to.
   *
   * It matches the placeholder profile the interface used to show
   * (`frontend/src/mocks/user.ts`). No `keycloak_sub`: it is attached at the
   * first sign-in, matching by email, so the row survives a realm being
   * recreated.
   */
  private static readonly SEED_EMAIL = 'andrea.rossi@example.com';
  private static readonly SEED_NAME = 'Andrea Rossi';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "keycloak_sub" character varying(64), "email" character varying(320) NOT NULL, "name" character varying(120) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_user_keycloak_sub" ON "users" ("keycloak_sub")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_user_email" ON "users" ("email")`,
    );

    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token_hash" character(64) NOT NULL, "user_id" uuid NOT NULL, "refresh_token" text, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_session_token_hash" ON "sessions" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_session_user" ON "sessions" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- Ownership, in three steps so the existing rows survive ---
    await queryRunner.query(`ALTER TABLE "vehicles" ADD "user_id" uuid`);

    await queryRunner.query(
      `INSERT INTO "users" ("email", "name") VALUES ($1, $2)`,
      [AuthAndTombstones1788188654591.SEED_EMAIL, AuthAndTombstones1788188654591.SEED_NAME],
    );
    await queryRunner.query(
      `UPDATE "vehicles" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = $1) WHERE "user_id" IS NULL`,
      [AuthAndTombstones1788188654591.SEED_EMAIL],
    );

    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicle_user" ON "vehicles" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_88b36924d769e4df751bcfbf249" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- Columns synchronisation will need (ADR 0010) ---
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );

    // The uniqueness of the standard kinds now has to ignore deleted rows.
    await queryRunner.query(`DROP INDEX "public"."uq_deadline_vehicle_type"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_deadline_vehicle_type" ON "deadlines" ("vehicle_id", "type") WHERE type <> 'custom' AND deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_deadline_vehicle_type"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_deadline_vehicle_type" ON "deadlines" ("vehicle_id", "type") WHERE type <> 'custom'`,
    );

    await queryRunner.query(`ALTER TABLE "deadlines" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "deadlines" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "deadlines" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "deleted_at"`);

    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_88b36924d769e4df751bcfbf249"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_vehicle_user"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "user_id"`);

    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_session_user"`);
    await queryRunner.query(`DROP INDEX "public"."uq_session_token_hash"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP INDEX "public"."uq_user_email"`);
    await queryRunner.query(`DROP INDEX "public"."uq_user_keycloak_sub"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
