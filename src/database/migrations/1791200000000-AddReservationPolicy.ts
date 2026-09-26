import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservationPolicy1791200000000 implements MigrationInterface {
    name = 'AddReservationPolicy1791200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "bookingBlocked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "strikesResetAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "lateCancellation" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "cancelledAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "pickedUpAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "returnedAt" TIMESTAMP`);

        // A value added with ALTER TYPE ... ADD VALUE cannot be used in the
        // same transaction, so the type is replaced instead
        await queryRunner.query(`ALTER TYPE "public"."reservations_status_enum" RENAME TO "reservations_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PICKED_UP', 'CANCELLED', 'COMPLETED', 'NO_SHOW')`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" TYPE "public"."reservations_status_enum" USING "status"::"text"::"public"."reservations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum_old"`);

        // Existing reservations: confirmed ones that already started were
        // handed over (otherwise they would be marked no-show), and the
        // times of past pickups, returns and cancellations are filled in
        await queryRunner.query(`UPDATE "reservations" SET "status" = 'PICKED_UP', "pickedUpAt" = "startDate" WHERE "status" = 'CONFIRMED' AND "startDate" <= now()`);
        await queryRunner.query(`UPDATE "reservations" SET "pickedUpAt" = "startDate", "returnedAt" = "endDate" WHERE "status" = 'COMPLETED'`);
        await queryRunner.query(`UPDATE "reservations" SET "cancelledAt" = "updatedAt" WHERE "status" = 'CANCELLED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "reservations" SET "status" = 'CONFIRMED' WHERE "status" = 'PICKED_UP'`);
        await queryRunner.query(`UPDATE "reservations" SET "status" = 'CANCELLED' WHERE "status" = 'NO_SHOW'`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum_old" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" TYPE "public"."reservations_status_enum_old" USING "status"::"text"::"public"."reservations_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reservations_status_enum_old" RENAME TO "reservations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "returnedAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "pickedUpAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "cancelledAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "lateCancellation"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "strikesResetAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bookingBlocked"`);
    }

}
