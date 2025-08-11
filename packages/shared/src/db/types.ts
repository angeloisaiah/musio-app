import type { Generated } from 'kysely';

export type TimestampString = string;

export type UsersTable = {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  provider: string | null;
  provider_id: string | null;
  created_at: TimestampString;
};

export type FollowsTable = {
  follower_id: string;
  followee_id: string;
  created_at: TimestampString;
};

export type PostsTable = {
  id: string;
  user_id: string;
  title: string;
  caption: string | null;
  duration_ms: number | null;
  bpm: number | null;
  key: string | null;
  visibility: string;
  ready: boolean;
  video_url: string | null;
  cover_url: string | null;
  youtube_id: string | null;
  source_type: string;
  artist_name: string | null;
  created_at: TimestampString;
  updated_at: TimestampString;
};

export type MediaFilesTable = {
  id: string;
  post_id: string;
  url: string;
  type: string; // original|preview|waveform_json|thumb|video|cover
  mime: string | null;
  size: number | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
};

export type TagsTable = {
  id: Generated<number>;
  name: string;
  normalized: string;
};

export type PostTagsTable = {
  post_id: string;
  tag_id: number;
};

export type LikesTable = {
  user_id: string;
  post_id: string;
  created_at: TimestampString;
};

export type RepostsTable = {
  user_id: string;
  post_id: string;
  created_at: TimestampString;
};

export type BookmarksTable = {
  user_id: string;
  post_id: string;
  created_at: TimestampString;
};

export type CommentsTable = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  text: string;
  created_at: TimestampString;
};

export type EmbeddingsTable = {
  id: string;
  post_id: string;
  embedding: string | null; // JSON string for now
  // vector column typed loosely here; use pgvector client at runtime
  provider: string | null;
  dimensions: number | null;
  created_at: TimestampString;
};

export type AnalyticsTable = {
  post_id: string;
  views: bigint;
  plays: bigint;
  likes: bigint;
  reposts: bigint;
};

export type JobsTable = {
  id: string;
  type: string;
  payload: unknown;
  status: string;
  created_at: TimestampString;
  updated_at: TimestampString;
};

export type NotificationsTable = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: string | null;
  created_at: TimestampString;
};

export type CredentialsTable = {
  user_id: string;
  password_hash: string;
};

export type Database = {
  users: UsersTable;
  follows: FollowsTable;
  posts: PostsTable;
  media_files: MediaFilesTable;
  tags: TagsTable;
  post_tags: PostTagsTable;
  likes: LikesTable;
  reposts: RepostsTable;
  bookmarks: BookmarksTable;
  comments: CommentsTable;
  embeddings: EmbeddingsTable;
  analytics: AnalyticsTable;
  jobs: JobsTable;
  notifications: NotificationsTable;
  credentials: CredentialsTable;
};

export type KyselyDatabase = import('kysely').Kysely<Database>;
export type KyselyTransaction = import('kysely').Transaction<Database>;
