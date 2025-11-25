import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhotoUrlToVehicleTable1764111660752
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vehicles',
      new TableColumn({
        name: 'photoUrl',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vehicles', 'photoUrl');
  }
}
