import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds user-defined deadlines: a `title` column and a `custom` kind that, unlike
 * the four standard ones, may repeat within a vehicle.
 *
 * The enum is **recreated** rather than extended with `ALTER TYPE ... ADD
 * VALUE`. PostgreSQL refuses to use a value added to an existing enum inside
 * the same transaction that added it ("unsafe use of new value"), and the
 * partial index below has to mention `custom` in its WHERE clause. Building a
 * fresh type does not fall under that restriction, and keeps the whole
 * migration inside one transaction.
 */
export class CustomDeadlines1788181878395 implements MigrationInterface {
  name = 'CustomDeadlines1788181878395';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deadlines" DROP CONSTRAINT "uq_deadline_vehicle_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ADD "title" character varying(80)`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."deadline_type" RENAME TO "deadline_type_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deadline_type" AS ENUM('bollo', 'assicurazione', 'revisione', 'tagliando', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ALTER COLUMN "type" TYPE "public"."deadline_type" USING "type"::"text"::"public"."deadline_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."deadline_type_old"`);

    // Replaces the plain unique constraint: the four standard kinds stay unique
    // per vehicle, custom ones are free to repeat.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_deadline_vehicle_type" ON "deadlines" ("vehicle_id", "type") WHERE type <> 'custom'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_deadline_vehicle_type"`);

    // Custom deadlines cannot be represented by the previous schema, so going
    // back means losing them. Stated here rather than left to fail on the enum
    // cast, which would be a confusing way to find out.
    await queryRunner.query(`DELETE FROM "deadlines" WHERE "type" = 'custom'`);

    await queryRunner.query(
      `ALTER TYPE "public"."deadline_type" RENAME TO "deadline_type_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deadline_type" AS ENUM('bollo', 'assicurazione', 'revisione', 'tagliando')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deadlines" ALTER COLUMN "type" TYPE "public"."deadline_type" USING "type"::"text"::"public"."deadline_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."deadline_type_old"`);

    await queryRunner.query(`ALTER TABLE "deadlines" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "deadlines" ADD CONSTRAINT "uq_deadline_vehicle_type" UNIQUE ("vehicle_id", "type")`,
    );
  }
}
