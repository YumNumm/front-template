import type { AppType } from '@front-template/backend/app';

import { hc } from 'hono/client';

export type { AppType };

export const createApiClient = (
  baseUrl: string,
  init?: { fetch?: typeof fetch },
) => hc<AppType>(baseUrl, { fetch: init?.fetch });
