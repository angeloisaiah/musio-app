import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Check existing columns to avoid conflicts
  const metadata = await db.introspection.getMetadata();
  const postsTable = metadata.tables.find(t => t.name === 'posts');
  const existingColumns = postsTable?.columns.map(c => c.name) || [];
  
  // Add columns to posts table for video and cover art support (only if they don't exist)
  const columnsToAdd = [
    { name: 'video_url', type: 'text' },
    { name: 'cover_url', type: 'text' },
    { name: 'youtube_id', type: 'text' },
    { name: 'source_type', type: 'text', defaultValue: 'user' },
    { name: 'artist_name', type: 'text' }
  ];

  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column.name)) {
      if (column.name === 'source_type') {
        await db.schema.alterTable('posts')
          .addColumn(column.name, column.type as any, (c) => c.notNull().defaultTo(column.defaultValue))
          .execute();
      } else {
        await db.schema.alterTable('posts')
          .addColumn(column.name, column.type as any)
          .execute();
      }
    }
  }

  // Add indexes if they don't exist (with error handling)
  const createIndexSafely = async (indexName: string, createFn: () => Promise<void>) => {
    try {
      await createFn();
    } catch (error) {
      // Ignore if index already exists (PostgreSQL error code 42P07)
      if ((error as any).code === '42P07' || (error as any).message?.includes('already exists')) {
        console.warn(`Index ${indexName} already exists, skipping...`);
      } else {
        throw error; // Re-throw other errors
      }
    }
  };
  
  await createIndexSafely('posts_source_type_idx', () =>
    db.schema.createIndex('posts_source_type_idx').on('posts').column('source_type').execute()
  );
  
  await createIndexSafely('posts_youtube_id_idx', () =>
    db.schema.createIndex('posts_youtube_id_idx').on('posts').column('youtube_id').execute()
  );

  // Extend media_files table to support video types (check existing columns)
  const mediaFilesTable = metadata.tables.find(t => t.name === 'media_files');
  const mediaFilesColumns = mediaFilesTable?.columns.map(c => c.name) || [];
  
  const mediaColumnsToAdd = ['width', 'height'];
  for (const columnName of mediaColumnsToAdd) {
    if (!mediaFilesColumns.includes(columnName)) {
      await db.schema.alterTable('media_files').addColumn(columnName, 'integer').execute();
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('posts_youtube_id_idx').execute();
  await db.schema.dropIndex('posts_source_type_idx').execute();

  // Remove columns from posts table
  await db.schema
    .alterTable('posts')
    .dropColumn('artist_name')
    .dropColumn('source_type')
    .dropColumn('youtube_id')
    .dropColumn('cover_url')
    .dropColumn('video_url')
    .execute();

  // Remove columns from media_files table
  await db.schema.alterTable('media_files').dropColumn('height').dropColumn('width').execute();
}
