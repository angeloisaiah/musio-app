import { test, beforeAll, afterAll, expect, describe, vi } from 'vitest';
import { buildServer } from '../../../apps/api/src/server';
import supertest from 'supertest';
import { KyselyDatabase } from '@musio/shared';
import { createDb } from '../../../apps/api/src/db/connection';
import { YouTubeService } from '../../../apps/api/src/services/youtube-service';

let app: ReturnType<typeof buildServer>;
let db: KyselyDatabase;
let testUser: { id: string; token: string };

beforeAll(async () => {
  app = buildServer();
  await app.listen({ port: 3001 });
  db = createDb();

  // Register a test user
  const registerResponse = await supertest(app.server).post('/api/auth/signup').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123',
  });
  testUser = {
    id: registerResponse.body.user.id,
    token: registerResponse.body.token,
  };
});

afterAll(async () => {
  await app.close();
  await db.destroy();
});

describe('YouTube Service Integration', () => {
  test('should create YouTube service instance with valid configuration', () => {
    const service = new YouTubeService({
      apiKey: 'test-api-key',
      cacheTtlHours: 1,
      useYtDlp: false,
    });
    
    expect(service).toBeDefined();
    expect(service.getCacheStats).toBeDefined();
    expect(service.clearCache).toBeDefined();
  });

  test('should handle YouTube API errors gracefully', async () => {
    const service = new YouTubeService({
      apiKey: 'invalid-api-key',
      cacheTtlHours: 1,
      useYtDlp: false,
    });

    const samples = await service.fetchRandomSamples(5);
    expect(samples).toEqual([]);
  });

  test('should save YouTube sample to database correctly', async () => {
    const service = new YouTubeService({
      apiKey: 'test-api-key',
      cacheTtlHours: 1,
      useYtDlp: false,
    });

    const mockSample = {
      id: 'test-youtube-sample-1',
      title: 'Test Hip Hop Beat',
      artist_name: 'Test Producer',
      cover_url: 'https://example.com/cover.jpg',
      video_url: 'https://example.com/video.mp4',
      audio_url: '/api/youtube/audio/test123',
      duration_ms: 120000,
      youtube_id: 'test123',
      tags: ['hip-hop', 'beat', 'instrumental'],
    };

    // Get or create system user
    let systemUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', 'system@musio.app')
      .executeTakeFirst();

    if (!systemUser) {
      const systemUserId = 'system-user-id';
      await db
        .insertInto('users')
        .values({
          id: systemUserId,
          name: 'Mus.io',
          email: 'system@musio.app',
          avatar_url: null,
          bio: 'System user for YouTube samples',
          provider: 'system',
          provider_id: 'system',
          created_at: new Date().toISOString(),
        })
        .execute();
      systemUser = { id: systemUserId };
    }

    const savedId = await service.saveYouTubeSampleAsPost(db, mockSample, systemUser.id);
    expect(savedId).toBe(mockSample.id);

    // Verify post was saved
    const post = await db
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', savedId)
      .executeTakeFirst();

    expect(post).toBeDefined();
    expect(post?.title).toBe(mockSample.title);
    expect(post?.artist_name).toBe(mockSample.artist_name);
    expect(post?.youtube_id).toBe(mockSample.youtube_id);
    expect(post?.source_type).toBe('youtube');
    expect(post?.ready).toBe(true);

    // Verify media files were created
    const mediaFiles = await db
      .selectFrom('media_files')
      .selectAll()
      .where('post_id', '=', savedId)
      .execute();

    expect(mediaFiles).toHaveLength(2); // audio and cover
    expect(mediaFiles.some(m => m.type === 'preview')).toBe(true);
    expect(mediaFiles.some(m => m.type === 'cover')).toBe(true);

    // Verify tags were created and linked
    const postTags = await db
      .selectFrom('post_tags as pt')
      .innerJoin('tags as t', 't.id', 'pt.tag_id')
      .select(['t.name'])
      .where('pt.post_id', '=', savedId)
      .execute();

    const tagNames = postTags.map(pt => pt.name);
    expect(tagNames).toEqual(expect.arrayContaining(mockSample.tags));
  });

  test('should not create duplicate posts for same YouTube video', async () => {
    const service = new YouTubeService({
      apiKey: 'test-api-key',
      cacheTtlHours: 1,
      useYtDlp: false,
    });

    const mockSample = {
      id: 'test-youtube-sample-2',
      title: 'Test Jazz Sample',
      artist_name: 'Jazz Artist',
      cover_url: 'https://example.com/jazz-cover.jpg',
      video_url: null,
      audio_url: '/api/youtube/audio/jazz123',
      duration_ms: 180000,
      youtube_id: 'jazz123',
      tags: ['jazz', 'sample'],
    };

    // Get system user
    const systemUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', 'system@musio.app')
      .executeTakeFirst();

    // Save sample first time
    const firstId = await service.saveYouTubeSampleAsPost(db, mockSample, systemUser!.id);
    expect(firstId).toBe(mockSample.id);

    // Try to save same YouTube video again
    const secondId = await service.saveYouTubeSampleAsPost(db, mockSample, systemUser!.id);
    expect(secondId).toBe(firstId); // Should return existing post ID

    // Verify only one post exists
    const posts = await db
      .selectFrom('posts')
      .selectAll()
      .where('youtube_id', '=', mockSample.youtube_id)
      .execute();

    expect(posts).toHaveLength(1);
  });

  test('should cache samples correctly', async () => {
    const service = new YouTubeService({
      apiKey: 'test-api-key',
      cacheTtlHours: 1,
      useYtDlp: false,
    });

    // Clear cache first
    service.clearCache();
    
    const initialStats = service.getCacheStats();
    expect(initialStats.keys).toBe(0);
    expect(initialStats.hits).toBe(0);

    // Mock the fetch to avoid actual API calls
    vi.spyOn(service, 'fetchRandomSamples').mockResolvedValue([]);

    await service.fetchRandomSamples(5);
    await service.fetchRandomSamples(5); // Second call should hit cache

    const finalStats = service.getCacheStats();
    expect(finalStats.keys).toBeGreaterThan(0);
  });
});

