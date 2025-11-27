// src/data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dbSsl = process.env.DB_SSL || 'false';

console.log('🔍 Database Connection Config:');
console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  Port: ${process.env.DB_PORT || 5432}`);
console.log(`  Database: ${process.env.DB_NAME || 'autologger'}`);
console.log(`  Username: ${process.env.DB_USERNAME || 'postgres'}`);
console.log(`  SSL: ${dbSsl}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

const isProduction = process.env.NODE_ENV === 'production';
const entitiesPath = isProduction
  ? ['dist/**/*.entity.js']
  : ['src/**/*.entity.ts'];
const migrationsPath = isProduction
  ? ['dist/database/migrations/*.js']
  : ['src/database/migrations/*.ts'];
const subscribersPath = isProduction
  ? ['dist/**/*.subscriber.js']
  : ['src/**/*.subscriber.ts'];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'autologger',
  synchronize: false, // Sempre false para usar migrations
  logging: process.env.NODE_ENV === 'development',
  entities: entitiesPath,
  migrations: migrationsPath,
  subscribers: subscribersPath,
  ssl: dbSsl === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20,
    idleTimeoutMillis: 120000,
    connectionTimeoutMillis: 120000,
  },
});

if (require.main === module) {
  console.log('🚀 Tentando conectar ao banco de dados...');
  AppDataSource.initialize()
    .then(() => {
      console.log('✅ DataSource conectado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao conectar DataSource:');
      console.error('  Tipo:', error.constructor.name);
      console.error('  Mensagem:', error.message);
      if (error.code) {
        console.error('  Código:', error.code);
      }
      if (error.address) {
        console.error('  Endereço:', error.address);
      }
      if (error.port) {
        console.error('  Porta:', error.port);
      }
      console.error('  Stack:', error.stack);
      process.exit(1);
    });
}
