import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788179255604 implements MigrationInterface {
    name = 'InitialSchema1788179255604'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "make" character varying(60) NOT NULL, "model" character varying(60) NOT NULL, "year" smallint NOT NULL, "plate" character varying(10) NOT NULL, "mileage_km" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."deadline_type" AS ENUM('bollo', 'assicurazione', 'revisione', 'tagliando')`);
        await queryRunner.query(`CREATE TABLE "deadlines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "vehicle_id" uuid NOT NULL, "type" "public"."deadline_type" NOT NULL, "due_date" date NOT NULL, "notes" text, "paused" boolean NOT NULL DEFAULT false, CONSTRAINT "uq_deadline_vehicle_type" UNIQUE ("vehicle_id", "type"), CONSTRAINT "PK_a9b8551c028a78298641a8e3470" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_deadline_vehicle" ON "deadlines"  ("vehicle_id") `);
        await queryRunner.query(`ALTER TABLE "deadlines" ADD CONSTRAINT "FK_78e5c2201879b97d6595ded202f" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deadlines" DROP CONSTRAINT "FK_78e5c2201879b97d6595ded202f"`);
        await queryRunner.query(`DROP INDEX "public"."idx_deadline_vehicle"`);
        await queryRunner.query(`DROP TABLE "deadlines"`);
        await queryRunner.query(`DROP TYPE "public"."deadline_type"`);
        await queryRunner.query(`DROP TABLE "vehicles"`);
    }

}