describe('Enhanced Feed Endpoint Integration', () => {
  test('should return mixed feed with user and YouTube samples', async () => {
    // Create a regular user post first
    const createPostResponse = await supertest(app.server)
      .post('/api/posts/enhanced')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        title: 'My Test Track',
        caption: 'A test track for the feed',
        artistName: 'Test Artist',
      });

    expect(createPostResponse.statusCode).toBe(201);

    // Test feed endpoint
    const feedResponse = await supertest(app.server)
      .get('/api/feed')
      .query({
        limit: 10,
        includeYoutube: false, // Disable YouTube for predictable testing
      });

    expect(feedResponse.statusCode).toBe(200);
    expect(feedResponse.body.items).toBeDefined();
    expect(Array.isArray(feedResponse.body.items)).toBe(true);

    if (feedResponse.body.items.length > 0) {
      const item = feedResponse.body.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('user');
      expect(item).toHaveProperty('source_type');
      expect(item).toHaveProperty('counts');
      expect(item).toHaveProperty('tags');
      expect(item).toHaveProperty('isLikedByMe');
      expect(item).toHaveProperty('isRepostedByMe');
      expect(item).toHaveProperty('isBookmarkedByMe');

      // Verify user object structure
      expect(item.user).toHaveProperty('id');
      expect(item.user).toHaveProperty('name');
      expect(item.user).toHaveProperty('avatar_url');

      // Verify counts object structure
      expect(item.counts).toHaveProperty('likes');
      expect(item.counts).toHaveProperty('comments');
      expect(item.counts).toHaveProperty('reposts');
      expect(item.counts).toHaveProperty('plays');
    }
  });

  test('should support pagination with cursor', async () => {
    const firstPageResponse = await supertest(app.server)
      .get('/api/feed')
      .query({
        limit: 2,
        includeYoutube: false,
      });

    expect(firstPageResponse.statusCode).toBe(200);
    expect(firstPageResponse.body).toHaveProperty('nextCursor');

    if (firstPageResponse.body.nextCursor) {
      const secondPageResponse = await supertest(app.server)
        .get('/api/feed')
        .query({
          limit: 2,
          cursor: firstPageResponse.body.nextCursor,
          includeYoutube: false,
        });

      expect(secondPageResponse.statusCode).toBe(200);
      expect(secondPageResponse.body.items).toBeDefined();

      // Items should be different between pages
      const firstPageIds = firstPageResponse.body.items.map((item: any) => item.id);
      const secondPageIds = secondPageResponse.body.items.map((item: any) => item.id);
      
      const hasUniqueItems = firstPageIds.some((id: string) => !secondPageIds.includes(id));
      expect(hasUniqueItems).toBe(true);
    }
  });

  test('should filter by genre when provided', async () => {
    const feedResponse = await supertest(app.server)
      .get('/api/feed')
      .query({
        limit: 5,
        genre: 'hip-hop',
        includeYoutube: false,
      });

    expect(feedResponse.statusCode).toBe(200);
    expect(feedResponse.body.items).toBeDefined();
  });

  test('should handle authentication for user-specific data', async () => {
    // Test without authentication
    const unauthenticatedResponse = await supertest(app.server)
      .get('/api/feed')
      .query({ limit: 5, includeYoutube: false });

    expect(unauthenticatedResponse.statusCode).toBe(200);
    
    if (unauthenticatedResponse.body.items.length > 0) {
      const item = unauthenticatedResponse.body.items[0];
      expect(item.isLikedByMe).toBe(false);
      expect(item.isRepostedByMe).toBe(false);
      expect(item.isBookmarkedByMe).toBe(false);
    }

    // Test with authentication
    const authenticatedResponse = await supertest(app.server)
      .get('/api/feed')
      .set('Authorization', `Bearer ${testUser.token}`)
      .query({ limit: 5, includeYoutube: false });

    expect(authenticatedResponse.statusCode).toBe(200);
    expect(authenticatedResponse.body.items).toBeDefined();
  });

  test('should handle enhanced post creation with all media types', async () => {
    const response = await supertest(app.server)
      .post('/api/posts/enhanced')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        title: 'Complete Media Test',
        caption: 'Testing all media types',
        artistName: 'Full Stack Artist',
        audioKey: 'test-audio-key-123',
        videoKey: 'test-video-key-123',
        coverKey: 'test-cover-key-123',
        audioMime: 'audio/mpeg',
        videoMime: 'video/mp4',
        coverMime: 'image/jpeg',
        audioSize: 5000000,
        videoSize: 20000000,
        coverSize: 500000,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', 'processing');

    // Verify the post was created in database
    const post = await db
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', response.body.id)
      .executeTakeFirst();

    expect(post).toBeDefined();
    expect(post?.title).toBe('Complete Media Test');
    expect(post?.artist_name).toBe('Full Stack Artist');
    expect(post?.source_type).toBe('user');
    expect(post?.video_url).toContain('test-video-key-123');
    expect(post?.cover_url).toContain('test-cover-key-123');

    // Verify media files were created
    const mediaFiles = await db
      .selectFrom('media_files')
      .selectAll()
      .where('post_id', '=', response.body.id)
      .execute();

    expect(mediaFiles).toHaveLength(3); // audio, video, cover
    expect(mediaFiles.some(m => m.type === 'original' && m.url.includes('test-audio-key-123'))).toBe(true);
    expect(mediaFiles.some(m => m.type === 'video' && m.url.includes('test-video-key-123'))).toBe(true);
    expect(mediaFiles.some(m => m.type === 'cover' && m.url.includes('test-cover-key-123'))).toBe(true);
  });

  test('should handle YouTube proxy endpoints', async () => {
    // Test audio proxy endpoint
    const audioResponse = await supertest(app.server)
      .get('/api/youtube/audio/test-video-id');

    expect(audioResponse.statusCode).toBe(501); // Not implemented yet
    expect(audioResponse.body).toHaveProperty('error');
    expect(audioResponse.body).toHaveProperty('videoId', 'test-video-id');

    // Test video proxy endpoint
    const videoResponse = await supertest(app.server)
      .get('/api/youtube/video/test-video-id');

    expect(videoResponse.statusCode).toBe(501); // Not implemented yet
    expect(videoResponse.body).toHaveProperty('error');
    expect(videoResponse.body).toHaveProperty('videoId', 'test-video-id');
  });
});
