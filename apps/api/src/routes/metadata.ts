import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { MetadataService } from '../services/metadata-service';

const MetadataQuerySchema = Type.Object({
  artist: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  album: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
});

const MetadataResponseSchema = Type.Object({
  discogs: Type.Optional(Type.Object({
    title: Type.Optional(Type.String()),
    artist: Type.Optional(Type.String()),
    label: Type.Optional(Type.String()),
    year: Type.Optional(Type.Number()),
    genre: Type.Optional(Type.Array(Type.String())),
    style: Type.Optional(Type.Array(Type.String())),
    country: Type.Optional(Type.String()),
    format: Type.Optional(Type.Array(Type.String())),
    thumb: Type.Optional(Type.String()),
    uri: Type.Optional(Type.String()),
    master_url: Type.Optional(Type.String()),
    resource_url: Type.Optional(Type.String()),
  })),
  spotify: Type.Optional(Type.Object({
    name: Type.Optional(Type.String()),
    artists: Type.Optional(Type.Array(Type.Object({
      name: Type.String(),
      id: Type.String(),
    }))),
    album: Type.Optional(Type.Object({
      name: Type.String(),
      images: Type.Optional(Type.Array(Type.Object({
        url: Type.String(),
        height: Type.Number(),
        width: Type.Number(),
      }))),
    })),
    popularity: Type.Optional(Type.Number()),
    duration_ms: Type.Optional(Type.Number()),
    explicit: Type.Optional(Type.Boolean()),
    external_urls: Type.Optional(Type.Object({
      spotify: Type.String(),
    })),
    audio_features: Type.Optional(Type.Object({
      acousticness: Type.Optional(Type.Number()),
      danceability: Type.Optional(Type.Number()),
      energy: Type.Optional(Type.Number()),
      instrumentalness: Type.Optional(Type.Number()),
      liveness: Type.Optional(Type.Number()),
      loudness: Type.Optional(Type.Number()),
      speechiness: Type.Optional(Type.Number()),
      tempo: Type.Optional(Type.Number()),
      valence: Type.Optional(Type.Number()),
      key: Type.Optional(Type.Number()),
      mode: Type.Optional(Type.Number()),
      time_signature: Type.Optional(Type.Number()),
    })),
  })),
  cached: Type.Optional(Type.Boolean()),
  cached_at: Type.Optional(Type.String()),
});

export async function metadataRoutes(fastify: FastifyInstance) {
  const metadataService = new MetadataService();

  // Get metadata for a track
  fastify.get('/api/metadata', {
    schema: {
      querystring: MetadataQuerySchema,
      response: {
        200: MetadataResponseSchema,
        400: Type.Object({
          error: Type.String(),
        }),
        429: Type.Object({
          error: Type.String(),
          retry_after: Type.Optional(Type.Number()),
        }),
        500: Type.Object({
          error: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { artist, title, album } = request.query as any;

    if (!artist && !title) {
      return reply.code(400).send({ 
        error: 'At least one of artist or title must be provided' 
      });
    }

    try {
      const metadata = await metadataService.getMetadata({
        artist,
        title,
        album,
      });

      return metadata;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return reply.code(429).send({ 
            error: 'Rate limit exceeded. Please try again later.',
            retry_after: 60,
          });
        }
        
        if (error.message.includes('not found')) {
          return reply.code(404).send({ 
            error: 'No metadata found for the provided track information' 
          });
        }
      }

      console.error('Metadata API error:', error);
      return reply.code(500).send({ 
        error: 'Failed to fetch metadata' 
      });
    }
  });

  // Get popular genres from Discogs
  fastify.get('/api/metadata/genres', {
    schema: {
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
      }),
      response: {
        200: Type.Object({
          genres: Type.Array(Type.Object({
            name: Type.String(),
            count: Type.Number(),
          })),
        }),
      },
    },
  }, async (request) => {
    const { limit = 20 } = request.query as any;

    try {
      const genres = await metadataService.getPopularGenres(limit);
      return { genres };
    } catch (error) {
      console.error('Failed to fetch popular genres:', error);
      return { genres: [] };
    }
  });

  // Search tracks via Spotify
  fastify.get('/api/metadata/search', {
    schema: {
      querystring: Type.Object({
        q: Type.String({ minLength: 1, maxLength: 200 }),
        type: Type.Optional(Type.Union([
          Type.Literal('track'),
          Type.Literal('artist'),
          Type.Literal('album'),
        ])),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
        offset: Type.Optional(Type.Number({ minimum: 0 })),
      }),
      response: {
        200: Type.Object({
          tracks: Type.Optional(Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            artists: Type.Array(Type.Object({
              name: Type.String(),
              id: Type.String(),
            })),
            album: Type.Object({
              name: Type.String(),
              images: Type.Optional(Type.Array(Type.Object({
                url: Type.String(),
                height: Type.Number(),
                width: Type.Number(),
              }))),
            }),
            duration_ms: Type.Number(),
            popularity: Type.Number(),
            external_urls: Type.Object({
              spotify: Type.String(),
            }),
          }))),
          total: Type.Number(),
          offset: Type.Number(),
          limit: Type.Number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { q, type = 'track', limit = 20, offset = 0 } = request.query as any;

    try {
      const results = await metadataService.searchSpotify(q, type, limit, offset);
      return results;
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate limit')) {
        return reply.code(429).send({ 
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: 60,
        });
      }

      console.error('Spotify search error:', error);
      return reply.code(500).send({ 
        error: 'Failed to search tracks' 
      });
    }
  });
}
