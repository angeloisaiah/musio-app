import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Check existing indexes to avoid conflicts
  const metadata = await db.introspection.getMetadata();
  const allIndexes = metadata.tables.flatMap(t => (t as any).indexes?.map((i: any) => i.name) || []);
  
  // Helper function to create index if it doesn't exist
  const createIndexIfNotExists = async (indexName: string, createFn: () => Promise<void>) => {
    if (!allIndexes.includes(indexName)) {
      try {
        await createFn();
      } catch (error) {
        // Ignore if index already exists
        if (!(error as any).message?.includes('already exists')) {
          throw error;
        }
      }
    }
  };
  
  // Posts table indexes for common queries
  await createIndexIfNotExists('posts_user_id_created_at_idx', () =>
    db.schema
      .createIndex('posts_user_id_created_at_idx')
      .on('posts')
      .columns(['user_id', 'created_at desc'])
      .execute()
  );

  // Apply safe index creation to all indexes
  const indexesToCreate = [
    {
      name: 'posts_ready_visibility_created_at_idx',
      create: () => db.schema.createIndex('posts_ready_visibility_created_at_idx').on('posts').columns(['ready', 'visibility', 'created_at desc']).execute()
    },
    {
      name: 'posts_created_at_id_idx', 
      create: () => db.schema.createIndex('posts_created_at_id_idx').on('posts').columns(['created_at desc', 'id desc']).execute()
    },
    {
      name: 'media_files_post_id_type_idx',
      create: () => db.schema.createIndex('media_files_post_id_type_idx').on('media_files').columns(['post_id', 'type']).execute()
    },
    {
      name: 'likes_post_id_idx',
      create: () => db.schema.createIndex('likes_post_id_idx').on('likes').column('post_id').execute()
    },
    {
      name: 'likes_user_id_post_id_idx',
      create: () => db.schema.createIndex('likes_user_id_post_id_idx').on('likes').columns(['user_id', 'post_id']).execute()
    },
    {
      name: 'comments_post_id_created_at_idx',
      create: () => db.schema.createIndex('comments_post_id_created_at_idx').on('comments').columns(['post_id', 'created_at desc']).execute()
    },
    {
      name: 'reposts_post_id_idx',
      create: () => db.schema.createIndex('reposts_post_id_idx').on('reposts').column('post_id').execute()
    },
    {
      name: 'reposts_user_id_post_id_idx',
      create: () => db.schema.createIndex('reposts_user_id_post_id_idx').on('reposts').columns(['user_id', 'post_id']).execute()
    },
    {
      name: 'bookmarks_post_id_idx',
      create: () => db.schema.createIndex('bookmarks_post_id_idx').on('bookmarks').column('post_id').execute()
    },
    {
      name: 'bookmarks_user_id_post_id_idx',
      create: () => db.schema.createIndex('bookmarks_user_id_post_id_idx').on('bookmarks').columns(['user_id', 'post_id']).execute()
    },
    {
      name: 'post_tags_post_id_idx',
      create: () => db.schema.createIndex('post_tags_post_id_idx').on('post_tags').column('post_id').execute()
    },
    {
      name: 'post_tags_tag_id_idx',
      create: () => db.schema.createIndex('post_tags_tag_id_idx').on('post_tags').column('tag_id').execute()
    },
    {
      name: 'tags_normalized_idx',
      create: () => db.schema.createIndex('tags_normalized_idx').on('tags').column('normalized').execute()
    },
    {
      name: 'analytics_post_id_idx',
      create: () => db.schema.createIndex('analytics_post_id_idx').on('analytics').column('post_id').execute()
    },
    {
      name: 'follows_follower_id_idx',
      create: () => db.schema.createIndex('follows_follower_id_idx').on('follows').column('follower_id').execute()
    },
    {
      name: 'follows_followee_id_idx',
      create: () => db.schema.createIndex('follows_followee_id_idx').on('follows').column('followee_id').execute()
    },
    {
      name: 'notifications_user_id_created_at_idx',
      create: () => db.schema.createIndex('notifications_user_id_created_at_idx').on('notifications').columns(['user_id', 'created_at desc']).execute()
    },
    {
      name: 'notifications_read_idx',
      create: () => db.schema.createIndex('notifications_read_idx').on('notifications').column('read').execute()
    }
  ];

  // Create all indexes safely
  for (const index of indexesToCreate) {
    await createIndexIfNotExists(index.name, index.create);
  }

  // Text search indexes for PostgreSQL (commented out due to type issues - can be added manually)
  // await db.schema
  //   .createIndex('posts_title_gin_idx')
  //   .on('posts')
  //   .expression(sql`to_tsvector('english', title)`)
  //   .using('gin')
  //   .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop all the indexes
  const indexes = [
    'posts_user_id_created_at_idx',
    'posts_ready_visibility_created_at_idx',
    'posts_created_at_id_idx',
    'media_files_post_id_type_idx',
    'likes_post_id_idx',
    'likes_user_id_post_id_idx',
    'comments_post_id_created_at_idx',
    'reposts_post_id_idx',
    'reposts_user_id_post_id_idx',
    'bookmarks_post_id_idx',
    'bookmarks_user_id_post_id_idx',
    'post_tags_post_id_idx',
    'post_tags_tag_id_idx',
    'tags_normalized_idx',
    'analytics_post_id_idx',
    'follows_follower_id_idx',
    'follows_followee_id_idx',
    'notifications_user_id_created_at_idx',
    'notifications_read_idx',

  ];

  for (const indexName of indexes) {
    try {
      await db.schema.dropIndex(indexName).execute();
    } catch (error) {
      console.warn(`Failed to drop index ${indexName}:`, error);
    }
  }
}
