export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  caption?: string | null;
  artist_name?: string | null;
  duration_ms?: number | null;
  bpm?: number | null;
  key?: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  ready: boolean;
  video_url?: string | null;
  cover_url?: string | null;
  youtube_id?: string | null;
  source_type: 'user' | 'youtube' | 'import';
  created_at: string;
  updated_at: string;
}

export interface PostWithUser extends Omit<Post, 'user_id'> {
  user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export interface PostCounts {
  likes: number;
  comments: number;
  reposts: number;
  plays: number;
}

export interface PostWithCounts extends PostWithUser {
  counts: PostCounts;
  tags: string[];
  preview_url: string | null;
  waveform_url: string | null;
  isLikedByMe?: boolean;
  isRepostedByMe?: boolean;
  isBookmarkedByMe?: boolean;
}

export interface MediaFile {
  id: string;
  post_id: string;
  url: string;
  type: 'original' | 'preview' | 'waveform_json' | 'video' | 'cover';
  mime?: string | null;
  size?: number | null;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface Tag {
  id: string;
  name: string;
  normalized: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Omit<Comment, 'user_id'> {
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore?: boolean;
}

export interface APIError {
  error: string;
  details?: unknown;
}
