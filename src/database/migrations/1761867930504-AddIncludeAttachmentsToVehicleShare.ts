import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncludeAttachmentsToVehicleShare1761867930504 implements MigrationInterface {
    name = 'AddIncludeAttachmentsToVehicleShare1761867930504';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna já existe
        const hasColumn = await queryRunner.hasColumn('vehicle_shares', 'includeAttachments');
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "vehicle_shares" ADD "includeAttachments" boolean NOT NULL DEFAULT false`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna existe antes de tentar removê-la
        const hasColumn = await queryRunner.hasColumn('vehicle_shares', 'includeAttachments');
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "vehicle_shares" DROP COLUMN "includeAttachments"`);
        }
    }

}
