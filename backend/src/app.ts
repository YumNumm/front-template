import type { Env } from './env';

import { Hono } from 'hono';

import { createAuth } from './lib/auth';
import { usersRoutes } from './routes/v1/users';

const v1 = new Hono<{ Bindings: Env }>()
  .get('/health', c => c.json({ ok: true as const }))
  .route('/users', usersRoutes);

const app = new Hono<{ Bindings: Env }>()
  .on(['GET', 'POST'], '/api/auth/*', c => {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
  })
  .route('/api/v1', v1);

export { app };
export type AppType = typeof app;
