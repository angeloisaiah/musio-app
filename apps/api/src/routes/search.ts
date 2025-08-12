import type { FastifyInstance } from 'fastify';
import type { KyselyDatabase } from '@musio/shared';
import { Type } from '@sinclair/typebox';

const SearchQuerySchema = Type.Object({
  q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  tags: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  cursor: Type.Optional(Type.String()),
});

const SearchResponseSchema = Type.Object({
  items: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      caption: Type.Union([Type.String(), Type.Null()]),
      duration_ms: Type.Union([Type.Integer(), Type.Null()]),
      user_id: Type.String(),
      user_name: Type.Union([Type.String(), Type.Null()]),
      user_avatar_url: Type.Union([Type.String(), Type.Null()]),
      preview_url: Type.Union([Type.String(), Type.Null()]),
      waveform_url: Type.Union([Type.String(), Type.Null()]),
      created_at: Type.String(),
    }),
  ),
  nextCursor: Type.Union([Type.String(), Type.Null()]),
});

export async function searchRoutes(fastify: FastifyInstance) {
  const db = fastify.db as KyselyDatabase;

  // Search posts
  fastify.get(
    '/api/search',
    {
      schema: {
        querystring: SearchQuerySchema,
        response: {
          200: SearchResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { q, tags, limit = 20, cursor } = request.query as any;

      if (!q && !tags) {
        return reply.code(400).send({ error: "Either 'q' or 'tags' parameter is required" });
      }

      let query = db
        .selectFrom('posts as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .leftJoin('media_files as preview', (join) =>
          join.onRef('preview.post_id', '=', 'p.id').on('preview.type', '=', 'preview'),
        )
        .leftJoin('media_files as waveform', (join) =>
          join.onRef('waveform.post_id', '=', 'p.id').on('waveform.type', '=', 'waveform_json'),
        )
        .select([
          'p.id',
          'p.title',
          'p.caption',
          'p.created_at',
          'p.duration_ms',
          'u.id as user_id',
          'u.name as user_name',
          'u.avatar_url as user_avatar_url',
          'preview.url as preview_url',
          'waveform.url as waveform_url',
        ])
        .where('p.ready', '=', true)
        .where('p.visibility', '=', 'public');

      // Text search
      if (q) {
        query = query.where((eb) =>
          eb('p.title', 'ilike', `%${q}%`)
            .or('p.caption', 'ilike', `%${q}%`)
            .or('u.name', 'ilike', `%${q}%`),
        );
      }

      // Tag search
      if (tags) {
        const tagList = tags.split(',').map((tag: string) => tag.trim().toLowerCase());
        query = query
          .leftJoin('post_tags as pt', 'pt.post_id', 'p.id')
          .leftJoin('tags as t', 't.id', 'pt.tag_id')
          .where('t.normalized', 'in', tagList)
          .groupBy(['p.id', 'u.id', 'preview.url', 'waveform.url'])
          .having(db.fn.countAll(), '>=', tagList.length);
      }

      query = query.orderBy('p.created_at', 'desc').orderBy('p.id', 'desc').limit(limit);

      if (cursor) {
        const [createdAt, id] = cursor.split('|');
        query = query.where((eb) =>
          eb('p.created_at', '<', createdAt).or(
            eb.and([eb('p.created_at', '=', createdAt), eb('p.id', '<', id)]),
          ),
        );
      }

      const results = await query.execute();

      const nextCursor =
        results.length === limit && results.length > 0
          ? `${results[results.length - 1].created_at}|${results[results.length - 1].id}`
          : null;

      return {
        items: results,
        nextCursor,
      };
    },
  );

  // Get popular tags
  fastify.get(
    '/api/tags/popular',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: Type.Object({
            items: Type.Array(
              Type.Object({
                name: Type.String(),
                count: Type.Integer(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const { limit = 20 } = request.query as any;

      const tags = await db
        .selectFrom('tags as t')
        .leftJoin('post_tags as pt', 'pt.tag_id', 't.id')
        .leftJoin('posts as p', (join) =>
          join
            .onRef('p.id', '=', 'pt.post_id')
            .on('p.ready', '=', true)
            .on('p.visibility', '=', 'public'),
        )
        .select(['t.name', db.fn.countAll().as('count')])
        .groupBy('t.id')
        .orderBy('count', 'desc')
        .limit(limit)
        .execute();

      return {
        items: tags.map((tag) => ({
          name: tag.name,
          count: Number(tag.count),
        })),
      };
    },
  );
}
