import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArabicNames1791000000000 implements MigrationInterface {
    name = 'AddArabicNames1791000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "car_categories" ADD "nameAr" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "car_categories" ADD CONSTRAINT "UQ_f43031712aece85b7b4ec08bc71" UNIQUE ("nameAr")`);
        await queryRunner.query(`ALTER TABLE "car_categories" ADD "descriptionAr" text`);
        await queryRunner.query(`ALTER TABLE "cars" ADD "brandAr" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "cars" ADD "modelAr" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "cars" ADD "colorAr" character varying(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cars" DROP COLUMN "colorAr"`);
        await queryRunner.query(`ALTER TABLE "cars" DROP COLUMN "modelAr"`);
        await queryRunner.query(`ALTER TABLE "cars" DROP COLUMN "brandAr"`);
        await queryRunner.query(`ALTER TABLE "car_categories" DROP COLUMN "descriptionAr"`);
        await queryRunner.query(`ALTER TABLE "car_categories" DROP CONSTRAINT "UQ_f43031712aece85b7b4ec08bc71"`);
        await queryRunner.query(`ALTER TABLE "car_categories" DROP COLUMN "nameAr"`);
    }

}
