import type { FastifyInstance } from 'fastify';
import type { KyselyDatabase } from '@musio/shared';
import { SignupSchema, LoginSchema, AuthResponseSchema } from '../schemas/auth';
import { authRateLimit } from '../middleware/rate-limiter';
import { sanitizeString, sanitizeEmail } from '../middleware/validation';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

export async function authRoutes(fastify: FastifyInstance) {
  const db = fastify.db as KyselyDatabase;

  // User signup
  fastify.post('/api/auth/signup', {
    schema: {
      body: SignupSchema,
      response: {
        200: AuthResponseSchema,
      },
    },
    preHandler: authRateLimit,
  }, async (request, reply) => {
    const { name, email, password } = request.body as any;
    
    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedEmail = sanitizeEmail(email);
    
    if (!sanitizedName || !sanitizedEmail || !password) {
      return reply.code(400).send({ error: 'Invalid input data' });
    }
    
    if (password.length < 8 || password.length > 128) {
      return reply.code(400).send({ error: 'Password must be between 8 and 128 characters' });
    }

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', sanitizedEmail)
      .executeTakeFirst();

    if (existingUser) {
      return reply.code(409).send({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto('users')
      .values({
        id: userId,
        name: sanitizedName,
        email: sanitizedEmail,
        bio: null,
        avatar_url: null,
        provider: null,
        provider_id: null,
        created_at: now,
      })
      .execute();

    // Store credentials
    await db
      .insertInto('credentials')
      .values({
        user_id: userId,
        password_hash: passwordHash,
      })
      .execute();

    // Generate JWT token
    const token = fastify.jwt.sign({ sub: userId, email });

    return {
      user: { id: userId, name: sanitizedName, email: sanitizedEmail },
      token,
    };
  });

  // User login
  fastify.post('/api/auth/login', {
    schema: {
      body: LoginSchema,
      response: {
        200: AuthResponseSchema,
      },
    },
    preHandler: authRateLimit,
  }, async (request, reply) => {
    const { email, password } = request.body as any;
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    
    if (!sanitizedEmail || !password) {
      return reply.code(400).send({ error: 'Invalid input data' });
    }

    // Find user with credentials
    const user = await db
      .selectFrom('users as u')
      .innerJoin('credentials as c', 'c.user_id', 'u.id')
      .select(['u.id', 'u.name', 'u.email', 'c.password_hash'])
      .where('u.email', '=', sanitizedEmail)
      .executeTakeFirst();

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = fastify.jwt.sign({ sub: user.id, email: user.email });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  });
}
