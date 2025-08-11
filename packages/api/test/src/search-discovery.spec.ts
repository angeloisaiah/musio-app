import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildServer } from '../../../apps/api/src/server';
import { createDb } from '../../../apps/api/src/db/connection';
import type { KyselyDatabase } from '@musio/shared/src/db/types';
import { randomUUID } from 'node:crypto';

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

describe('Search and Discovery API', () => {
  let testUserId: string;
  let testPostId1: string;
  let testPostId2: string;
  let houseTagId: number;
  let technoTagId: number;

  beforeAll(async () => {
    // Create test user
    const email = `search-test-${Date.now()}@example.com`;
    const signupRes = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'Search Test User', email, password: 'password123' })
      .expect(200);

    testUserId = signupRes.body.user.id;

    // Create tags or get existing ones
    let houseTag = await db
      .selectFrom('tags')
      .select('id')
      .where('normalized', '=', 'house')
      .executeTakeFirst();

    if (!houseTag) {
      houseTag = await db
        .insertInto('tags')
        .values({ name: 'House', normalized: 'house' })
        .returning('id')
        .executeTakeFirstOrThrow();
    }
    houseTagId = houseTag.id;

    let technoTag = await db
      .selectFrom('tags')
      .select('id')
      .where('normalized', '=', 'techno')
      .executeTakeFirst();

    if (!technoTag) {
      technoTag = await db
        .insertInto('tags')
        .values({ name: 'Techno', normalized: 'techno' })
        .returning('id')
        .executeTakeFirstOrThrow();
    }
    technoTagId = technoTag.id;

    // Create test posts
    testPostId1 = randomUUID();
    testPostId2 = randomUUID();

    await db
      .insertInto('posts')
      .values([
        {
          id: testPostId1,
          user_id: testUserId,
          title: 'Deep House Vibes',
          caption: 'Smooth deep house track',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: testPostId2,
          user_id: testUserId,
          title: 'Techno Beats',
          caption: 'Hard techno for the club',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    // Add tags to posts
    await db
      .insertInto('post_tags')
      .values([
        { post_id: testPostId1, tag_id: houseTagId },
        { post_id: testPostId2, tag_id: technoTagId },
      ])
      .execute();
  });

  describe('Search Posts', () => {
    test('GET /api/search with text query', async () => {
      const res = await request(app.server).get('/api/search?q=deep').expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          id: testPostId1,
          title: 'Deep House Vibes',
          caption: 'Smooth deep house track',
          user: expect.objectContaining({
            id: testUserId,
            name: 'Search Test User',
          }),
          tags: ['House'],
        }),
      );
    });

    test('GET /api/search with tag filter', async () => {
      const res = await request(app.server).get('/api/search?tags=techno').expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          id: testPostId2,
          title: 'Techno Beats',
          tags: ['Techno'],
        }),
      );
    });

    test('GET /api/search with multiple tags', async () => {
      const res = await request(app.server).get('/api/search?tags=house,techno').expect(200);

      // Should return no results as no post has both tags
      expect(res.body.items).toHaveLength(0);
    });

    test('GET /api/search with user name', async () => {
      const res = await request(app.server).get('/api/search?q=Search Test User').expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items.every((item: any) => item.user.name === 'Search Test User')).toBe(true);
    });

    test('GET /api/search requires query or tags', async () => {
      await request(app.server).get('/api/search').expect(400);
    });

    test('GET /api/search with combined text and tags', async () => {
      const res = await request(app.server).get('/api/search?q=house&tags=house').expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(testPostId1);
    });
  });

  describe('Popular Tags', () => {
    test('GET /api/tags/popular returns tags with counts', async () => {
      const res = await request(app.server).get('/api/tags/popular').expect(200);

      expect(res.body.items).toEqual(
        expect.arrayContaining([
          { name: 'House', count: 1 },
          { name: 'Techno', count: 1 },
        ]),
      );
    });

    test('GET /api/tags/popular respects limit parameter', async () => {
      const res = await request(app.server).get('/api/tags/popular?limit=1').expect(200);

      expect(res.body.items).toHaveLength(1);
    });
  });

  describe('Search with pagination', () => {
    test('GET /api/search supports cursor pagination', async () => {
      const res = await request(app.server).get('/api/search?q=test&limit=1').expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(typeof res.body.nextCursor === 'string' || res.body.nextCursor === null).toBe(true);
    });
  });
});
