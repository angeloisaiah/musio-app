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

describe('User Profile API', () => {
  test('GET /api/users/:userId returns user profile with stats', async () => {
    // Create a test user
    const userId = randomUUID();
    const email = `profile-test-${Date.now()}@example.com`;

    await db
      .insertInto('users')
      .values({
        id: userId,
        name: 'Profile Test User',
        email,
        bio: 'This is a test bio',
        created_at: new Date().toISOString(),
        provider: 'local',
        provider_id: email,
      })
      .execute();

    // Create some test posts
    const postId1 = randomUUID();
    const postId2 = randomUUID();

    await db
      .insertInto('posts')
      .values([
        {
          id: postId1,
          user_id: userId,
          title: 'Test Post 1',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: postId2,
          user_id: userId,
          title: 'Test Post 2',
          visibility: 'public',
          ready: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    // Test the profile endpoint
    const res = await request(app.server).get(`/api/users/${userId}`).expect(200);

    expect(res.body).toEqual({
      user: {
        id: userId,
        name: 'Profile Test User',
        bio: 'This is a test bio',
        avatar_url: null,
        created_at: expect.any(String),
      },
      stats: {
        postsCount: 2,
        followersCount: 0,
        followingCount: 0,
      },
    });
  });

  test('GET /api/users/:userId/posts returns user posts', async () => {
    // Create a test user
    const userId = randomUUID();
    const email = `posts-test-${Date.now()}@example.com`;

    await db
      .insertInto('users')
      .values({
        id: userId,
        name: 'Posts Test User',
        email,
        created_at: new Date().toISOString(),
        provider: 'local',
        provider_id: email,
      })
      .execute();

    // Create test posts
    const postId = randomUUID();
    await db
      .insertInto('posts')
      .values({
        id: postId,
        user_id: userId,
        title: 'User Post Test',
        caption: 'Test caption',
        visibility: 'public',
        ready: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    // Test the user posts endpoint
    const res = await request(app.server).get(`/api/users/${userId}/posts`).expect(200);

    expect(res.body).toEqual({
      items: [
        {
          id: postId,
          title: 'User Post Test',
          caption: 'Test caption',
          preview_url: null,
          waveform_url: null,
          duration_ms: null,
          created_at: expect.any(String),
          counts: { likes: 0, comments: 0, reposts: 0, plays: 0 },
        },
      ],
      nextCursor: null,
    });
  });

  test('GET /api/users/:userId returns 404 for non-existent user', async () => {
    const nonExistentUserId = randomUUID();

    await request(app.server).get(`/api/users/${nonExistentUserId}`).expect(404);
  });

  test('GET /api/users/:userId/posts returns 404 for non-existent user', async () => {
    const nonExistentUserId = randomUUID();

    await request(app.server).get(`/api/users/${nonExistentUserId}/posts`).expect(404);
  });
});
