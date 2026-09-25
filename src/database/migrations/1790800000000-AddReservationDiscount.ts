import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservationDiscount1790800000000 implements MigrationInterface {
    name = 'AddReservationDiscount1790800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "basePrice" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "discountPercent" smallint NOT NULL DEFAULT '0'`);

        // Existing reservations had no discount
        await queryRunner.query(`UPDATE "reservations" SET "basePrice" = "totalPrice"`);

        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "basePrice" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "discountPercent"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "basePrice"`);
    }

}
