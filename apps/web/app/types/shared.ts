// Shared types for the web app
// This avoids workspace dependency issues with Vercel

export type UserId = string;
export type PostId = string;
export type MediaId = string;
export type TagId = string;
export type CommentId = string;

export interface User {
  id: UserId;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: PostId;
  user_id: UserId;
  title: string;
  caption?: string;
  artist_name?: string;
  duration_ms?: number;
  bpm?: number;
  key?: string;
  visibility: 'public' | 'private' | 'unlisted';
  ready: boolean;
  video_url?: string;
  cover_url?: string;
  youtube_id?: string;
  source_type: 'user' | 'youtube' | 'spotify';
  created_at: string;
  updated_at: string;
  user?: User;
  tags?: Tag[];
  media_files?: MediaFile[];
  _count?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface PostWithCounts extends Post {
  _count: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface MediaFile {
  id: MediaId;
  post_id: PostId;
  url: string;
  type: 'original' | 'preview' | 'cover' | 'video' | 'waveform_json';
  mime: string;
  size?: number;
  duration_ms?: number;
  width?: number;
  height?: number;
}

export interface Tag {
  id: TagId;
  name: string;
  normalized: string;
  created_at: string;
}

export interface Comment {
  id: CommentId;
  post_id: PostId;
  user_id: UserId;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Like {
  id: string;
  post_id: PostId;
  user_id: UserId;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: UserId;
  following_id: UserId;
  created_at: string;
  follower?: User;
  following?: User;
}

export interface SearchResult {
  posts: Post[];
  users: User[];
  tags: Tag[];
  total: number;
}

export interface FeedItem {
  post: Post;
  user: User;
  tags: Tag[];
  isLiked: boolean;
  isFollowing: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// Utility functions
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
