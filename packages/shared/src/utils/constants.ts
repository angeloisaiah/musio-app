/**
 * Application constants shared between client and server
 */

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// File upload limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_AUDIO_DURATION = 10 * 60 * 1000; // 10 minutes in ms
export const MAX_VIDEO_DURATION = 5 * 60 * 1000; // 5 minutes in ms

// Text limits
export const MAX_POST_TITLE_LENGTH = 200;
export const MAX_POST_CAPTION_LENGTH = 2000;
export const MAX_USERNAME_LENGTH = 50;
export const MAX_ARTIST_NAME_LENGTH = 100;
export const MAX_BIO_LENGTH = 500;

// Rate limiting
export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const GENERAL_RATE_LIMIT = 100; // requests per window
export const AUTH_RATE_LIMIT = 10; // auth requests per 15 minutes
export const UPLOAD_RATE_LIMIT = 10; // uploads per minute

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
};

// Post visibility options
export const POST_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
} as const;

export type PostVisibility = typeof POST_VISIBILITY[keyof typeof POST_VISIBILITY];

// Post source types
export const POST_SOURCE = {
  USER: 'user',
  YOUTUBE: 'youtube',
  IMPORT: 'import',
} as const;

export type PostSource = typeof POST_SOURCE[keyof typeof POST_SOURCE];

// Media file types
export const MEDIA_TYPE = {
  ORIGINAL: 'original',
  PREVIEW: 'preview',
  WAVEFORM_JSON: 'waveform_json',
  VIDEO: 'video',
  COVER: 'cover',
  THUMBNAIL: 'thumbnail',
} as const;

export type MediaType = typeof MEDIA_TYPE[keyof typeof MEDIA_TYPE];

// Notification types
export const NOTIFICATION_TYPE = {
  LIKE: 'like',
  COMMENT: 'comment',
  REPOST: 'repost',
  FOLLOW: 'follow',
  MENTION: 'mention',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/api/auth/signup',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  POSTS: {
    LIST: '/api/posts',
    CREATE: '/api/posts',
    GET: (id: string) => `/api/posts/${id}`,
    UPDATE: (id: string) => `/api/posts/${id}`,
    DELETE: (id: string) => `/api/posts/${id}`,
  },
  FEED: {
    GET: '/api/feed',
  },
  SEARCH: {
    POSTS: '/api/search',
    TAGS: '/api/tags/popular',
  },
  USERS: {
    PROFILE: (id: string) => `/api/users/${id}`,
    FOLLOW: (id: string) => `/api/users/${id}/follow`,
    FOLLOWERS: (id: string) => `/api/users/${id}/followers`,
    FOLLOWING: (id: string) => `/api/users/${id}/following`,
  },
  INTERACTIONS: {
    LIKE: (postId: string) => `/api/posts/${postId}/like`,
    REPOST: (postId: string) => `/api/posts/${postId}/repost`,
    BOOKMARK: (postId: string) => `/api/posts/${postId}/bookmark`,
    COMMENT: (postId: string) => `/api/posts/${postId}/comments`,
  },
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
