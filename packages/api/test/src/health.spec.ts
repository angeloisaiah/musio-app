import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { buildServer } from '../../../apps/api/src/server';

describe('GET /health', () => {
  test('returns ok and version', async () => {
    const app = buildServer();
    await app.ready();
    const res = await request(app.server).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', version: expect.any(String) });
    await app.close();
  });
});

describe('GET /api/posts', () => {
  test('returns feed items with pagination cursor', async () => {
    const app = buildServer();
    await app.ready();
    const r1 = await request(app.server).get('/api/posts?limit=2').expect(200);

    // Check structure
    expect(r1.body).toHaveProperty('items');
    expect(r1.body).toHaveProperty('nextCursor');
    expect(Array.isArray(r1.body.items)).toBe(true);
    expect(r1.body.items.length).toBeGreaterThanOrEqual(0);

    // nextCursor should be string or null
    expect(typeof r1.body.nextCursor === 'string' || r1.body.nextCursor === null).toBe(true);

    await app.close();
  }, 10000);
});

describe('auth flow', () => {
  test('signup/login/me', async () => {
    const app = buildServer();
    await app.ready();
    const email = `user+${Date.now()}@example.com`;
    const r = await request(app.server)
      .post('/api/auth/signup')
      .send({ name: 'T', email, password: 'pw' })
      .expect(200);
    expect(r.body).toEqual({
      user: expect.anything(),
      token: expect.any(String),
      refreshToken: expect.any(String),
    });
    const me = await request(app.server)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${r.body.token}`)
      .expect(200);
    expect(me.body).toEqual({ user: expect.anything() });
    await app.close();
  }, 15000);
});
