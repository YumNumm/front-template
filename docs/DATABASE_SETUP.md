# Database setup

The backend uses Drizzle with Cloudflare D1. Its binding is `DB`, the database name is `front-template-db`, and migrations live in `backend/drizzle/`.

## Local database

Install dependencies and apply all migrations to Wrangler's local D1 store:

```bash
mise install
mise exec -- pnpm install
mise exec -- pnpm --filter @front-template/backend db:push:local
```

Create a migration after changing `backend/src/lib/schema.ts`, then apply it locally:

```bash
mise exec -- pnpm --filter @front-template/backend db:generate
mise exec -- pnpm --filter @front-template/backend db:push:local
```

The repository currently has no separate seed script or seed fixture. The checked-in migration initializes an empty schema; add explicit seed data only when a feature requires it.

Local D1 data is managed by Wrangler under its ignored local state. Start the backend on port 8787 with:

```bash
mise exec -- pnpm --filter @front-template/backend dev
```

## Remote database

The Cloudflare OpenTofu stack creates `front-template-db`. Replace the placeholder `database_id` in `backend/wrangler.jsonc` with the created D1 database ID before deploying.

Preview pending remote migrations:

```bash
mise exec -- pnpm --filter @front-template/backend exec wrangler d1 migrations list front-template-db --remote
```

Apply them:

```bash
mise exec -- pnpm --filter @front-template/backend exec wrangler d1 migrations apply front-template-db --remote
```

Remote migrations affect production data. Review generated SQL and back up important data before destructive changes. The deployment workflow applies remote migrations before deploying either Worker.
