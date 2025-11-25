// src/data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dbSsl = process.env.DB_SSL || 'false';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'autologger',
  synchronize: false, // Sempre false para usar migrations
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/**/*.subscriber.ts'],
  ssl:
    dbSsl === 'true'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});

if (require.main === module) {
  AppDataSource.initialize()
    .then(() => {
      console.log('✅ DataSource conectado com sucesso!');
    })
    .catch((error) => {
      console.error('❌ Erro ao conectar DataSource:', error);
    });
}
