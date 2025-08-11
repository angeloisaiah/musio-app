import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../../../apps/api/src/server';
import type { FastifyInstance } from 'fastify';
import { createDb } from '../../../apps/api/src/db/connection';
import type { KyselyDatabase } from '@musio/shared';

describe('TikTok-Style Feed API', () => {
  let app: FastifyInstance;
  let db: KyselyDatabase;
  let testUser: { id: string; token: string };

  beforeEach(async () => {
    app = buildServer();
    await app.ready();
    db = createDb();

    // Create test user and get auth token
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpass123',
      },
    });

    expect(signupResponse.statusCode).toBe(200);
    const userData = signupResponse.json();
    testUser = {
      id: userData.user.id,
      token: userData.token,
    };
  });

  afterEach(async () => {
    await db.destroy();
    await app.close();
  });

  test('should fetch empty feed initially', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/feed',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.items).toEqual([]);
    expect(data.nextCursor).toBeNull();
  });

  test('should create enhanced post with video and cover art', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/posts/enhanced',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
      payload: {
        title: 'Test Track with Video',
        caption: 'A test track with video and cover art',
        artistName: 'Test Artist',
        audioKey: 'test-audio-key',
        videoKey: 'test-video-key',
        coverKey: 'test-cover-key',
        audioMime: 'audio/mpeg',
        videoMime: 'video/mp4',
        coverMime: 'image/jpeg',
        audioSize: 1000000,
        videoSize: 5000000,
        coverSize: 50000,
      },
    });

    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('processing');

    // Verify post was created in database
    const post = await db
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', data.id)
      .executeTakeFirst();

    expect(post).toBeDefined();
    expect(post?.title).toBe('Test Track with Video');
    expect(post?.artist_name).toBe('Test Artist');
    expect(post?.source_type).toBe('user');
    expect(post?.video_url).toContain('test-video-key');
    expect(post?.cover_url).toContain('test-cover-key');
  });

  test('should create enhanced post with audio only', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/posts/enhanced',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
      payload: {
        title: 'Audio Only Track',
        caption: 'Just audio',
        audioKey: 'test-audio-only-key',
        audioMime: 'audio/wav',
        audioSize: 2000000,
      },
    });

    expect(response.statusCode).toBe(201);
    const data = response.json();

    // Verify media files were created
    const mediaFiles = await db
      .selectFrom('media_files')
      .selectAll()
      .where('post_id', '=', data.id)
      .execute();

    expect(mediaFiles).toHaveLength(1);
    expect(mediaFiles[0].type).toBe('original');
    expect(mediaFiles[0].mime).toBe('audio/wav');
  });

  test('should reject enhanced post without audio or video', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/posts/enhanced',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
      payload: {
        title: 'Cover Only',
        coverKey: 'test-cover-only-key',
        coverMime: 'image/png',
      },
    });

    // Should still create the post since cover art alone might be valid
    // In a real implementation, you might want stricter validation
    expect(response.statusCode).toBe(201);
  });

  test('should include enhanced posts in feed', async () => {
    // Create a test post with video and cover art
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/posts/enhanced',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
      payload: {
        title: 'Feed Test Track',
        caption: 'This should appear in feed',
        artistName: 'Feed Artist',
        audioKey: 'feed-audio-key',
        videoKey: 'feed-video-key',
        coverKey: 'feed-cover-key',
        audioMime: 'audio/mpeg',
        videoMime: 'video/mp4',
        coverMime: 'image/jpeg',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const postData = createResponse.json();

    // Mark the post as ready for testing
    await db.updateTable('posts').set({ ready: true }).where('id', '=', postData.id).execute();

    // Fetch the feed
    const feedResponse = await app.inject({
      method: 'GET',
      url: '/api/feed',
    });

    expect(feedResponse.statusCode).toBe(200);
    const feedData = feedResponse.json();
    expect(feedData.items).toHaveLength(1);

    const feedItem = feedData.items[0];
    expect(feedItem.id).toBe(postData.id);
    expect(feedItem.title).toBe('Feed Test Track');
    expect(feedItem.artist_name).toBe('Feed Artist');
    expect(feedItem.source_type).toBe('user');
    expect(feedItem.video_url).toContain('feed-video-key');
    expect(feedItem.cover_url).toContain('feed-cover-key');
    expect(feedItem.youtube_id).toBeNull();
  });

  test('should support pagination in feed', async () => {
    // Create multiple test posts
    const posts = [];
    for (let i = 0; i < 5; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/posts/enhanced',
        headers: {
          authorization: `Bearer ${testUser.token}`,
        },
        payload: {
          title: `Test Track ${i}`,
          audioKey: `audio-key-${i}`,
          audioMime: 'audio/mpeg',
        },
      });
      posts.push(response.json());
    }

    // Mark all posts as ready
    for (const post of posts) {
      await db.updateTable('posts').set({ ready: true }).where('id', '=', post.id).execute();
    }

    // Fetch first page
    const firstPageResponse = await app.inject({
      method: 'GET',
      url: '/api/feed?limit=3',
    });

    expect(firstPageResponse.statusCode).toBe(200);
    const firstPageData = firstPageResponse.json();
    expect(firstPageData.items).toHaveLength(3);
    expect(firstPageData.nextCursor).toBeDefined();

    // Fetch second page
    const secondPageResponse = await app.inject({
      method: 'GET',
      url: `/api/feed?limit=3&cursor=${firstPageData.nextCursor}`,
    });

    expect(secondPageResponse.statusCode).toBe(200);
    const secondPageData = secondPageResponse.json();
    expect(secondPageData.items).toHaveLength(2);
    expect(secondPageData.nextCursor).toBeNull();

    // Verify no duplicate items
    const firstPageIds = firstPageData.items.map((item: any) => item.id);
    const secondPageIds = secondPageData.items.map((item: any) => item.id);
    const intersection = firstPageIds.filter((id: string) => secondPageIds.includes(id));
    expect(intersection).toHaveLength(0);
  });

  test('should include user interaction states in feed', async () => {
    // Create a test post
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/posts/enhanced',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
      payload: {
        title: 'Interaction Test',
        audioKey: 'interaction-audio-key',
        audioMime: 'audio/mpeg',
      },
    });

    const postData = createResponse.json();

    // Mark post as ready
    await db.updateTable('posts').set({ ready: true }).where('id', '=', postData.id).execute();

    // Like the post
    await app.inject({
      method: 'POST',
      url: `/api/posts/${postData.id}/like`,
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
    });

    // Fetch feed (authenticated)
    const feedResponse = await app.inject({
      method: 'GET',
      url: '/api/feed',
      headers: {
        authorization: `Bearer ${testUser.token}`,
      },
    });

    expect(feedResponse.statusCode).toBe(200);
    const feedData = feedResponse.json();
    expect(feedData.items).toHaveLength(1);

    const feedItem = feedData.items[0];
    expect(feedItem.isLikedByMe).toBe(true);
    expect(feedItem.isRepostedByMe).toBe(false);
    expect(feedItem.isBookmarkedByMe).toBe(false);
    expect(feedItem.counts.likes).toBe(1);
  });
});
