import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransactionHashToVehicleService1765100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna transaction_hash
    await queryRunner.addColumn(
      'vehicle_services',
      new TableColumn({
        name: 'transaction_hash',
        type: 'varchar',
        length: '66',
        isNullable: true,
      }),
    );

    // Criar índice para melhor performance em consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_VEHICLE_SERVICES_TRANSACTION_HASH" 
      ON "vehicle_services" ("transaction_hash")
      WHERE "transaction_hash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_VEHICLE_SERVICES_TRANSACTION_HASH"
    `);

    // Remover coluna
    await queryRunner.dropColumn('vehicle_services', 'transaction_hash');
  }
}


