import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsEmailVerifiedToUserTable1753021000000
  implements MigrationInterface
{
  name = 'AddIsEmailVerifiedToUserTable1753021000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna já existe
    const hasColumn = await queryRunner.hasColumn('users', 'isEmailVerified');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna existe antes de tentar removê-la
    const hasColumn = await queryRunner.hasColumn('users', 'isEmailVerified');
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "isEmailVerified"`,
      );
    }
  }
}
