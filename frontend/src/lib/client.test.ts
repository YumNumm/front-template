import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { authClient } from './auth-client';

describe('frontend clients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the users/me request with credentials', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ user: null }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.api.v1.users.me.$get();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/users/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('exposes the Better Auth session client', () => {
    expect(authClient.getSession).toBeTypeOf('function');
    expect(authClient.signIn.social).toBeTypeOf('function');
  });
});
