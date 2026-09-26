import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReminderSentAt1791600000000 implements MigrationInterface {
    name = 'AddReminderSentAt1791600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "reminderSentAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "reminderSentAt"`);
    }

}
