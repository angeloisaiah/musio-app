import { Type } from '@sinclair/typebox';

export const PostQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  cursor: Type.Optional(Type.String()),
  filter: Type.Optional(
    Type.Union([
      Type.Literal('for_you'),
      Type.Literal('trending'),
      Type.Literal('following'),
    ]),
  ),
});

export const PostResponseSchema = Type.Object({
  items: Type.Array(
    Type.Object({
      id: Type.String(),
      user: Type.Object({
        id: Type.String(),
        name: Type.Union([Type.String(), Type.Null()]),
        avatar_url: Type.Union([Type.String(), Type.Null()]),
      }),
      preview_url: Type.Union([Type.String(), Type.Null()]),
      duration_ms: Type.Union([Type.Integer(), Type.Null()]),
      waveform_url: Type.Union([Type.String(), Type.Null()]),
      counts: Type.Object({
        likes: Type.Integer(),
        comments: Type.Integer(),
        reposts: Type.Integer(),
        plays: Type.Integer(),
      }),
      tags: Type.Array(Type.String()),
      isLikedByMe: Type.Boolean(),
      isRepostedByMe: Type.Boolean(),
      isBookmarkedByMe: Type.Boolean(),
    }),
  ),
  nextCursor: Type.Union([Type.String(), Type.Null()]),
});

export const CreatePostSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  caption: Type.Optional(Type.String({ maxLength: 2000 })),
  artistName: Type.Optional(Type.String({ maxLength: 100 })),
  audioKey: Type.String(),
  videoKey: Type.Optional(Type.String()),
  coverKey: Type.Optional(Type.String()),
  audioMime: Type.Optional(Type.String()),
  videoMime: Type.Optional(Type.String()),
  coverMime: Type.Optional(Type.String()),
  audioSize: Type.Optional(Type.Integer({ minimum: 0 })),
  videoSize: Type.Optional(Type.Integer({ minimum: 0 })),
  coverSize: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const FeedQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  cursor: Type.Optional(Type.String()),
});

export const FeedResponseSchema = Type.Object({
  items: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      caption: Type.Union([Type.String(), Type.Null()]),
      artist_name: Type.Union([Type.String(), Type.Null()]),
      duration_ms: Type.Union([Type.Integer(), Type.Null()]),
      bpm: Type.Union([Type.Integer(), Type.Null()]),
      key: Type.Union([Type.String(), Type.Null()]),
      video_url: Type.Union([Type.String(), Type.Null()]),
      cover_url: Type.Union([Type.String(), Type.Null()]),
      user: Type.Object({
        id: Type.String(),
        name: Type.Union([Type.String(), Type.Null()]),
        avatar_url: Type.Union([Type.String(), Type.Null()]),
      }),
      counts: Type.Object({
        likes: Type.Integer(),
        comments: Type.Integer(),
        reposts: Type.Integer(),
        plays: Type.Integer(),
      }),
      tags: Type.Array(Type.String()),
      created_at: Type.String(),
    }),
  ),
  nextCursor: Type.Union([Type.String(), Type.Null()]),
});
