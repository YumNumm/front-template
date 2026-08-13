import type { Env } from './env';

import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

const v1 = new Hono<{ Bindings: Env }>();
v1.get('/health', c => c.json({ ok: true as const }));

app.route('/api/v1', v1);

export { app };
export type AppType = typeof app;
