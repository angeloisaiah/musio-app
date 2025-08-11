import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { Database } from '@musio/shared';

export function createDb() {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://musio:password@localhost:5432/musio';
  const pool = new pg.Pool({
    connectionString,
  });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
  return db;
}

export async function ensurePgvector(db: Kysely<unknown>): Promise<void> {
  await sql`create extension if not exists vector`.execute(db);
}
