import type { AppType } from './index';

import { describe, expect, expectTypeOf, it } from 'vitest';

import { createApiClient } from './index';

describe('createApiClient', () => {
  it('creates a typed client using the supplied fetch implementation', async () => {
    let request: Request | undefined;
    const customFetch: typeof fetch = async input => {
      request = input instanceof Request ? input : new Request(input);
      return Response.json({ ok: true });
    };

    const client = createApiClient('https://example.com', {
      fetch: customFetch,
    });
    const response = await client.api.v1.health.$get();

    expect(request?.url).toBe('https://example.com/api/v1/health');
    expect(request?.method).toBe('GET');
    await expect(response.json()).resolves.toEqual({ ok: true });
    expectTypeOf<AppType>().not.toBeNever();
    expectTypeOf(client.api.v1.users.me.$get).toBeFunction();
  });
});
