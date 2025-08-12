import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { Database } from '@musio/shared';

export function createDb(config?: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
}) {
  try {
    // If config is provided, use it; otherwise parse DATABASE_URL
    if (config) {
      const pool = new pg.Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      const db = new Kysely<Database>({
        dialect: new PostgresDialect({ pool }),
      });

      return db;
    }

    // Fallback to DATABASE_URL parsing
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('No DATABASE_URL or database config provided');
    }

    console.log('🔗 Using DATABASE_URL connection');
    const pool = new pg.Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });

    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function ensurePgvector(db: Kysely<unknown>): Promise<void> {
  try {
    await sql`create extension if not exists vector`.execute(db);
    console.log('✅ pgvector extension ensured');
  } catch (error) {
    console.warn('⚠️  pgvector extension not available:', error);
  }
}
