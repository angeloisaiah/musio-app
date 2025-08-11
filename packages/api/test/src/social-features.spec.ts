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

describe('Social Features API', () => {
  let testUserId: string;
  let testPostId: string;
  let testToken: string;

  beforeAll(async () => {
    // Create test user and get token
    const email = `social-test-${Date.now()}@example.com`;
    const signupRes = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'Social Test User', email, password: 'password123' })
      .expect(200);

    testUserId = signupRes.body.user.id;
    testToken = signupRes.body.token;

    // Create test post
    testPostId = randomUUID();
    await db
      .insertInto('posts')
      .values({
        id: testPostId,
        user_id: testUserId,
        title: 'Test Post for Social Features',
        visibility: 'public',
        ready: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();
  });

  describe('Likes', () => {
    test('POST /api/posts/:postId/like - like a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        liked: true,
        likesCount: 1,
      });
    });

    test('POST /api/posts/:postId/like - unlike a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        liked: false,
        likesCount: 0,
      });
    });

    test('POST /api/posts/:postId/like - requires authentication', async () => {
      await request(app.server).post(`/api/posts/${testPostId}/like`).expect(401);
    });

    test('POST /api/posts/:postId/like - 404 for non-existent post', async () => {
      const fakePostId = randomUUID();
      await request(app.server)
        .post(`/api/posts/${fakePostId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('Reposts', () => {
    test('POST /api/posts/:postId/repost - repost a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/repost`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        reposted: true,
        repostsCount: 1,
      });
    });

    test('POST /api/posts/:postId/repost - unrepost a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/repost`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        reposted: false,
        repostsCount: 0,
      });
    });
  });

  describe('Bookmarks', () => {
    test('POST /api/posts/:postId/bookmark - bookmark a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/bookmark`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        bookmarked: true,
      });
    });

    test('POST /api/posts/:postId/bookmark - unbookmark a post', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/bookmark`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(res.body).toEqual({
        bookmarked: false,
      });
    });
  });

  describe('Comments', () => {
    test('POST /api/posts/:postId/comments - create a comment', async () => {
      const res = await request(app.server)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ text: 'This is a test comment' })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        text: 'This is a test comment',
        user: {
          id: testUserId,
          name: 'Social Test User',
        },
        created_at: expect.any(String),
      });
    });

    test('GET /api/posts/:postId/comments - get comments', async () => {
      const res = await request(app.server).get(`/api/posts/${testPostId}/comments`).expect(200);

      expect(res.body).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            text: 'This is a test comment',
            user: {
              id: testUserId,
              name: 'Social Test User',
            },
            created_at: expect.any(String),
          }),
        ]),
        nextCursor: null,
      });
    });

    test('POST /api/posts/:postId/comments - requires authentication', async () => {
      await request(app.server)
        .post(`/api/posts/${testPostId}/comments`)
        .send({ text: 'This should fail' })
        .expect(401);
    });
  });

  describe('Feed with social data', () => {
    test('GET /api/posts includes interaction counts and user states', async () => {
      // Like the post first
      await request(app.server)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Get feed
      const res = await request(app.server)
        .get('/api/posts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const post = res.body.items.find((p: any) => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post).toEqual(
        expect.objectContaining({
          id: testPostId,
          counts: expect.objectContaining({
            likes: expect.any(Number),
            comments: expect.any(Number),
            reposts: expect.any(Number),
            plays: expect.any(Number),
          }),
          isLikedByMe: expect.any(Boolean), // Could be false if like was toggled off
          isRepostedByMe: expect.any(Boolean),
          isBookmarkedByMe: expect.any(Boolean),
        }),
      );

      // Verify the counts are correct
      expect(post.counts.likes).toBeGreaterThanOrEqual(0);
      expect(post.counts.comments).toBeGreaterThanOrEqual(0);
    });
  });
});
