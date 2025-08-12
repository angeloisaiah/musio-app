import { createDb } from '../db/connection';

export function getDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: Use Railway PostgreSQL with proper SSL
    const config = {
      host:
        process.env.DB_HOST ||
        process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] ||
        'localhost',
      port: parseInt(
        process.env.DB_PORT || process.env.DATABASE_URL?.split(':')[3]?.split('/')[0] || '5432',
      ),
      database:
        process.env.DB_NAME ||
        process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] ||
        'railway',
      user:
        process.env.DB_USER ||
        process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] ||
        'postgres',
      password:
        process.env.DB_PASSWORD || process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
            sslmode: 'require',
          }
        : false,
    };

    console.log('🔧 Database config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl ? 'enabled' : 'disabled',
    });

    return config;
  }

  // Local development: Use local PostgreSQL
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'musio',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: false,
  };
}

export function createProductionDb() {
  try {
    const config = getDatabaseConfig();
    return createDb(config);
  } catch (error) {
    console.error('❌ Failed to create production database:', error);
    throw error;
  }
}
