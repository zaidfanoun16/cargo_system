import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationAttempts1790100000000 implements MigrationInterface {
    name = 'AddEmailVerificationAttempts1790100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationAttempts" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationAttempts"`);
    }

}
