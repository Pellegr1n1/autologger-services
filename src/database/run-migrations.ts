import { AppDataSource } from './data-source';

async function runMigrations() {
  try {
    console.log('=== Migration Runner ===');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DB Host: ${process.env.DB_HOST || 'not set'}`);
    console.log(`DB Port: ${process.env.DB_PORT || 'not set'}`);
    console.log(`DB Name: ${process.env.DB_NAME || 'not set'}`);
    console.log(`DB Username: ${process.env.DB_USERNAME ? '***' : 'not set'}`);
    console.log(`DB SSL: ${process.env.DB_SSL || 'false'}`);
    console.log('');

    if (!process.env.DB_HOST || !process.env.DB_NAME) {
      throw new Error(
        'Missing required environment variables: DB_HOST and DB_NAME must be set',
      );
    }

    console.log('Initializing database connection...');
    console.log(`Attempting to connect to: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);
    
    await AppDataSource.initialize();
    console.log('Database connection established');

    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('No migrations to run.');
    } else {
      console.log(`Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack: ${error.stack}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

runMigrations();

