import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789655372434 implements MigrationInterface {
    name = 'InitialSchema1789655372434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "car_categories" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_03f9513d7627a61b97e412edff8" UNIQUE ("name"), CONSTRAINT "PK_cdc0a8872ec123a3b7bdfd389d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cars_status_enum" AS ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "cars" ("id" SERIAL NOT NULL, "brand" character varying(100) NOT NULL, "model" character varying(100) NOT NULL, "year" integer NOT NULL, "pricePerDay" numeric(10,2) NOT NULL, "status" "public"."cars_status_enum" NOT NULL DEFAULT 'AVAILABLE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "categoryId" integer NOT NULL, CONSTRAINT "PK_fc218aa84e79b477d55322271b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "cars" ADD CONSTRAINT "FK_b8f2af5403621c1527f4c76609f" FOREIGN KEY ("categoryId") REFERENCES "car_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cars" DROP CONSTRAINT "FK_b8f2af5403621c1527f4c76609f"`);
        await queryRunner.query(`DROP TABLE "cars"`);
        await queryRunner.query(`DROP TYPE "public"."cars_status_enum"`);
        await queryRunner.query(`DROP TABLE "car_categories"`);
    }

}
