import type { KyselyDatabase } from '@musio/shared';
import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import NodeCache from 'node-cache';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

export interface YouTubeSample {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string;
  video_url: string | null;
  audio_url: string;
  duration_ms: number;
  youtube_id: string;
  tags: string[];
}

export interface StreamUrls {
  audioUrl: string | null;
  videoUrl: string | null;
}

export interface YouTubeServiceConfig {
  apiKey: string;
  cacheTtlHours?: number;
  useYtDlp?: boolean;
  proxyStreams?: boolean;
}

export class YouTubeService {
  private youtube: any;
  private cache: NodeCache;
  private config: YouTubeServiceConfig;

  constructor(config: YouTubeServiceConfig) {
    this.config = {
      cacheTtlHours: 24,
      useYtDlp: false,
      proxyStreams: true,
      ...config,
    };

    this.youtube = google.youtube({ version: 'v3', auth: config.apiKey });
    this.cache = new NodeCache({ stdTTL: this.config.cacheTtlHours! * 3600 }); // TTL in seconds
  }

  /**
   * Fetch random samples similar to Samplette.io approach
   * Uses music-related search queries with genre/time/quality filters
   */
  async fetchRandomSamples(limit = 10, genre?: string): Promise<YouTubeSample[]> {
    const cacheKey = `youtube_samples_${limit}_${genre || 'all'}`;

    // Check cache first
    const cachedSamples = this.cache.get<YouTubeSample[]>(cacheKey);
    if (cachedSamples) {
      console.log(`[YouTubeService] Cache hit for ${cacheKey}`);
      return cachedSamples;
    }

    try {
      // Enhanced search queries with genre filtering and quality focus
      const searchQueries = this.getSearchQueries(genre);
      const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

      console.log(`[YouTubeService] Searching YouTube for: "${randomQuery}"`);

      // Search for videos with enhanced filters
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: randomQuery,
        type: 'video',
        maxResults: limit * 3, // Fetch more to filter for quality
        videoDuration: 'short', // 30s - 4min for samples
        videoDefinition: 'any',
        videoEmbeddable: 'true',
        order: 'relevance',
        regionCode: 'US', // For consistent results
      });

      const videoIds =
        searchResponse.data.items?.map((item: any) => item.id?.videoId).filter(Boolean) || [];

      if (videoIds.length === 0) {
        console.warn('[YouTubeService] No video IDs found in search results');
        return [];
      }

      // Get detailed video information
      const detailsResponse = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      const samples: YouTubeSample[] = [];

      for (const video of detailsResponse.data.items || []) {
        if (samples.length >= limit) break;

        const duration = this.parseDuration(video.contentDetails?.duration || '');
        const viewCount = parseInt(video.statistics?.viewCount || '0', 10);

        // Quality filters: duration (30s - 5min), minimum views for quality
        if (duration < 30000 || duration > 300000 || viewCount < 1000) {
          continue;
        }

        // Extract stream URLs
        const streamUrls = await this.extractStreamUrls(video.id);

        if (!streamUrls.audioUrl) {
          console.warn(`[YouTubeService] No audio stream found for video ${video.id}`);
          continue;
        }

        // Extract tags from video description and title
        const tags = this.extractTags(video.snippet?.title || '', video.snippet?.description || '');

        const sample: YouTubeSample = {
          id: randomUUID(),
          title: this.cleanTitle(video.snippet?.title || ''),
          artist_name: video.snippet?.channelTitle || 'Unknown Artist',
          cover_url: this.getBestThumbnail(video.snippet?.thumbnails),
          video_url: streamUrls.videoUrl,
          audio_url: streamUrls.audioUrl,
          duration_ms: duration,
          youtube_id: video.id,
          tags,
        };

        samples.push(sample);
      }

      console.log(`[YouTubeService] Successfully fetched ${samples.length} samples`);

      // Cache the results
      this.cache.set(cacheKey, samples);

