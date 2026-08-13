import type { Env } from '../env';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { createDb } from './db';
import * as schema from './schema';

const trustedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://template.yumnumm.dev',
];

export function createAuth(env: Env) {
  return betterAuth({
    database: drizzleAdapter(createDb(env), {
      provider: 'sqlite',
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins,
  });
}

export type Auth = ReturnType<typeof createAuth>;
