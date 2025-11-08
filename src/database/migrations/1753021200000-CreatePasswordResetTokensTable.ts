import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreatePasswordResetTokensTable1753021200000 implements MigrationInterface {
    name = 'CreatePasswordResetTokensTable1753021200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'password_reset_tokens',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'token',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                    },
                    {
                        name: 'used',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'expiresAt',
                        type: 'timestamp',
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Criar foreign key apenas se não existir
        const foreignKeyExists = await queryRunner.query(`
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_d6a19d4b4f6c62dcd29daa497e2' 
            AND table_name = 'password_reset_tokens'
        `);

        if (!foreignKeyExists || foreignKeyExists.length === 0) {
            await queryRunner.createForeignKey(
                'password_reset_tokens',
                new TableForeignKey({
                    columnNames: ['userId'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'users',
                    onDelete: 'CASCADE',
                })
            );
        }

        // Criar índices
        await queryRunner.createIndex(
            'password_reset_tokens',
            new TableIndex({
                name: 'IDX_password_reset_tokens_token',
                columnNames: ['token'],
            })
        );

        await queryRunner.createIndex(
            'password_reset_tokens',
            new TableIndex({
                name: 'IDX_password_reset_tokens_userId',
                columnNames: ['userId'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('password_reset_tokens');
    }
}

