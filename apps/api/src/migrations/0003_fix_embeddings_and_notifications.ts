import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  const tables = await db.introspection.getTables();
  const hasNotifications = tables.some((t: any) => t.name === 'notifications');

  // Add notifications table if it doesn't exist
  if (!hasNotifications) {
    await db.schema
      .createTable('notifications')
      .addColumn('id', 'text', (c) => c.primaryKey())
      .addColumn('user_id', 'text', (c) => c.notNull())
      .addColumn('type', 'text', (c) => c.notNull())
      .addColumn('title', 'text', (c) => c.notNull())
      .addColumn('message', 'text', (c) => c.notNull())
      .addColumn('read', 'boolean', (c) => c.notNull().defaultTo(false))
      .addColumn('data', 'text') // JSON data as text
      .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
      .addForeignKeyConstraint('notifications_user_fk', ['user_id'], 'users', ['id'], (cb) =>
        cb.onDelete('cascade'),
      )
      .execute();
  }

  // Check if embeddings table has the embedding column
  const embeddingsTable = tables.find((t: any) => t.name === 'embeddings');
  if (embeddingsTable) {
    const columns = await db.introspection.getMetadata({
      withInternalKyselyTables: false,
    });
    const embeddingsColumns = columns.tables.find((t) => t.name === 'embeddings')?.columns || [];
    const hasEmbeddingColumn = embeddingsColumns.some((c) => c.name === 'embedding');

    if (!hasEmbeddingColumn) {
      // Add the embedding column as text (for JSON storage)
      await db.schema.alterTable('embeddings').addColumn('embedding', 'text').execute();

      // Add unique constraint on post_id for onConflict to work
      await db.schema
        .alterTable('embeddings')
        .addUniqueConstraint('embeddings_post_id_unique', ['post_id'])
        .execute();
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  const tables = await db.introspection.getTables();
  const hasNotifications = tables.some((t: any) => t.name === 'notifications');

  if (hasNotifications) {
    await db.schema.dropTable('notifications').execute();
  }

  // Remove unique constraint and embedding column if they exist
  try {
    await db.schema.alterTable('embeddings').dropConstraint('embeddings_post_id_unique').execute();
  } catch (error) {
    // Constraint might not exist
  }

  try {
    await db.schema.alterTable('embeddings').dropColumn('embedding').execute();
  } catch (error) {
    // Column might not exist
  }
}
