import type { Env } from '../../env';

import { Hono } from 'hono';

import { createAuth } from '../../lib/auth';

export const usersRoutes = new Hono<{ Bindings: Env }>().get('/me', async c => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'unauthorized' as const }, 401);
  }

  return c.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    session: {
      id: session.session.id,
      expiresAt: new Date(session.session.expiresAt).toISOString(),
      token: session.session.token,
    },
  });
});
