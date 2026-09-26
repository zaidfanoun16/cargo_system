import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHandoverStaff1791500000000 implements MigrationInterface {
    name = 'AddHandoverStaff1791500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "pickedUpById" integer`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "returnedById" integer`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_a2cad2db24b9a1101740388b657" FOREIGN KEY ("pickedUpById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_744f02c00a7013abf4f91c028ee" FOREIGN KEY ("returnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_744f02c00a7013abf4f91c028ee"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_a2cad2db24b9a1101740388b657"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "returnedById"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "pickedUpById"`);
    }

}
