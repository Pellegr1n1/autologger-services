import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePhoneFromUserTable1753019587561 implements MigrationInterface {
    name = 'RemovePhoneFromUserTable1753019587561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(20)`);
    }
}
