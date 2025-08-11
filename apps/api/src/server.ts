import Fastify from 'fastify';
import { Type } from '@sinclair/typebox';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createDb } from './db/connection';
import type { KyselyDatabase } from '@musio/shared';
import jwtPlugin from '@fastify/jwt';
import { errorHandler } from './middleware/error-handler';
import { addSecurityHeaders } from './middleware/validation';
import { generalRateLimit } from './middleware/rate-limiter';
import { authRoutes } from './routes/auth';
import { postsRoutes } from './routes/posts';
import { feedRoutes } from './routes/feed';
import { searchRoutes } from './routes/search';
import { metadataRoutes } from './routes/metadata';

// Import types for proper typing
import './types/auth';
import './types/fastify';

export function buildServer() {
  const app = Fastify({ 
    logger: process.env.NODE_ENV === 'development',
    trustProxy: true,
    bodyLimit: 104857600, // 100MB
  });

  // Security headers
  app.register(helmet, {
    contentSecurityPolicy: false, // We'll handle this manually
  });

  // CORS
  app.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://musio.app'],
    credentials: true,
  });

  // Rate limiting
  app.addHook('preHandler', generalRateLimit);

  // Security headers
  app.addHook('onRequest', addSecurityHeaders);

  // Error handling
  app.setErrorHandler(errorHandler);

  // Database connection (optional in production)
  let db: KyselyDatabase | null = null;
  try {
    db = createDb();
    app.decorate('db', db);
    app.addHook('onClose', async (instance) => {
      if ((instance as any).db) {
        await (instance as any).db.destroy();
      }
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.warn('⚠️  Database connection failed:', error);
    console.log('📝 API will run without database');
    // Create a mock db object for routes that need it
    app.decorate('db', {} as any);
  }

  // JWT authentication
  app.register(jwtPlugin, { 
    secret: process.env.JWT_SECRET || 'supersecretjwt',
    sign: {
      expiresIn: '7d',
    },
  });

    // Root endpoint
  app.get('/', {
    schema: {
      response: {
        200: Type.Object({
          name: Type.String(),
          version: Type.String(),
          status: Type.String(),
          endpoints: Type.Array(Type.String()),
        }),
      },
    },
  }, async () => {
    return {
      name: 'Mus.io API',
      version: process.env.APP_VERSION || '0.0.0',
      status: 'running',
      endpoints: [
        'GET /health',
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'GET /api/posts',
        'POST /api/posts',
        'GET /api/feed',
        'GET /api/search',
        'GET /api/metadata',
      ],
    };
  });

  // Health check endpoint
  app.get('/health', {
    schema: {
      response: {
        200: Type.Object({
          status: Type.Literal('ok'),
          version: Type.String(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async () => {
    return {
      status: 'ok' as const,
      version: process.env.APP_VERSION || '0.0.0',
      timestamp: new Date().toISOString(),
    };
  });

  // Register route modules
  app.register(authRoutes);
  app.register(postsRoutes);
  app.register(feedRoutes);
  app.register(searchRoutes);
  app.register(metadataRoutes);

  return app;
}
