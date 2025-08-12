import type { KyselyDatabase, PostWithCounts } from '@musio/shared';

interface PostCounts {
  likes: number;
  comments: number;
  reposts: number;
  plays: number;
}

interface UserInteractions {
  isLikedByMe: boolean;
  isRepostedByMe: boolean;
  isBookmarkedByMe: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export class PostService {
  constructor(private db: KyselyDatabase) {}

  /**
   * Enrich posts with counts, interactions, and tags
   */
  async enrichPosts(posts: any[], userId?: string): Promise<PostWithCounts[]> {
    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);

    // Get all counts and interactions
    const countsAndInteractions = await this.getPostCountsAndUserActions(postIds, userId);

    // Get all tags for these posts
    const postTags = await this.db
      .selectFrom('post_tags as pt')
      .innerJoin('tags as t', 't.id', 'pt.tag_id')
      .select(['pt.post_id', 't.name'])
      .where('pt.post_id', 'in', postIds)
      .execute();

    // Group tags by post
    const tagsByPost = postTags.reduce(
      (acc, { post_id, name }) => {
        if (!acc[post_id]) acc[post_id] = [];
        acc[post_id].push(name);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return posts.map((post) => {
      const interactions = countsAndInteractions.get(post.id) || {
        likes: 0,
        comments: 0,
        reposts: 0,
        plays: 0,
        isLikedByMe: false,
        isRepostedByMe: false,
        isBookmarkedByMe: false,
      };

      return {
        ...post,
        counts: {
          likes: interactions.likes,
          comments: interactions.comments,
          reposts: interactions.reposts,
          plays: interactions.plays,
        },
        tags: tagsByPost[post.id] || [],
        isLikedByMe: interactions.isLikedByMe,
        isRepostedByMe: interactions.isRepostedByMe,
        isBookmarkedByMe: interactions.isBookmarkedByMe,
        // Add missing required fields with defaults
        updated_at: post.updated_at || post.created_at,
        ready: post.ready ?? true,
        visibility: post.visibility || 'public',
        bpm: post.bpm,
        key: post.key,
        youtube_id: post.youtube_id,
        source_type: post.source_type || 'user',
      };
    });
  }

  /**
   * Get post counts and user interactions in a single optimized query
   */
  async getPostCountsAndUserActions(
    postIds: string[],
    userId?: string,
  ): Promise<Map<string, PostCounts & UserInteractions>> {
    if (postIds.length === 0) return new Map();

    const [likeCounts, commentCounts, repostCounts, playCounts, userActions] = await Promise.all([
      // Get like counts
      this.db
        .selectFrom('likes')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get comment counts
      this.db
        .selectFrom('comments')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get repost counts
      this.db
        .selectFrom('reposts')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get play counts
      this.db
        .selectFrom('analytics')
        .select(['post_id', this.db.fn.sum('plays').as('total')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get user interactions if userId provided
      userId
        ? Promise.all([
            this.db
              .selectFrom('likes')
              .select('post_id')
              .where('user_id', '=', userId)
              .where('post_id', 'in', postIds)
              .execute(),
            this.db
              .selectFrom('reposts')
              .select('post_id')
              .where('user_id', '=', userId)
              .where('post_id', 'in', postIds)
              .execute(),
            this.db
              .selectFrom('bookmarks')
              .select('post_id')
              .where('user_id', '=', userId)
              .where('post_id', 'in', postIds)
              .execute(),
          ])
        : Promise.resolve([[], [], []]),
    ]);

    // Create maps for quick lookup
    const likeCountMap = new Map(likeCounts.map((r) => [r.post_id, Number(r.count)]));
    const commentCountMap = new Map(commentCounts.map((r) => [r.post_id, Number(r.count)]));
    const repostCountMap = new Map(repostCounts.map((r) => [r.post_id, Number(r.count)]));
    const playCountMap = new Map(playCounts.map((r) => [r.post_id, Number(r.total || 0)]));

    // User interactions
    const [userLikes, userReposts, userBookmarks] = userActions;
    const likedPostIds = new Set(userLikes.map((r) => r.post_id));
    const repostedPostIds = new Set(userReposts.map((r) => r.post_id));
    const bookmarkedPostIds = new Set(userBookmarks.map((r) => r.post_id));

    // Combine all data
    const result = new Map();
    for (const postId of postIds) {
      result.set(postId, {
        likes: likeCountMap.get(postId) || 0,
        comments: commentCountMap.get(postId) || 0,
        reposts: repostCountMap.get(postId) || 0,
        plays: playCountMap.get(postId) || 0,
        isLikedByMe: likedPostIds.has(postId),
        isRepostedByMe: repostedPostIds.has(postId),
        isBookmarkedByMe: bookmarkedPostIds.has(postId),
      });
    }

    return result;
  }

  /**
   * Efficiently get post counts for multiple posts in a single query
   */
  async getPostCounts(postIds: string[]): Promise<Map<string, PostCounts>> {
    if (postIds.length === 0) return new Map();

    const [likeCounts, commentCounts, repostCounts, playCounts] = await Promise.all([
      // Get like counts
      this.db
        .selectFrom('likes')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get comment counts
      this.db
        .selectFrom('comments')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get repost counts
      this.db
        .selectFrom('reposts')
        .select(['post_id', this.db.fn.count('id').as('count')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),

      // Get play counts
      this.db
        .selectFrom('analytics')
        .select(['post_id', this.db.fn.sum('plays').as('total')])
        .where('post_id', 'in', postIds)
        .groupBy('post_id')
        .execute(),
    ]);

    const countsMap = new Map<string, PostCounts>();

    // Initialize all posts with zero counts
    postIds.forEach((id) => {
      countsMap.set(id, { likes: 0, comments: 0, reposts: 0, plays: 0 });
    });

    // Update with actual counts
    likeCounts.forEach(({ post_id, count }) => {
      const existing = countsMap.get(post_id);
      if (existing) {
        existing.likes = Number(count);
      }
    });

    commentCounts.forEach(({ post_id, count }) => {
      const existing = countsMap.get(post_id);
      if (existing) {
        existing.comments = Number(count);
      }
    });

    repostCounts.forEach(({ post_id, count }) => {
      const existing = countsMap.get(post_id);
      if (existing) {
        existing.reposts = Number(count);
      }
    });

    playCounts.forEach(({ post_id, total }) => {
      const existing = countsMap.get(post_id);
      if (existing) {
        existing.plays = Number(total || 0);
      }
    });

    return countsMap;
  }

  /**
   * Efficiently get user interactions for multiple posts
   */
  async getUserInteractions(
    postIds: string[],
    userId: string,
  ): Promise<Map<string, UserInteractions>> {
    if (postIds.length === 0) return new Map();

    const [likes, reposts, bookmarks] = await Promise.all([
      this.db
        .selectFrom('likes')
        .select('post_id')
        .where('post_id', 'in', postIds)
        .where('user_id', '=', userId)
        .execute(),

      this.db
        .selectFrom('reposts')
        .select('post_id')
        .where('post_id', 'in', postIds)
        .where('user_id', '=', userId)
        .execute(),

      this.db
        .selectFrom('bookmarks')
        .select('post_id')
        .where('post_id', 'in', postIds)
        .where('user_id', '=', userId)
        .execute(),
    ]);

    const interactionsMap = new Map<string, UserInteractions>();

    // Initialize all posts with false interactions
    postIds.forEach((id) => {
      interactionsMap.set(id, {
        isLikedByMe: false,
        isRepostedByMe: false,
        isBookmarkedByMe: false,
      });
    });

    // Update with actual interactions
    likes.forEach(({ post_id }) => {
      const existing = interactionsMap.get(post_id);
      if (existing) {
        existing.isLikedByMe = true;
      }
    });

    reposts.forEach(({ post_id }) => {
      const existing = interactionsMap.get(post_id);
      if (existing) {
        existing.isRepostedByMe = true;
      }
    });

    bookmarks.forEach(({ post_id }) => {
      const existing = interactionsMap.get(post_id);
      if (existing) {
        existing.isBookmarkedByMe = true;
      }
    });

    return interactionsMap;
  }

  /**
   * Efficiently get tags for multiple posts
   */
  async getPostTags(postIds: string[]): Promise<Map<string, string[]>> {
    if (postIds.length === 0) return new Map();

    const postTags = await this.db
      .selectFrom('post_tags as pt')
      .innerJoin('tags as t', 't.id', 'pt.tag_id')
      .select(['pt.post_id', 't.name'])
      .where('pt.post_id', 'in', postIds)
      .execute();

    const tagsMap = new Map<string, string[]>();

    // Initialize all posts with empty tag arrays
    postIds.forEach((id) => {
      tagsMap.set(id, []);
    });

    // Group tags by post
    postTags.forEach(({ post_id, name }) => {
      const existing = tagsMap.get(post_id);
      if (existing) {
        existing.push(name);
      }
    });

    return tagsMap;
  }

  /**
   * Get posts with all related data efficiently
   */
  async getPostsFeed(limit: number, cursor?: string, userId?: string, filter?: string) {
    let query = this.db
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
        'p.artist_name',
        'p.duration_ms',
        'p.bpm',
        'p.key',
        'p.video_url',
        'p.cover_url',
        'p.created_at',
        'u.id as user_id',
        'u.name as user_name',
        'u.avatar_url as user_avatar_url',
        'preview.url as preview_url',
        'waveform.url as waveform_url',
      ])
      .where('p.ready', '=', true)
      .where('p.visibility', '=', 'public');

    // Apply filter logic
    if (filter === 'following' && userId) {
      query = query
        .innerJoin('follows', 'follows.followee_id', 'p.user_id')
        .where('follows.follower_id', '=', userId);
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

    const posts = await query.execute();

    // Transform to include user object
    const transformedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      caption: post.caption,
      artist_name: post.artist_name,
      duration_ms: post.duration_ms,
      bpm: post.bpm,
      key: post.key,
      video_url: post.video_url,
      cover_url: post.cover_url,
      created_at: post.created_at,
      preview_url: post.preview_url,
      waveform_url: post.waveform_url,
      user: {
        id: post.user_id,
        name: post.user_name,
        avatar_url: post.user_avatar_url,
      },
    }));

    // Enrich with counts, interactions, and tags
    const enrichedPosts = await this.enrichPosts(transformedPosts, userId);

    const nextCursor =
      posts.length === limit && posts.length > 0
        ? `${posts[posts.length - 1].created_at}|${posts[posts.length - 1].id}`
        : null;

    return {
      items: enrichedPosts,
      nextCursor,
    };
  }
}
