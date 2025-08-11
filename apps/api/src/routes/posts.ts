import type { FastifyInstance } from 'fastify';
import type { KyselyDatabase, PostCounts } from '@musio/shared';
import type { FastifyRequestWithUser } from '../types/api';
import { PostQuerySchema, PostResponseSchema, CreatePostSchema } from '../schemas/posts';
import { authenticate } from '../middleware/auth';
import { PostService } from '../services/post-service';
import { randomUUID } from 'node:crypto';





export async function postsRoutes(fastify: FastifyInstance) {
  const db = fastify.db as KyselyDatabase;
  const postService = new PostService(db);

  // Get posts feed
  fastify.get('/api/posts', {
    schema: {
      querystring: PostQuerySchema,
      response: {
        200: PostResponseSchema,
      },
    },
  }, async (request) => {
    const { limit = 20, cursor, filter = 'for_you' } = request.query as any;
    const userId = (request as any).user?.sub;

    return await postService.getPostsFeed(limit, cursor, userId, filter);
  });

  // Create new post
  fastify.post('/api/posts', {
    schema: {
      body: CreatePostSchema,
      response: {
        200: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request) => {
    const {
      title,
      caption,
      artistName,
      audioKey,
      videoKey,
      coverKey,
      audioMime,
      videoMime,
      coverMime,
      audioSize,
      videoSize,
      coverSize,
    } = request.body as any;

    const userId = (request as FastifyRequestWithUser).user.sub;
    const postId = randomUUID();
    const now = new Date().toISOString();
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'musio';

    // Create post record
    await db
      .insertInto('posts')
      .values({
        id: postId,
        user_id: userId,
        title,
        caption: caption ?? null,
        artist_name: artistName ?? null,
        duration_ms: null,
        bpm: null,
        key: null,
        visibility: 'public',
        ready: false,
        video_url: videoKey ? `https://res.cloudinary.com/${cloudinaryCloudName}/video/upload/${videoKey}` : null,
        cover_url: coverKey ? `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${coverKey}` : null,
        youtube_id: null,
        source_type: 'user',
        created_at: now,
        updated_at: now,
      })
      .execute();

    // Create media file records
    const mediaFiles = [];

    if (audioKey) {
      mediaFiles.push({
        id: randomUUID(),
        post_id: postId,
        url: `https://res.cloudinary.com/${cloudinaryCloudName}/audio/upload/${audioKey}`,
        type: 'original',
        mime: audioMime ?? null,
        size: audioSize ?? null,
        duration_ms: null,
        width: null,
        height: null,
      });
    }

    if (videoKey) {
      mediaFiles.push({
        id: randomUUID(),
        post_id: postId,
        url: `https://res.cloudinary.com/${cloudinaryCloudName}/video/upload/${videoKey}`,
        type: 'video',
        mime: videoMime ?? null,
        size: videoSize ?? null,
        duration_ms: null,
        width: null,
        height: null,
      });
    }

    if (coverKey) {
      mediaFiles.push({
        id: randomUUID(),
        post_id: postId,
        url: `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${coverKey}`,
        type: 'cover',
        mime: coverMime ?? null,
        size: coverSize ?? null,
        duration_ms: null,
        width: null,
        height: null,
      });
    }

    if (mediaFiles.length > 0) {
      await db.insertInto('media_files').values(mediaFiles).execute();
    }

    return { id: postId };
  });
}
