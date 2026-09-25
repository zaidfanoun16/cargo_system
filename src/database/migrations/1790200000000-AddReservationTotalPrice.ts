import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservationTotalPrice1790200000000 implements MigrationInterface {
    name = 'AddReservationTotalPrice1790200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "totalPrice" numeric(10,2)`);

        // Fill existing reservations using the car's current price and the
        // number of days, rounding a partial day up (same rule as the app)
        await queryRunner.query(`
            UPDATE "reservations" r
            SET "totalPrice" = c."pricePerDay" * CEIL(EXTRACT(EPOCH FROM (r."endDate" - r."startDate")) / 86400)
            FROM "cars" c
            WHERE c."id" = r."carId"
        `);

        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "totalPrice" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "totalPrice"`);
    }

}
