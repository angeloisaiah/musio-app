import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildServer } from '../../../apps/api/src/server';
import { createDb } from '../../../apps/api/src/db/connection';
import type { KyselyDatabase } from '@musio/shared/src/db/types';
import { randomUUID } from 'node:crypto';
import { processPostWithAI } from '../../../apps/api/src/services/ai-service';

let app: ReturnType<typeof buildServer>;
let db: KyselyDatabase;

beforeAll(async () => {
  app = buildServer();
  db = createDb();
  await app.listen({ port: 0 });
});

afterAll(async () => {
  await app.close();
  await db.destroy();
});

describe('AI Features API', () => {
  let testUserId: string;
  let testPostId1: string;
  let testPostId2: string;

  beforeAll(async () => {
    // Create test user
    const email = `ai-test-${Date.now()}@example.com`;
    const signupRes = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'AI Test User', email, password: 'password123' })
      .expect(200);

    testUserId = signupRes.body.user.id;

    // Create test posts
    testPostId1 = randomUUID();
    testPostId2 = randomUUID();

    await db
      .insertInto('posts')
      .values([
        {
          id: testPostId1,
          user_id: testUserId,
          title: 'Deep House Music',
          caption: 'Smooth and groovy deep house track',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: testPostId2,
          user_id: testUserId,
          title: 'Ambient Soundscape',
          caption: 'Atmospheric and dreamy ambient music',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    // Process posts with AI
    await processPostWithAI(
      testPostId1 as any,
      'Deep House Music',
      'Smooth and groovy deep house track',
    );
    await processPostWithAI(
      testPostId2 as any,
      'Ambient Soundscape',
      'Atmospheric and dreamy ambient music',
    );
  });

  describe('AI Auto-tagging', () => {
    test('processPostWithAI generates appropriate tags', async () => {
      // Check if tags were generated for the first post
      const tags = await db
        .selectFrom('post_tags as pt')
        .leftJoin('tags as t', 't.id', 'pt.tag_id')
        .select('t.name')
        .where('pt.post_id', '=', testPostId1)
        .execute();

      expect(tags.length).toBeGreaterThan(0);

      // Should contain relevant tags based on title/caption
      const tagNames = tags.map((t) => t.name?.toLowerCase());
      expect(
        tagNames.some(
          (name) =>
            name?.includes('house') ||
            name?.includes('deep') ||
            name?.includes('electronic') ||
            name?.includes('music'),
        ),
      ).toBe(true);
    });

    test('AI tags appear in feed', async () => {
      const res = await request(app.server).get('/api/posts').expect(200);

      const post = res.body.items.find((p: any) => p.id === testPostId1);
      expect(post).toBeDefined();
      expect(post.tags).toEqual(expect.any(Array));
      expect(post.tags.length).toBeGreaterThan(0);
    });
  });

  describe('Vector Embeddings', () => {
    test('processPostWithAI generates embeddings', async () => {
      const embedding = await db
        .selectFrom('embeddings')
        .select(['embedding', 'created_at'])
        .where('post_id', '=', testPostId1)
        .executeTakeFirst();

      expect(embedding).toBeDefined();
      expect(embedding?.embedding).toBeDefined();

      // Parse and validate embedding structure
      const embeddingData = JSON.parse(embedding?.embedding as any);
      expect(Array.isArray(embeddingData)).toBe(true);
      expect(embeddingData.length).toBe(384); // Expected embedding dimension
      expect(embeddingData.every((val: any) => typeof val === 'number')).toBe(true);
    });
  });

  describe('Similar Posts', () => {
    test('GET /api/posts/:postId/similar returns similar posts', async () => {
      const res = await request(app.server).get(`/api/posts/${testPostId1}/similar`).expect(200);

      expect(res.body.items).toEqual(expect.any(Array));

      // Each similar post should have similarity score
      res.body.items.forEach((item: any) => {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            user: expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
            }),
            similarity: expect.any(Number),
            tags: expect.any(Array),
          }),
        );

        // Similarity should be between 0 and 1
        expect(item.similarity).toBeGreaterThanOrEqual(0);
        expect(item.similarity).toBeLessThanOrEqual(1);
      });
    });

    test('GET /api/posts/:postId/similar - 404 for non-existent post', async () => {
      const fakePostId = randomUUID();
      await request(app.server).get(`/api/posts/${fakePostId}/similar`).expect(404);
    });

    test('GET /api/posts/:postId/similar respects limit parameter', async () => {
      const res = await request(app.server)
        .get(`/api/posts/${testPostId1}/similar?limit=5`)
        .expect(200);

      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('AI Integration with Search', () => {
    test('Search includes AI-generated tags', async () => {
      // Get tags for the post to search with
      const tags = await db
        .selectFrom('post_tags as pt')
        .leftJoin('tags as t', 't.id', 'pt.tag_id')
        .select('t.normalized')
        .where('pt.post_id', '=', testPostId1)
        .execute();

      if (tags.length > 0) {
        const tagName = tags[0].normalized;
        const res = await request(app.server).get(`/api/search?tags=${tagName}`).expect(200);

        expect(res.body.items.length).toBeGreaterThan(0);
        const foundPost = res.body.items.find((p: any) => p.id === testPostId1);
        expect(foundPost).toBeDefined();
      }
    });
  });
});
