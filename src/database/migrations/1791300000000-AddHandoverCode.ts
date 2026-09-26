import { randomInt } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHandoverCode1791300000000 implements MigrationInterface {
    name = 'AddHandoverCode1791300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "handoverCode" character varying(6)`);
        await queryRunner.query(`CREATE INDEX "IDX_11868fbf4ac5c0b038ea269cf5" ON "reservations"  ("handoverCode") `);

        // Reservations confirmed before this change get a code too, each
        // one different
        const confirmed: { id: number }[] = await queryRunner.query(`SELECT "id" FROM "reservations" WHERE "status" = 'CONFIRMED'`);
        const used = new Set<string>();

        for (const { id } of confirmed) {
            let code: string;
            do {
                code = randomInt(0, 1_000_000).toString().padStart(6, '0');
            } while (used.has(code));
            used.add(code);

            await queryRunner.query(`UPDATE "reservations" SET "handoverCode" = $1 WHERE "id" = $2`, [code, id]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_11868fbf4ac5c0b038ea269cf5"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "handoverCode"`);
    }

}
