import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRunningLate1791400000000 implements MigrationInterface {
    name = 'AddRunningLate1791400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "runningLate" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "runningLate"`);
    }

}
