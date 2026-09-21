import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationToken1790002354573 implements MigrationInterface {
    name = 'AddEmailVerificationToken1790002354573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationToken" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationExpiresAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationToken"`);
    }

}
