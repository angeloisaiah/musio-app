import type { KyselyDatabase } from '@musio/shared';
import type { JWTUser } from './auth';

export interface FastifyRequestWithUser {
  user: JWTUser;
  server: {
    db: KyselyDatabase;
  };
}

export interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore?: boolean;
}

export interface CountsData {
  likes: number;
  comments: number;
  reposts: number;
  plays: number;
}
