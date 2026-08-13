import type { Env } from './env';

import { Hono } from 'hono';

import { createAuth } from './lib/auth';

const app = new Hono<{ Bindings: Env }>();

app.on(['GET', 'POST'], '/api/auth/*', c => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

const v1 = new Hono<{ Bindings: Env }>();
v1.get('/health', c => c.json({ ok: true as const }));

app.route('/api/v1', v1);

export { app };
export type AppType = typeof app;
