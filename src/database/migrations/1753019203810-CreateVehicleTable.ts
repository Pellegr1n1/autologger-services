import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateVehicleTable1753019203810 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vehicles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'plate',
            type: 'varchar',
            length: '8',
            isUnique: true,
          },
          {
            name: 'brand',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'model',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'year',
            type: 'int',
          },
          {
            name: 'color',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'renavam',
            type: 'varchar',
            length: '11',
            isUnique: true,
          },
          {
            name: 'mileage',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'sold'],
            default: "'active'",
          },
          {
            name: 'soldAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar índices
    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'IDX_VEHICLE_PLATE',
        columnNames: ['plate'],
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'IDX_VEHICLE_RENAVAM',
        columnNames: ['renavam'],
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'IDX_VEHICLE_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'IDX_VEHICLE_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'IDX_VEHICLE_USER_STATUS',
        columnNames: ['userId', 'status'],
      }),
    );

    // Criar chave estrangeira para usuário
    await queryRunner.createForeignKey(
      'vehicles',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_VEHICLE_USER',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chave estrangeira
    await queryRunner.dropForeignKey('vehicles', 'FK_VEHICLE_USER');

    // Remover índices
    await queryRunner.dropIndex('vehicles', 'IDX_VEHICLE_USER_STATUS');
    await queryRunner.dropIndex('vehicles', 'IDX_VEHICLE_STATUS');
    await queryRunner.dropIndex('vehicles', 'IDX_VEHICLE_USER_ID');
    await queryRunner.dropIndex('vehicles', 'IDX_VEHICLE_RENAVAM');
    await queryRunner.dropIndex('vehicles', 'IDX_VEHICLE_PLATE');

    // Remover tabela
    await queryRunner.dropTable('vehicles');
  }
}
