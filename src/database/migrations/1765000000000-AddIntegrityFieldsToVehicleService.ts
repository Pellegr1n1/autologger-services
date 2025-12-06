import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIntegrityFieldsToVehicleService1765000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para IntegrityStatus
    await queryRunner.query(`
      CREATE TYPE "public"."integrity_status_enum" AS ENUM(
        'valid', 'violated', 'unknown', 'not_verified'
      )
    `);

    // Adicionar coluna integrity_status
    await queryRunner.addColumn(
      'vehicle_services',
      new TableColumn({
        name: 'integrity_status',
        type: 'enum',
        enum: ['valid', 'violated', 'unknown', 'not_verified'],
        default: "'not_verified'",
        isNullable: true,
      }),
    );

    // Adicionar coluna integrity_checked_at
    await queryRunner.addColumn(
      'vehicle_services',
      new TableColumn({
        name: 'integrity_checked_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Criar índice para melhor performance em consultas de integridade
    await queryRunner.query(`
      CREATE INDEX "IDX_VEHICLE_SERVICES_INTEGRITY_STATUS" 
      ON "vehicle_services" ("integrity_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_VEHICLE_SERVICES_INTEGRITY_STATUS"
    `);

    // Remover colunas
    await queryRunner.dropColumn('vehicle_services', 'integrity_checked_at');
    await queryRunner.dropColumn('vehicle_services', 'integrity_status');

    // Remover enum
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."integrity_status_enum"`);
  }
}
