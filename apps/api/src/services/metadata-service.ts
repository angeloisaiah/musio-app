import NodeCache from 'node-cache';

interface TrackQuery {
  artist?: string;
  title?: string;
  album?: string;
}

interface DiscogsSearchResult {
  results: Array<{
    id: number;
    title: string;
    year?: number;
    genre?: string[];
    style?: string[];
    label?: string[];
    country?: string;
    format?: string[];
    thumb?: string;
    uri?: string;
    master_url?: string;
    resource_url?: string;
  }>;
}

interface SpotifySearchResult {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string; id: string }>;
      album: {
        name: string;
        images?: Array<{ url: string; height: number; width: number }>;
      };
      duration_ms: number;
      popularity: number;
      external_urls: { spotify: string };
      explicit: boolean;
    }>;
    total: number;
    offset: number;
    limit: number;
  };
}

interface SpotifyAudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  speechiness: number;
  tempo: number;
  valence: number;
  key: number;
  mode: number;
  time_signature: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class MetadataService {
  private cache: NodeCache;
  private spotifyToken: string | null = null;
  private spotifyTokenExpiry: number = 0;
  private rateLimitCache: Map<string, number> = new Map();

  constructor() {
    // Cache metadata for 1 hour, popular genres for 24 hours
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 600, // Check for expired keys every 10 minutes
      maxKeys: 10000, // Limit cache size
    });
  }

  private async checkRateLimit(service: 'discogs' | 'spotify'): Promise<void> {
    const key = `ratelimit_${service}`;
    const lastCall = this.rateLimitCache.get(key) || 0;
    const now = Date.now();
    const minInterval = service === 'discogs' ? 1000 : 100; // Discogs: 1 req/sec, Spotify: 10 req/sec

    if (now - lastCall < minInterval) {
      const waitTime = minInterval - (now - lastCall);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimitCache.set(key, Date.now());
  }

  private async getSpotifyToken(): Promise<string> {
    if (this.spotifyToken && Date.now() < this.spotifyTokenExpiry) {
      return this.spotifyToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    await this.checkRateLimit('spotify');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify token request failed: ${response.status}`);
    }

    const data: SpotifyTokenResponse = await response.json();
    this.spotifyToken = data.access_token;
    this.spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute early

    return this.spotifyToken;
  }

  private async searchDiscogs(query: TrackQuery): Promise<any> {
    const discogsToken = process.env.DISCOGS_TOKEN;
    if (!discogsToken) {
      console.warn('Discogs token not configured, skipping Discogs search');
      return null;
    }

    // Build search query
    const searchTerms: string[] = [];
    if (query.artist) searchTerms.push(`artist:"${query.artist}"`);
    if (query.title) searchTerms.push(`title:"${query.title}"`);
    if (query.album) searchTerms.push(`release_title:"${query.album}"`);

    if (searchTerms.length === 0) return null;

    const searchQuery = searchTerms.join(' AND ');
    const cacheKey = `discogs:${Buffer.from(searchQuery).toString('base64')}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    await this.checkRateLimit('discogs');

    try {
      const url = new URL('https://api.discogs.com/database/search');
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('type', 'release');
      url.searchParams.set('per_page', '5');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Discogs token=${discogsToken}`,
          'User-Agent': 'MusioApp/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Discogs rate limit exceeded');
        }
        throw new Error(`Discogs API error: ${response.status}`);
      }

      const data: DiscogsSearchResult = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0]; // Take the first result
        const metadata = {
          title: result.title,
          year: result.year,
          genre: result.genre,
          style: result.style,
          label: result.label?.[0], // Take first label
          country: result.country,
          format: result.format,
          thumb: result.thumb,
          uri: result.uri,
          master_url: result.master_url,
          resource_url: result.resource_url,
        };

        // Cache for 1 hour
        this.cache.set(cacheKey, metadata, 3600);
        return metadata;
      }

      return null;
    } catch (error) {
      console.error('Discogs search error:', error);
      return null;
    }
  }

  private async searchSpotifyTrack(query: TrackQuery): Promise<any> {
    try {
      const token = await this.getSpotifyToken();

      // Build search query
      const searchTerms: string[] = [];
      if (query.artist) searchTerms.push(`artist:"${query.artist}"`);
      if (query.title) searchTerms.push(`track:"${query.title}"`);
      if (query.album) searchTerms.push(`album:"${query.album}"`);

      if (searchTerms.length === 0) return null;

      const searchQuery = searchTerms.join(' AND ');
      const cacheKey = `spotify_track:${Buffer.from(searchQuery).toString('base64')}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      await this.checkRateLimit('spotify');

      const url = new URL('https://api.spotify.com/v1/search');
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('type', 'track');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Spotify rate limit exceeded');
        }
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data: SpotifySearchResult = await response.json();

      if (data.tracks.items && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];

        // Get audio features for the track
        const audioFeatures = await this.getSpotifyAudioFeatures(track.id);

        const metadata = {
          name: track.name,
          artists: track.artists,
          album: track.album,
          popularity: track.popularity,
          duration_ms: track.duration_ms,
          explicit: track.explicit,
          external_urls: track.external_urls,
          audio_features: audioFeatures,
        };

        // Cache for 1 hour
        this.cache.set(cacheKey, metadata, 3600);
        return metadata;
      }

      return null;
    } catch (error) {
      console.error('Spotify track search error:', error);
      return null;
    }
  }

  private async getSpotifyAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null> {
    try {
      const token = await this.getSpotifyToken();
      const cacheKey = `spotify_features:${trackId}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as SpotifyAudioFeatures;
      }

      await this.checkRateLimit('spotify');

      const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch audio features for track ${trackId}: ${response.status}`);
        return null;
      }

      const features: SpotifyAudioFeatures = await response.json();

      // Cache for 24 hours (audio features don't change)
      this.cache.set(cacheKey, features, 86400);
      return features;
    } catch (error) {
      console.error('Spotify audio features error:', error);
      return null;
    }
  }

  public async getMetadata(query: TrackQuery): Promise<any> {
    const cacheKey = `metadata:${JSON.stringify(query)}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Search both services concurrently
    const [discogsResult, spotifyResult] = await Promise.allSettled([
      this.searchDiscogs(query),
      this.searchSpotifyTrack(query),
    ]);

    const metadata: any = {
      cached: false,
      cached_at: new Date().toISOString(),
    };

    if (discogsResult.status === 'fulfilled' && discogsResult.value) {
      metadata.discogs = discogsResult.value;
    }

    if (spotifyResult.status === 'fulfilled' && spotifyResult.value) {
      metadata.spotify = spotifyResult.value;
    }

    // If we found any metadata, cache it
    if (metadata.discogs || metadata.spotify) {
      this.cache.set(cacheKey, metadata, 3600); // Cache for 1 hour
    }

    return metadata;
  }

  public async getPopularGenres(
    limit: number = 20,
  ): Promise<Array<{ name: string; count: number }>> {
    const cacheKey = 'popular_genres';

    // Check cache first (24 hour cache for genres)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return (cached as Array<{ name: string; count: number }>).slice(0, limit);
    }

    // Hardcoded popular genres with estimated counts
    // In a real implementation, this could come from analyzing your database or external APIs
    const genres = [
      { name: 'Electronic', count: 15420 },
      { name: 'Hip Hop', count: 12350 },
      { name: 'House', count: 11200 },
      { name: 'Techno', count: 9800 },
      { name: 'Pop', count: 8900 },
      { name: 'Rock', count: 8200 },
      { name: 'Funk / Soul', count: 7100 },
      { name: 'Jazz', count: 6800 },
      { name: 'Reggae', count: 5900 },
      { name: 'Latin', count: 5400 },
      { name: 'Folk, World, & Country', count: 4900 },
      { name: 'Classical', count: 4200 },
      { name: 'Blues', count: 3800 },
      { name: 'Stage & Screen', count: 3200 },
      { name: 'Brass & Military', count: 2100 },
      { name: "Children's", count: 1800 },
      { name: 'Non-Music', count: 1200 },
    ];

    // Cache for 24 hours
    this.cache.set(cacheKey, genres, 86400);

    return genres.slice(0, limit);
  }

  public async searchSpotify(
    query: string,
    type: 'track' | 'artist' | 'album' = 'track',
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    try {
      const token = await this.getSpotifyToken();
      const cacheKey = `spotify_search:${query}:${type}:${limit}:${offset}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      await this.checkRateLimit('spotify');

      const url = new URL('https://api.spotify.com/v1/search');
      url.searchParams.set('q', query);
      url.searchParams.set('type', type);
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Spotify rate limit exceeded');
        }
        throw new Error(`Spotify search API error: ${response.status}`);
      }

      const data: SpotifySearchResult = await response.json();

      const result = {
        tracks: data.tracks.items,
        total: data.tracks.total,
        offset: data.tracks.offset,
        limit: data.tracks.limit,
      };

      // Cache for 30 minutes
      this.cache.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      console.error('Spotify search error:', error);
      throw error;
    }
  }

  public getCacheStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats(),
    };
  }
}
