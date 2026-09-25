import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCarPricePerHour1790700000000 implements MigrationInterface {
    name = 'AddCarPricePerHour1790700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cars" ADD "pricePerHour" numeric(10,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cars" DROP COLUMN "pricePerHour"`);
    }

}
