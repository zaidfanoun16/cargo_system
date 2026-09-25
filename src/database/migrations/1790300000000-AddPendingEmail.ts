import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPendingEmail1790300000000 implements MigrationInterface {
    name = 'AddPendingEmail1790300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "pendingEmail" character varying(150)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pendingEmail"`);
    }

}
