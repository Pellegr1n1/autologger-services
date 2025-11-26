import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVehiclePlateColumnLength1764121333965
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vehicles" 
      ALTER COLUMN "plate" TYPE varchar(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vehicles" 
      ALTER COLUMN "plate" TYPE varchar(8);
    `);
  }
}

