import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetadataService } from '../../apps/api/src/services/metadata-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('MetadataService', () => {
  let metadataService: MetadataService;
  const mockFetch = fetch as any;

  beforeEach(() => {
    metadataService = new MetadataService();
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
    process.env.DISCOGS_TOKEN = 'test_discogs_token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMetadata', () => {
    it('should return combined metadata from both services', async () => {
      // Mock Spotify token response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test_token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        })
        // Mock Discogs search response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              id: 123,
              title: 'Test Artist - Test Track',
              year: 2023,
              genre: ['Electronic'],
              style: ['House'],
              label: ['Test Label'],
              country: 'US',
              format: ['Vinyl'],
              thumb: 'https://example.com/thumb.jpg',
              uri: '/releases/123',
              resource_url: 'https://api.discogs.com/releases/123',
            }],
          }),
        })
        // Mock Spotify search response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            tracks: {
              items: [{
                id: 'spotify_track_id',
                name: 'Test Track',
                artists: [{ name: 'Test Artist', id: 'artist_id' }],
                album: {
                  name: 'Test Album',
                  images: [{ url: 'https://example.com/album.jpg', height: 640, width: 640 }],
                },
                popularity: 75,
                duration_ms: 180000,
                explicit: false,
                external_urls: { spotify: 'https://open.spotify.com/track/spotify_track_id' },
              }],
            },
          }),
        })
        // Mock Spotify audio features response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            acousticness: 0.2,
            danceability: 0.8,
            energy: 0.9,
            instrumentalness: 0.1,
            liveness: 0.15,
            loudness: -5.5,
            speechiness: 0.05,
            tempo: 128.0,
            valence: 0.7,
            key: 1,
            mode: 1,
            time_signature: 4,
          }),
        });

      const result = await metadataService.getMetadata({
        artist: 'Test Artist',
        title: 'Test Track',
      });

      expect(result).toMatchObject({
        discogs: expect.objectContaining({
          title: 'Test Artist - Test Track',
          year: 2023,
          genre: ['Electronic'],
          style: ['House'],
        }),
        spotify: expect.objectContaining({
          name: 'Test Track',
          artists: [{ name: 'Test Artist', id: 'artist_id' }],
          popularity: 75,
          audio_features: expect.objectContaining({
            tempo: 128.0,
            key: 1,
            danceability: 0.8,
          }),
        }),
        cached: false,
      });
    });

    it('should handle rate limiting gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Spotify rate limit exceeded'));

      const result = await metadataService.getMetadata({
        artist: 'Test Artist',
        title: 'Test Track',
      });

      // Should return partial results (Discogs only) without throwing
      expect(result).toBeDefined();
      expect(result.spotify).toBeUndefined();
    });

    it('should return cached results when available', async () => {
      const query = { artist: 'Test Artist', title: 'Test Track' };
      
      // First call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tracks: { items: [] } }),
        });

      await metadataService.getMetadata(query);

      // Second call should use cache
      const cachedResult = await metadataService.getMetadata(query);
      
      expect(cachedResult.cached).toBe(true);
      // Should not make additional API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('searchSpotify', () => {
    it('should search Spotify tracks successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test_token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            tracks: {
              items: [
                {
                  id: '1',
                  name: 'Track 1',
                  artists: [{ name: 'Artist 1', id: 'artist_1' }],
                  album: { name: 'Album 1', images: [] },
                  duration_ms: 180000,
                  popularity: 80,
                  external_urls: { spotify: 'https://open.spotify.com/track/1' },
                },
              ],
              total: 1,
              offset: 0,
              limit: 20,
            },
          }),
        });

      const result = await metadataService.searchSpotify('test query', 'track', 20, 0);

      expect(result).toMatchObject({
        tracks: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Track 1',
            popularity: 80,
          }),
        ]),
        total: 1,
        offset: 0,
        limit: 20,
      });
    });

    it('should handle Spotify API errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
        });

      await expect(metadataService.searchSpotify('test query')).rejects.toThrow(
        'Spotify rate limit exceeded'
      );
    });
  });

  describe('getPopularGenres', () => {
    it('should return popular genres with counts', async () => {
      const result = await metadataService.getPopularGenres(5);

      expect(result).toHaveLength(5);
      expect(result[0]).toMatchObject({
        name: expect.any(String),
        count: expect.any(Number),
      });
      
      // Should be sorted by count (descending)
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
    });

    it('should respect the limit parameter', async () => {
      const result = await metadataService.getPopularGenres(3);
      expect(result).toHaveLength(3);
    });

    it('should cache results', async () => {
      const result1 = await metadataService.getPopularGenres(5);
      const result2 = await metadataService.getPopularGenres(5);

      expect(result1).toEqual(result2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = metadataService.getCacheStats();

      expect(stats).toMatchObject({
        keys: expect.any(Number),
        stats: expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          keys: expect.any(Number),
        }),
      });
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits between calls', async () => {
      const startTime = Date.now();

      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      await metadataService.getMetadata({ artist: 'Artist 1', title: 'Track 1' });
      
      // Second call should be rate limited
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      await metadataService.getMetadata({ artist: 'Artist 2', title: 'Track 2' });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1 second due to Discogs rate limiting
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await metadataService.getMetadata({
        artist: 'Test Artist',
        title: 'Test Track',
      });

      // Should return empty metadata without throwing
      expect(result).toMatchObject({
        cached: false,
        cached_at: expect.any(String),
      });
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const result = await metadataService.getMetadata({
        artist: 'Test Artist',
        title: 'Test Track',
      });

      expect(result).toBeDefined();
      expect(result.discogs).toBeUndefined();
      expect(result.spotify).toBeUndefined();
    });
  });
});
