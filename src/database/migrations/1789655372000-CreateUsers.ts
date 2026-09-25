import { MigrationInterface, QueryRunner } from "typeorm";

// No earlier migration creates the users table, so migrations failed on a
// fresh database. This runs first and creates it with the columns it had
// before AddRefreshToken. IF NOT EXISTS makes it a no-op on existing databases.
export class CreateUsers1789655372000 implements MigrationInterface {
    name = 'CreateUsers1789655372000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL NOT NULL, "fullName" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
