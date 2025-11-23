import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateVehicleServiceTable1753019587560
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para ServiceType
    await queryRunner.query(`
      CREATE TYPE "public"."service_type_enum" AS ENUM(
        'maintenance', 'repair', 'inspection', 'fuel', 'expense', 'other'
      )
    `);

    // Criar enum para ServiceStatus
    await queryRunner.query(`
      CREATE TYPE "public"."service_status_enum" AS ENUM(
        'pending', 'confirmed', 'rejected', 'expired'
      )
    `);

    // Criar tabela vehicle_services
    await queryRunner.createTable(
      new Table({
        name: 'vehicle_services',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'vehicle_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'maintenance',
              'repair',
              'inspection',
              'fuel',
              'expense',
              'other',
            ],
            default: "'maintenance'",
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'service_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'mileage',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'attachments',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'technician',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'warranty',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'next_service_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'rejected', 'expired'],
            default: "'pending'",
            isNullable: false,
          },
          // Blockchain fields
          {
            name: 'blockchain_hash',
            type: 'varchar',
            length: '66',
            isNullable: true,
          },
          {
            name: 'previous_hash',
            type: 'varchar',
            length: '66',
            isNullable: true,
          },
          {
            name: 'merkle_root',
            type: 'varchar',
            length: '66',
            isNullable: true,
          },
          {
            name: 'is_immutable',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'can_edit',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'blockchain_confirmed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'confirmed_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Criar foreign key para vehicle_id
    await queryRunner.createForeignKey(
      'vehicle_services',
      new TableForeignKey({
        columnNames: ['vehicle_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vehicles',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Criar índices para melhor performance
    await queryRunner.createIndex(
      'vehicle_services',
      new TableIndex({
        name: 'IDX_VEHICLE_SERVICES_VEHICLE_ID',
        columnNames: ['vehicle_id'],
      }),
    );

    await queryRunner.createIndex(
      'vehicle_services',
      new TableIndex({
        name: 'IDX_VEHICLE_SERVICES_TYPE',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'vehicle_services',
      new TableIndex({
        name: 'IDX_VEHICLE_SERVICES_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'vehicle_services',
      new TableIndex({
        name: 'IDX_VEHICLE_SERVICES_DATE',
        columnNames: ['service_date'],
      }),
    );

    await queryRunner.createIndex(
      'vehicle_services',
      new TableIndex({
        name: 'IDX_VEHICLE_SERVICES_BLOCKCHAIN_HASH',
        columnNames: ['blockchain_hash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign key
    const table = await queryRunner.getTable('vehicle_services');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('vehicle_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('vehicle_services', foreignKey);
    }

    // Remover tabela
    await queryRunner.dropTable('vehicle_services');

    // Remover enums
    await queryRunner.query(`DROP TYPE "public"."service_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."service_status_enum"`);
  }
}
