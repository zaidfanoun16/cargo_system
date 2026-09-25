import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCarImages1790600000000 implements MigrationInterface {
    name = 'AddCarImages1790600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "car_images" ("id" SERIAL NOT NULL, "url" text NOT NULL, "publicId" text NOT NULL, "carId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f7870496c0b0f5a8894cab2bde3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "car_images" ADD CONSTRAINT "FK_202539a18b3a1e8d6e25633f2e7" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "car_images" DROP CONSTRAINT "FK_202539a18b3a1e8d6e25633f2e7"`);
        await queryRunner.query(`DROP TABLE "car_images"`);
    }

}
