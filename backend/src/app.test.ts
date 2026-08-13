import { describe, expect, it } from 'vitest';

import { app } from './app';

describe('app', () => {
  it('returns ok on GET /api/v1/health', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