      return samples;
    } catch (error) {
      console.error('[YouTubeService] Error fetching samples:', error);
      return [];
    }
  }

  /**
   * Save YouTube sample to database as a post
   */
  async saveYouTubeSampleAsPost(
    db: KyselyDatabase,
    sample: YouTubeSample,
    systemUserId: string,
  ): Promise<string> {
    const now = new Date().toISOString();

    // Check if this YouTube video already exists
    const existingPost = await db
      .selectFrom('posts')
      .select('id')
      .where('youtube_id', '=', sample.youtube_id)
      .executeTakeFirst();

    if (existingPost) {
      console.log(
        `[YouTubeService] YouTube video ${sample.youtube_id} already exists as post ${existingPost.id}`,
      );
      return existingPost.id;
    }

    await db
      .insertInto('posts')
      .values({
        id: sample.id,
        user_id: systemUserId, // System user for YouTube samples
        title: sample.title,
        caption: `From: ${sample.artist_name}`,
        duration_ms: sample.duration_ms,
        bpm: null,
        key: null,
        visibility: 'public',
        ready: true, // YouTube samples are immediately ready
        video_url: sample.video_url,
        cover_url: sample.cover_url,
        youtube_id: sample.youtube_id,
        source_type: 'youtube',
        artist_name: sample.artist_name,
        created_at: now,
        updated_at: now,
      })
      .execute();

    // Add media file entries
    const mediaFiles = [
      {
        id: randomUUID(),
        post_id: sample.id,
        url: sample.audio_url,
        type: 'preview',
        mime: 'audio/mpeg',
        size: null,
        duration_ms: sample.duration_ms,
        width: null,
        height: null,
      },
      {
        id: randomUUID(),
        post_id: sample.id,
        url: sample.cover_url,
        type: 'cover',
        mime: 'image/jpeg',
        size: null,
        duration_ms: null,
        width: null,
        height: null,
      },
    ];

    if (sample.video_url) {
      mediaFiles.push({
        id: randomUUID(),
        post_id: sample.id,
        url: sample.video_url,
        type: 'video',
        mime: 'video/mp4',
        size: null,
        duration_ms: sample.duration_ms,
        width: null,
        height: null,
      });
    }

    await db.insertInto('media_files').values(mediaFiles).execute();

    // Add tags
    for (const tagName of sample.tags) {
      // Find or create tag
      let tag = await db
        .selectFrom('tags')
        .select('id')
        .where('name', '=', tagName.toLowerCase())
        .executeTakeFirst();

      if (!tag) {
        const result = await db
          .insertInto('tags')
          .values({
            name: tagName.toLowerCase(),
            normalized: tagName.toLowerCase(),
          })
          .returning('id')
          .executeTakeFirst();
        tag = { id: result!.id };
      }

      // Link tag to post
      await db
        .insertInto('post_tags')
        .values({
          post_id: sample.id,
          tag_id: tag.id,
        })
        .execute();
    }

    console.log(`[YouTubeService] Saved YouTube sample ${sample.youtube_id} as post ${sample.id}`);
    return sample.id;
  }

  /**
   * Extract audio and video stream URLs from YouTube video
   * Uses yt-dlp if configured, otherwise returns proxy URLs
   */
  private async extractStreamUrls(videoId: string): Promise<StreamUrls> {
    if (this.config.useYtDlp) {
      return this.extractStreamUrlsWithYtDlp(videoId);
    }

    // Return proxy URLs that our backend will handle
    return {
      audioUrl: `/api/youtube/audio/${videoId}`,
      videoUrl: `/api/youtube/video/${videoId}`,
    };
  }

  /**
   * Extract stream URLs using yt-dlp
   * This requires yt-dlp to be installed on the system
   */
  private async extractStreamUrlsWithYtDlp(videoId: string): Promise<StreamUrls> {
    return new Promise((resolve) => {
      const ytDlpProcess = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        '--format',
        'best[height<=720]/best', // Prefer 720p or lower for bandwidth
        `https://www.youtube.com/watch?v=${videoId}`,
      ]);

      let output = '';
      let error = '';

      ytDlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytDlpProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytDlpProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[YouTubeService] yt-dlp failed for ${videoId}:`, error);
          // Fallback to proxy URLs
          resolve({
            audioUrl: `/api/youtube/audio/${videoId}`,
            videoUrl: `/api/youtube/video/${videoId}`,
          });
          return;
        }

        try {
          const videoInfo = JSON.parse(output);
          resolve({
            audioUrl: videoInfo.url || `/api/youtube/audio/${videoId}`,
            videoUrl: videoInfo.url || `/api/youtube/video/${videoId}`,
          });
        } catch (parseError) {
          console.warn(
            `[YouTubeService] Failed to parse yt-dlp output for ${videoId}:`,
            parseError,
          );
          resolve({
            audioUrl: `/api/youtube/audio/${videoId}`,
            videoUrl: `/api/youtube/video/${videoId}`,
          });
        }
      });
    });
  }

  /**
   * Get search queries based on genre preference
   */
  private getSearchQueries(genre?: string): string[] {
    const baseQueries = [
      'hip hop beat instrumental',
      'jazz sample loop',
      'funk drum break',
      'soul music sample',
      'vinyl record sample',
      'lo-fi hip hop beat',
      'boom bap instrumental',
      'trap beat sample',
      'r&b instrumental',
      'electronic music sample',
    ];

    if (!genre) return baseQueries;

    // Genre-specific queries
    const genreQueries: Record<string, string[]> = {
      'hip-hop': [
        'hip hop beat instrumental',
        'boom bap beat',
        'trap instrumental',
        'rap beat sample',
        'hip hop drum loop',
      ],
      jazz: [
        'jazz instrumental sample',
        'jazz piano loop',
        'jazz drum break',
        'smooth jazz sample',
        'jazz fusion instrumental',
      ],
      electronic: [
        'electronic music sample',
        'synth loop',
        'electronic beat',
        'ambient electronic',
        'techno sample',
      ],
      soul: [
        'soul music sample',
        'soul instrumental',
        'motown sample',
        'neo soul beat',
        'soul drum break',
      ],
    };

    return genreQueries[genre] || baseQueries;
  }

  /**
   * Parse YouTube duration format (PT4M13S) to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  /**
   * Clean video title by removing common YouTube spam patterns
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]/g, '') // Remove bracketed text
      .replace(/\(.*?\)/g, '') // Remove parenthetical text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Get the best available thumbnail
   */
  private getBestThumbnail(thumbnails: any): string {
    if (!thumbnails) return '';

    return (
      thumbnails.maxres?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      ''
    );
  }

  /**
   * Extract relevant tags from title and description
   */
  private extractTags(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const musicTags = [
      'hip hop',
      'jazz',
      'funk',
      'soul',
      'r&b',
      'electronic',
      'trap',
      'boom bap',
      'lo-fi',
      'instrumental',
      'beat',
      'sample',
      'loop',
      'drum',
      'piano',
      'guitar',
      'bass',
      'synth',
      'vocals',
      'remix',
      'original',
      'freestyle',
      'chill',
      'smooth',
    ];

    return musicTags.filter((tag) => text.includes(tag)).slice(0, 5); // Limit to 5 tags
  }

  /**
   * Clear cache manually if needed
   */
  clearCache(): void {
    this.cache.flushAll();
    console.log('[YouTubeService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
    };
  }
}
