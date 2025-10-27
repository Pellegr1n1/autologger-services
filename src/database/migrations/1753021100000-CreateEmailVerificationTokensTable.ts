import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateEmailVerificationTokensTable1753021100000 implements MigrationInterface {
    name = 'CreateEmailVerificationTokensTable1753021100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'email_verification_tokens',
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

        // Criar foreign key
        await queryRunner.createForeignKey(
            'email_verification_tokens',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            })
        );

        // Criar índice para melhorar performance
        await queryRunner.createIndex(
            'email_verification_tokens',
            new TableIndex({
                name: 'IDX_email_verification_tokens_token',
                columnNames: ['token'],
            })
        );

        await queryRunner.createIndex(
            'email_verification_tokens',
            new TableIndex({
                name: 'IDX_email_verification_tokens_userId',
                columnNames: ['userId'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('email_verification_tokens');
    }
}

