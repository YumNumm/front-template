import type { Env } from '../../env';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app';

type MockSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
  };
};

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<MockSession | null>>(),
}));

vi.mock('../../lib/auth', () => ({
  createAuth: () => ({
    api: { getSession },
  }),
}));

const env: Env = {
  DB: {} as D1Database,
  AVATARS_BUCKET: {} as R2Bucket,
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
};

describe('GET /api/v1/users/me', () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it('returns 401 without session', async () => {
    getSession.mockResolvedValue(null);

    const res = await app.request('/api/v1/users/me', undefined, env);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('returns the current user and session', async () => {
    getSession.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        image: undefined,
      },
      session: {
        id: 'session-id',
        expiresAt: new Date('2026-08-14T00:00:00.000Z'),
        token: 'session-token',
      },
    });

    const res = await app.request('/api/v1/users/me', undefined, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
      session: {
        id: 'session-id',
        expiresAt: '2026-08-14T00:00:00.000Z',
        token: 'session-token',
      },
    });
  });
});
