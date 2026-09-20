import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshToken1789880734690
    implements MigrationInterface {
    name = 'AddRefreshToken1789880734690';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add refresh token column to users
        await queryRunner.query(
            `ALTER TABLE "users" ADD "refreshToken" text`,
        );

        // Add license plate as nullable first
        await queryRunner.query(
            `ALTER TABLE "cars" ADD "licensePlate" character varying(50)`,
        );

        // Give existing cars temporary unique license plates
        await queryRunner.query(
            `UPDATE "cars" SET "licensePlate" = 'TEMP-' || "id"`,
        );

        // Make license plate required
        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "licensePlate" SET NOT NULL`,
        );

        // Make license plate unique
        await queryRunner.query(
            `ALTER TABLE "cars" ADD CONSTRAINT "UQ_1df40c87717e8631a39fd42920a" UNIQUE ("licensePlate")`,
        );

        // Add color
        await queryRunner.query(
            `ALTER TABLE "cars" ADD "color" character varying(100) NOT NULL DEFAULT 'Unknown'`,
        );

        // Remove default after existing rows are populated
        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "color" DROP DEFAULT`,
        );

        // Replace old car status enum
        await queryRunner.query(
            `ALTER TYPE "public"."cars_status_enum" RENAME TO "cars_status_enum_old"`,
        );

        await queryRunner.query(
            `CREATE TYPE "public"."cars_status_enum" AS ENUM('AVAILABLE', 'MAINTENANCE', 'INACTIVE')`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" DROP DEFAULT`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" TYPE "public"."cars_status_enum" USING "status"::"text"::"public"."cars_status_enum"`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`,
        );

        await queryRunner.query(
            `DROP TYPE "public"."cars_status_enum_old"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."cars_status_enum_old" AS ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE')`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" DROP DEFAULT`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" TYPE "public"."cars_status_enum_old" USING "status"::"text"::"public"."cars_status_enum_old"`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`,
        );

        await queryRunner.query(
            `DROP TYPE "public"."cars_status_enum"`,
        );

        await queryRunner.query(
            `ALTER TYPE "public"."cars_status_enum_old" RENAME TO "cars_status_enum"`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" DROP COLUMN "color"`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" DROP CONSTRAINT "UQ_1df40c87717e8631a39fd42920a"`,
        );

        await queryRunner.query(
            `ALTER TABLE "cars" DROP COLUMN "licensePlate"`,
        );

        await queryRunner.query(
            `ALTER TABLE "users" DROP COLUMN "refreshToken"`,
        );
    }
}