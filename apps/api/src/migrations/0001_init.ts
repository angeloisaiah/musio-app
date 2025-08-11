import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // idempotent guards
  const tables = await db.introspection.getTables();
  const has = (name: string) => tables.some((t: any) => t.name === name);
  if (has('users')) return; // assume full init already applied
  await sql`create extension if not exists vector`.execute(db);

  await db.schema
    .createTable('users')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('name', 'text')
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('avatar_url', 'text')
    .addColumn('bio', 'text')
    .addColumn('provider', 'text')
    .addColumn('provider_id', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('follows')
    .addColumn('follower_id', 'text', (c) => c.notNull())
    .addColumn('followee_id', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('follows_pk', ['follower_id', 'followee_id'])
    .addForeignKeyConstraint('follows_follower_fk', ['follower_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('follows_followee_fk', ['followee_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('posts')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'text', (c) => c.notNull())
    .addColumn('title', 'text', (c) => c.notNull())
    .addColumn('caption', 'text')
    .addColumn('duration_ms', 'integer')
    .addColumn('bpm', 'integer')
    .addColumn('key', 'text')
    .addColumn('visibility', 'text', (c) => c.notNull().defaultTo('public'))
    .addColumn('ready', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('posts_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('media_files')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('url', 'text', (c) => c.notNull())
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('mime', 'text')
    .addColumn('size', 'integer')
    .addColumn('duration_ms', 'integer')
    .addForeignKeyConstraint('media_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('tags')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull().unique())
    .addColumn('normalized', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('post_tags')
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('tag_id', 'integer', (c) => c.notNull())
    .addPrimaryKeyConstraint('post_tags_pk', ['post_id', 'tag_id'])
    .addForeignKeyConstraint('post_tags_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('post_tags_tag_fk', ['tag_id'], 'tags', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('likes')
    .addColumn('user_id', 'text', (c) => c.notNull())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('likes_pk', ['user_id', 'post_id'])
    .addForeignKeyConstraint('likes_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('likes_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('reposts')
    .addColumn('user_id', 'text', (c) => c.notNull())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('reposts_pk', ['user_id', 'post_id'])
    .addForeignKeyConstraint('reposts_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('reposts_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('bookmarks')
    .addColumn('user_id', 'text', (c) => c.notNull())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('bookmarks_pk', ['user_id', 'post_id'])
    .addForeignKeyConstraint('bookmarks_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('bookmarks_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('comments')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('user_id', 'text', (c) => c.notNull())
    .addColumn('parent_comment_id', 'text')
    .addColumn('text', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('comments_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('comments_user_fk', ['user_id'], 'users', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .addForeignKeyConstraint('comments_parent_fk', ['parent_comment_id'], 'comments', ['id'])
    .execute();

  await db.schema
    .createTable('embeddings')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('post_id', 'text', (c) => c.notNull())
    .addColumn('vector', sql`vector(1536)`)
    .addColumn('provider', 'text')
    .addColumn('dimensions', 'integer')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('embeddings_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('analytics')
    .addColumn('post_id', 'text', (c) => c.primaryKey())
    .addColumn('views', 'bigint', (c) => c.notNull().defaultTo(0n))
    .addColumn('plays', 'bigint', (c) => c.notNull().defaultTo(0n))
    .addColumn('likes', 'bigint', (c) => c.notNull().defaultTo(0n))
    .addColumn('reposts', 'bigint', (c) => c.notNull().defaultTo(0n))
    .addForeignKeyConstraint('analytics_post_fk', ['post_id'], 'posts', ['id'], (cb) =>
      cb.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('jobs')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('payload', 'jsonb')
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // credentials table for local auth
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
  await db.schema.dropTable('jobs').execute();
  await db.schema.dropTable('analytics').execute();
  await db.schema.dropTable('embeddings').execute();
  await db.schema.dropTable('comments').execute();
  await db.schema.dropTable('bookmarks').execute();
  await db.schema.dropTable('reposts').execute();
  await db.schema.dropTable('likes').execute();
  await db.schema.dropTable('post_tags').execute();
  await db.schema.dropTable('tags').execute();
  await db.schema.dropTable('media_files').execute();
  await db.schema.dropTable('posts').execute();
  await db.schema.dropTable('follows').execute();
  await db.schema.dropTable('users').execute();
}
