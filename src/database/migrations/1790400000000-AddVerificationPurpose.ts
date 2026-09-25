import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerificationPurpose1790400000000 implements MigrationInterface {
    name = 'AddVerificationPurpose1790400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "verificationPurpose" character varying(20)`);

        // Codes issued before this column existed were for registration or,
        // when an email change is pending, for that change
        await queryRunner.query(`
            UPDATE "users"
            SET "verificationPurpose" = CASE WHEN "pendingEmail" IS NULL THEN 'register' ELSE 'email-change' END
            WHERE "emailVerificationToken" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verificationPurpose"`);
    }

}
