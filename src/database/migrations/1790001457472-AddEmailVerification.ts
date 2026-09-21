import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1790001457472 implements MigrationInterface {
    name = 'AddEmailVerification1790001457472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isEmailVerified"`);
    }

}
