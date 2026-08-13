import type { Env } from './env';

import { describe, expect, it } from 'vitest';

import { app } from './app';

const env: Env = {
  DB: {} as D1Database,
  AVATARS_BUCKET: {} as R2Bucket,
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
};

describe('app', () => {
  it('returns ok on GET /api/v1/health', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('mounts Better Auth under /api/auth', async () => {
    const res = await app.request('/api/auth/ok', undefined, env);

    expect(res.status).toBe(200);
  });
});
