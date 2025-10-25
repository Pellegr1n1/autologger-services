import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateVehicleShareTable1753020000000 implements MigrationInterface {
  name = 'CreateVehicleShareTable1753020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vehicle_shares',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'shareToken',
            type: 'varchar',
            length: '64',
            isUnique: true,
          },
          {
            name: 'vehicleId',
            type: 'uuid',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'viewCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lastViewedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['vehicleId'],
            referencedTableName: 'vehicles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Criar índices para performance
    await queryRunner.query(`CREATE INDEX "IDX_vehicle_shares_share_token" ON "vehicle_shares" ("shareToken")`);
    await queryRunner.query(`CREATE INDEX "IDX_vehicle_shares_vehicle_id" ON "vehicle_shares" ("vehicleId")`);
    await queryRunner.query(`CREATE INDEX "IDX_vehicle_shares_is_active" ON "vehicle_shares" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vehicle_shares');
  }
}
