import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RemoveRenavamFromVehicleTable1761951152694 implements MigrationInterface {
    name = 'RemoveRenavamFromVehicleTable1761951152694'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna existe antes de tentar removê-la
        const hasColumn = await queryRunner.hasColumn("vehicles", "renavam");
        
        if (!hasColumn) {
            return; // Coluna não existe, nada a fazer
        }

        // Remover índice único se existir
        await queryRunner.query(`
            DROP INDEX IF EXISTS "UQ_vehicles_renavam";
        `);

        // Remover constraint unique se existir
        await queryRunner.query(`
            ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "UQ_vehicles_renavam";
        `);

        // Remover coluna renavam
        await queryRunner.dropColumn("vehicles", "renavam");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recriar coluna renavam (caso precise reverter)
        await queryRunner.addColumn(
            "vehicles",
            new TableColumn({
                name: "renavam",
                type: "varchar",
                length: "11",
                isUnique: true,
                isNullable: false,
            })
        );
    }
}

