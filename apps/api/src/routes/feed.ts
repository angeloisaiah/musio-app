import type { FastifyInstance } from 'fastify';
import type { KyselyDatabase } from '@musio/shared';
import { FeedQuerySchema, FeedResponseSchema } from '../schemas/posts';
import { PostService } from '../services/post-service';

export async function feedRoutes(fastify: FastifyInstance) {
  const db = fastify.db as KyselyDatabase;
  const postService = new PostService(db);

  // TikTok-style vertical feed
  fastify.get(
    '/api/feed',
    {
      schema: {
        querystring: FeedQuerySchema,
        response: {
          200: FeedResponseSchema,
        },
      },
    },
    async (request) => {
      const { limit = 20, cursor } = request.query as any;
      const userId = (request as any).user?.sub; // Optional user for personalization

      return await postService.getPostsFeed(limit, cursor, userId);
    },
  );
}
