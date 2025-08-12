import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitOptions {
  max: number;
  window: number; // in milliseconds
  keyGenerator?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  5 * 60 * 1000,
);

export function createRateLimit(options: RateLimitOptions) {
  const {
    max,
    window,
    keyGenerator = (request) => request.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
    const key = keyGenerator(request);
    const now = Date.now();

    // Get or create entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + window,
      };
    }

    const entry = store[key];

    // Check if limit exceeded
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      reply.status(429).headers({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        'Retry-After': retryAfter.toString(),
      });

      return reply.send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    // Add rate limit headers
    reply.headers({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': (max - entry.count - 1).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    });

    // Increment counter (we'll do this immediately since we can't easily hook into response)
    entry.count++;
  };
}

// Predefined rate limiters
export const strictRateLimit = createRateLimit({
  max: 5,
  window: 60 * 1000, // 1 minute
});

export const authRateLimit = createRateLimit({
  max: 10,
  window: 15 * 60 * 1000, // 15 minutes
  skipSuccessfulRequests: true,
});

export const generalRateLimit = createRateLimit({
  max: 100,
  window: 60 * 1000, // 1 minute
});

export const uploadRateLimit = createRateLimit({
  max: 10,
  window: 60 * 1000, // 1 minute
});
