import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  const has = await db.introspection.getTables();
  const exists = has.some((t: any) => t.name === 'credentials');
  if (exists) return;
  await db.schema
    .createTable('credentials')
    .addColumn('user_id', 'text', (c) => c.primaryKey())
    .addColumn('password_hash', 'text', (c) => c.notNull())
    .addForeignKeyConstraint('credentials_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('credentials').execute();
}
