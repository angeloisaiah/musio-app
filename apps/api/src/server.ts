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
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'https://musio.app'];

  app.register(cors, {
    origin: corsOrigins,
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
    // Try to create database connection
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Production mode - connecting to Railway PostgreSQL...');
      console.log('🔧 Environment check:', {
        DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
        DB_HOST: process.env.DB_HOST ? '✅ Set' : '❌ Missing',
        DB_PORT: process.env.DB_PORT ? '✅ Set' : '❌ Missing',
        DB_NAME: process.env.DB_NAME ? '✅ Set' : '❌ Missing',
        DB_USER: process.env.DB_USER ? '✅ Set' : '❌ Missing',
        DB_PASSWORD: process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing',
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
      });

      db = createDb();
      app.decorate('db', db);
      app.addHook('onClose', async (instance) => {
        if ((instance as any).db) {
          await (instance as any).db.destroy();
        }
      });
      console.log('✅ Database connected successfully');
    } else {
      console.log('🔄 Development mode - connecting to local database...');
      db = createDb();
      app.decorate('db', db);
      app.addHook('onClose', async (instance) => {
        if ((instance as any).db) {
          await (instance as any).db.destroy();
        }
      });
      console.log('✅ Local database connected successfully');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('📝 API will run without database connection');
    console.log('💡 Check your Railway environment variables:');
    console.log('   - DATABASE_URL should be set by Railway');
    console.log('   - Or set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');

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
  app.get(
    '/',
    {
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
    },
    async () => {
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
    },
  );

  // Health check endpoint
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.Literal('ok'),
            version: Type.String(),
            timestamp: Type.String(),
            database: Type.Object({
              connected: Type.Boolean(),
              error: Type.Optional(Type.String()),
            }),
            environment: Type.String(),
          }),
        },
      },
    },
    async () => {
      let dbStatus = { connected: false, error: undefined as string | undefined };

      try {
        if (app.db) {
          // Test database connection
          await app.db.selectFrom('posts').select('id').limit(1).execute();
          dbStatus.connected = true;
        }
      } catch (error) {
        dbStatus.error = error instanceof Error ? error.message : 'Unknown database error';
      }

      return {
        status: 'ok' as const,
        version: process.env.APP_VERSION || '0.0.0',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development',
      };
    },
  );

  // Test endpoint for debugging
  app.get(
    '/test',
    {
      schema: {
        response: {
          200: Type.Object({
            message: Type.String(),
            timestamp: Type.String(),
            environment: Type.String(),
            database: Type.Object({
              available: Type.Boolean(),
              error: Type.Optional(Type.String()),
            }),
          }),
        },
      },
    },
    async () => {
      let dbAvailable = false;
      let dbError: string | undefined;

      try {
        if (app.db) {
          await app.db.selectFrom('posts').select('id').limit(1).execute();
          dbAvailable = true;
        }
      } catch (error) {
        dbError = error instanceof Error ? error.message : 'Unknown error';
      }

      return {
        message: 'Mus.io API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          available: dbAvailable,
          error: dbError,
        },
      };
    },
  );

  // Register route modules
  app.register(authRoutes);
  app.register(postsRoutes);
  app.register(feedRoutes);
  app.register(searchRoutes);
  app.register(metadataRoutes);

  return app;
}
