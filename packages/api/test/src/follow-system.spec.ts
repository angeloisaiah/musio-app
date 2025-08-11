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

describe('Follow System API', () => {
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;

  beforeAll(async () => {
    // Create test users
    const email1 = `follow-test1-${Date.now()}@example.com`;
    const email2 = `follow-test2-${Date.now()}@example.com`;

    const signup1 = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'Follow Test User 1', email: email1, password: 'password123' })
      .expect(200);

    const signup2 = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'Follow Test User 2', email: email2, password: 'password123' })
      .expect(200);

    user1Id = signup1.body.user.id;
    user1Token = signup1.body.token;
    user2Id = signup2.body.user.id;
    user2Token = signup2.body.token;
  });

  describe('Follow/Unfollow', () => {
    test('POST /api/users/:userId/follow - follow a user', async () => {
      const res = await request(app.server)
        .post(`/api/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toEqual({
        following: true,
        followersCount: 1,
      });
    });

    test('POST /api/users/:userId/follow - unfollow a user', async () => {
      const res = await request(app.server)
        .post(`/api/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toEqual({
        following: false,
        followersCount: 0,
      });
    });

    test('POST /api/users/:userId/follow - cannot follow yourself', async () => {
      await request(app.server)
        .post(`/api/users/${user1Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);
    });

    test('POST /api/users/:userId/follow - 404 for non-existent user', async () => {
      const fakeUserId = randomUUID();
      await request(app.server)
        .post(`/api/users/${fakeUserId}/follow`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    test('POST /api/users/:userId/follow - requires authentication', async () => {
      await request(app.server).post(`/api/users/${user2Id}/follow`).expect(401);
    });
  });

  describe('Followers', () => {
    beforeAll(async () => {
      // User1 follows User2
      await request(app.server)
        .post(`/api/users/${user2Id}/follow`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
    });

    test('GET /api/users/:userId/followers - get user followers', async () => {
      const res = await request(app.server).get(`/api/users/${user2Id}/followers`).expect(200);

      expect(res.body).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: user1Id,
            name: 'Follow Test User 1',
            avatar_url: null,
            followed_at: expect.any(String),
          }),
        ]),
        nextCursor: null,
      });
    });

    test('GET /api/users/:userId/followers - 404 for non-existent user', async () => {
      const fakeUserId = randomUUID();
      await request(app.server).get(`/api/users/${fakeUserId}/followers`).expect(404);
    });
  });

  describe('Following', () => {
    test('GET /api/users/:userId/following - get user following', async () => {
      const res = await request(app.server).get(`/api/users/${user1Id}/following`).expect(200);

      expect(res.body).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: user2Id,
            name: 'Follow Test User 2',
            avatar_url: null,
            followed_at: expect.any(String),
          }),
        ]),
        nextCursor: null,
      });
    });

    test('GET /api/users/:userId/following - 404 for non-existent user', async () => {
      const fakeUserId = randomUUID();
      await request(app.server).get(`/api/users/${fakeUserId}/following`).expect(404);
    });
  });

  describe('User Profile Stats', () => {
    test('GET /api/users/:userId includes updated follower counts', async () => {
      const res = await request(app.server).get(`/api/users/${user2Id}`).expect(200);

      expect(res.body.stats.followersCount).toBe(1);
      expect(res.body.stats.followingCount).toBe(0);

      const res2 = await request(app.server).get(`/api/users/${user1Id}`).expect(200);

      expect(res2.body.stats.followersCount).toBe(0);
      expect(res2.body.stats.followingCount).toBe(1);
    });
  });
});
