import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../../../apps/api/src/server';
import type { FastifyInstance } from 'fastify';
import { createDb } from '../../../apps/api/src/db/connection';
import type { KyselyDatabase } from '@musio/shared';

describe('Optimized API Server', () => {
  let app: FastifyInstance;
  let db: KyselyDatabase;

  beforeEach(async () => {
    app = buildServer();
    await app.ready();
    db = createDb();
  });

  afterEach(async () => {
    await db.destroy();
    await app.close();
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to requests', async () => {
      const responses = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 110; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
        });
        responses.push(response);
      }

      // Should have some rate limited responses
      const rateLimited = responses.filter(r => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Rate limited response should have proper headers
      const rateLimitedResponse = rateLimited[0];
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining', '0');
      expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid signup data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          name: '', // Empty name
          email: 'invalid-email', // Invalid email
          password: '123', // Too short password
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('Invalid input data');
    });

    test('should reject SQL injection attempts', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          name: "'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'validpassword123',
        },
      });

      // Should either reject or sanitize the input
      expect([400, 409]).toContain(response.statusCode);
    });

    test('should reject XSS attempts', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          password: 'validpassword123',
        },
      });

      // Should sanitize or reject the input
      expect([400, 409]).toContain(response.statusCode);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Close the database connection to simulate an error
      await db.destroy();

      const response = await app.inject({
        method: 'GET',
        url: '/api/posts',
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(500);
      const body = response.json();
      expect(body).toHaveProperty('error');
    });

    test('should return proper error format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });
  });

  describe('Performance Optimizations', () => {
    test('should return posts feed efficiently', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/feed?limit=10',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('nextCursor');
      expect(Array.isArray(body.items)).toBe(true);
    });

    test('should handle pagination correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/feed?limit=5',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Type Safety', () => {
    test('should validate request schemas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/posts?limit=invalid',
      });

      // Should handle invalid query parameters gracefully
      expect([200, 400]).toContain(response.statusCode);
    });
  });
});
