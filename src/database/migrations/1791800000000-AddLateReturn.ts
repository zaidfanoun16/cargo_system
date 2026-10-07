import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLateReturn1791800000000 implements MigrationInterface {
    name = 'AddLateReturn1791800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "lateReturn" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "overdueNotifiedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "overdueNotifiedAt"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "lateReturn"`);
    }

}
