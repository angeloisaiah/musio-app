import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../../../apps/api/src/db/connection';
import { PostService } from '../../../apps/api/src/services/post-service';
import type { KyselyDatabase } from '@musio/shared';

describe('PostService', () => {
  let db: KyselyDatabase;
  let postService: PostService;
  let testUserId: string;
  let testPostIds: string[];

  beforeEach(async () => {
    db = createDb();
    postService = new PostService(db);
    
    // Create test user
    testUserId = 'test-user-' + Date.now();
    await db
      .insertInto('users')
      .values({
        id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        bio: null,
        avatar_url: null,
        provider: null,
        provider_id: null,
        created_at: new Date().toISOString(),
      })
      .execute();

    // Create test posts
    testPostIds = [];
    for (let i = 0; i < 3; i++) {
      const postId = `test-post-${i}-${Date.now()}`;
      testPostIds.push(postId);
      
      await db
        .insertInto('posts')
        .values({
          id: postId,
          user_id: testUserId,
          title: `Test Post ${i}`,
          caption: `Test caption ${i}`,
          artist_name: 'Test Artist',
          duration_ms: 180000,
          bpm: 120,
          key: 'C',
          visibility: 'public',
          ready: true,
          video_url: null,
          cover_url: null,
          youtube_id: null,
          source_type: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testPostIds.length > 0) {
      await db.deleteFrom('posts').where('id', 'in', testPostIds).execute();
    }
    await db.deleteFrom('users').where('id', '=', testUserId).execute();
    await db.destroy();
  });

  describe('getPostCounts', () => {
    test('should return zero counts for posts with no interactions', async () => {
      const counts = await postService.getPostCounts(testPostIds);
      
      expect(counts.size).toBe(testPostIds.length);
      
      for (const postId of testPostIds) {
        const postCounts = counts.get(postId);
        expect(postCounts).toBeDefined();
        expect(postCounts!.likes).toBe(0);
        expect(postCounts!.comments).toBe(0);
        expect(postCounts!.reposts).toBe(0);
        expect(postCounts!.plays).toBe(0);
      }
    });

    test('should handle empty post IDs array', async () => {
      const counts = await postService.getPostCounts([]);
      expect(counts.size).toBe(0);
    });
  });

  describe('getUserInteractions', () => {
    test('should return false interactions for user with no interactions', async () => {
      const interactions = await postService.getUserInteractions(testPostIds, testUserId);
      
      expect(interactions.size).toBe(testPostIds.length);
      
      for (const postId of testPostIds) {
        const postInteractions = interactions.get(postId);
        expect(postInteractions).toBeDefined();
        expect(postInteractions!.isLikedByMe).toBe(false);
        expect(postInteractions!.isRepostedByMe).toBe(false);
        expect(postInteractions!.isBookmarkedByMe).toBe(false);
      }
    });

    test('should handle empty post IDs array', async () => {
      const interactions = await postService.getUserInteractions([], testUserId);
      expect(interactions.size).toBe(0);
    });
  });

  describe('getPostTags', () => {
    test('should return empty tags for posts with no tags', async () => {
      const tags = await postService.getPostTags(testPostIds);
      
      expect(tags.size).toBe(testPostIds.length);
      
      for (const postId of testPostIds) {
        const postTags = tags.get(postId);
        expect(postTags).toBeDefined();
        expect(postTags).toEqual([]);
      }
    });

    test('should handle empty post IDs array', async () => {
      const tags = await postService.getPostTags([]);
      expect(tags.size).toBe(0);
    });
  });

  describe('enrichPosts', () => {
    test('should enrich posts with counts, interactions, and tags', async () => {
      const mockPosts = testPostIds.map((id, index) => ({
        id,
        title: `Test Post ${index}`,
        user: { id: testUserId, name: 'Test User', avatar_url: null },
      }));

      const enrichedPosts = await postService.enrichPosts(mockPosts, testUserId);
      
      expect(enrichedPosts).toHaveLength(mockPosts.length);
      
      for (const post of enrichedPosts) {
        expect(post).toHaveProperty('counts');
        expect(post).toHaveProperty('tags');
        expect(post).toHaveProperty('isLikedByMe');
        expect(post).toHaveProperty('isRepostedByMe');
        expect(post).toHaveProperty('isBookmarkedByMe');
        
        expect(post.counts.likes).toBe(0);
        expect(post.counts.comments).toBe(0);
        expect(post.counts.reposts).toBe(0);
        expect(post.counts.plays).toBe(0);
        
        expect(post.isLikedByMe).toBe(false);
        expect(post.isRepostedByMe).toBe(false);
        expect(post.isBookmarkedByMe).toBe(false);
        
        expect(Array.isArray(post.tags)).toBe(true);
      }
    });

    test('should handle empty posts array', async () => {
      const enrichedPosts = await postService.enrichPosts([]);
      expect(enrichedPosts).toEqual([]);
    });
  });

  describe('getPostsFeed', () => {
    test('should return paginated posts feed', async () => {
      const result = await postService.getPostsFeed(10);
      
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('nextCursor');
      expect(Array.isArray(result.items)).toBe(true);
      
      // Should include our test posts
      const testPostsInFeed = result.items.filter(post => 
        testPostIds.includes(post.id)
      );
      expect(testPostsInFeed.length).toBeGreaterThan(0);
      
      // Each post should have required properties
      for (const post of result.items) {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('user');
        expect(post).toHaveProperty('counts');
        expect(post).toHaveProperty('tags');
        expect(post.user).toHaveProperty('id');
        expect(post.user).toHaveProperty('name');
      }
    });

    test('should respect limit parameter', async () => {
      const result = await postService.getPostsFeed(2);
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    test('should handle cursor-based pagination', async () => {
      const firstPage = await postService.getPostsFeed(1);
      
      if (firstPage.nextCursor) {
        const secondPage = await postService.getPostsFeed(1, firstPage.nextCursor);
        
        // Second page should not contain the same items as first page
        const firstPageIds = firstPage.items.map(p => p.id);
        const secondPageIds = secondPage.items.map(p => p.id);
        
        for (const id of secondPageIds) {
          expect(firstPageIds).not.toContain(id);
        }
      }
    });
  });

  describe('Performance', () => {
    test('should efficiently handle large number of posts', async () => {
      // Create more test posts for performance testing
      const morePostIds = [];
      for (let i = 0; i < 50; i++) {
        const postId = `perf-test-post-${i}-${Date.now()}`;
        morePostIds.push(postId);
        
        await db
          .insertInto('posts')
          .values({
            id: postId,
            user_id: testUserId,
            title: `Performance Test Post ${i}`,
            caption: null,
            artist_name: null,
            duration_ms: null,
            bpm: null,
            key: null,
            visibility: 'public',
            ready: true,
            video_url: null,
            cover_url: null,
            youtube_id: null,
            source_type: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();
      }

      try {
        const startTime = Date.now();
        const counts = await postService.getPostCounts(morePostIds);
        const endTime = Date.now();
        
        expect(counts.size).toBe(morePostIds.length);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      } finally {
        // Clean up performance test data
        await db.deleteFrom('posts').where('id', 'in', morePostIds).execute();
      }
    });
  });
});
