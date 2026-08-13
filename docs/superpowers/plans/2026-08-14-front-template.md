# Front Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pnpm monorepo template with TanStack Start (`frontend`) and Hono (`backend`) as separate Cloudflare Workers, typed Hono RPC, Better Auth (Google), D1/Drizzle, R2 wiring, OpenTofu, sops (`.env.enc.json`), and CI/CD to `template.yumnumm.dev`.

**Architecture:** Same-origin on `template.yumnumm.dev`: `/` → frontend Worker, `/api/*` → backend Worker, plus Service Binding for SSR→API. `packages/api` re-exports backend `AppType` and provides the RPC client. Secrets via sops+GCP KMS; deploy via GitHub OIDC.

**Tech Stack:** TanStack Start, Hono, Better Auth, Drizzle, Cloudflare D1/R2/Workers, Tailwind v4, shadcn/ui, TypeScript 7 native, pnpm, turbo, mise, hk, oxlint/oxfmt, vitest, OpenTofu, sops, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-14-front-template-design.md`

## Global Constraints

- Package manager: **pnpm** only (via `mise exec -- pnpm …`); never edit dependency ranges in `package.json` by hand — use `pnpm add` / `pnpm add -D`
- Tool runner: prefer `mise exec -- <cmd>` when mise manages the tool
- Workspace scope: `@front-template/frontend`, `@front-template/backend`, `@front-template/api`
- Production host: `https://template.yumnumm.dev`
- App API: `GET /api/v1/users/me`; Better Auth: `/api/auth/*`
- Encrypted secrets file: `.env.enc.json` (sops + GCP KMS)
- No Aegis / strict agent commit gates; thin `AGENTS.md` + setup docs only
- No avatar/R2 sample UI; R2 binding only on backend
- No staging env; no E2E in v1
- Git hooks: **hk** (not lefthook); quality: gitleaks, pinact, zizmor, shellcheck

## File map (target)

| Path | Responsibility |
|------|----------------|
| `mise.toml`, `hk.pkl`, `pnpm-workspace.yaml`, `turbo.json`, `package.json` | Root toolchain |
| `.oxlintrc.json`, `.oxfmtrc.json`, `.gitignore`, `.gitattributes`, `.vscode/*` | Quality / editor |
| `backend/src/index.ts` | Worker entry → Hono app |
| `backend/src/app.ts` | Hono app compose (`/api/auth/*`, `/api/v1/*`) |
| `backend/src/lib/auth.ts` | Better Auth server |
| `backend/src/lib/db.ts` | Drizzle + D1 |
| `backend/src/lib/schema.ts` | Better Auth Drizzle tables |
| `backend/src/routes/v1/users.ts` | `GET /users/me` |
| `backend/wrangler.jsonc` | D1, R2, secrets, name |
| `packages/api/src/index.ts` | `AppType` re-export + `createApiClient` |
| `frontend/src/routes/*` | Start routes (index, login, me) |
| `frontend/src/lib/auth-client.ts` | Better Auth React client (`basePath: /api/auth`) |
| `frontend/src/lib/api.ts` | Browser RPC client via `@front-template/api` |
| `frontend/wrangler.jsonc` | Service binding `BACKEND`, routes later via tofu |
| `infra/terraform/{cloudflare,googlecloud,github}/` | OpenTofu stacks |
| `.sops.yaml`, `.env.enc.json` | Secret encryption |
| `.github/workflows/ci.yml`, `deploy.yml` | Checks + Cloudflare deploy |
| `docs/*.md`, `AGENTS.md` | Setup / conventions |

---

### Task 1: Root workspace and toolchain

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `mise.toml`, `hk.pkl`, `.gitignore`, `.gitattributes`, `.npmrc`, `.oxlintrc.json`, `.oxfmtrc.json`, `.vscode/settings.json`, `.vscode/extensions.json`
- Create: `frontend/package.json`, `backend/package.json`, `packages/api/package.json` (stubs)

**Interfaces:**
- Produces: pnpm workspace with three packages; `turbo` tasks `build`, `check-types`, `test`, `dev`, `lint`, `format`; mise tools; hk pre-commit

- [ ] **Step 1: Create root manifests**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "frontend"
  - "backend"
  - "packages/*"
```

Root `package.json`:
```json
{
  "name": "front-template",
  "private": true,
  "packageManager": "pnpm@10.14.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "check-types": "turbo run check-types",
    "test": "turbo run test",
    "lint": "oxlint --type-aware frontend/src backend/src packages/api/src",
    "lint:fix": "oxlint --type-aware --fix frontend/src backend/src packages/api/src",
    "format": "oxfmt --check frontend backend packages",
    "format:fix": "oxfmt --write frontend backend packages",
    "check": "pnpm lint && pnpm format && pnpm check-types && pnpm test"
  },
  "engines": {
    "node": "^22.15.0 || >=23.5.0"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".output/**", ".vercel/output/**"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

`mise.toml` (pin concrete versions at implement time with `mise install`; keep this set):
```toml
[tools]
node = "22"
pnpm = "10.14.0"
hk = "latest"
pkl = "latest"
sops = "latest"
gcloud = "latest"
opentofu = "1.12.0"
gitleaks = "latest"
pinact = "latest"
zizmor = "latest"
actionlint = "latest"
shellcheck = "latest"

[settings]
experimental = true

[env]
HK_MISE = "1"

[hooks]
postinstall = "hk install --mise"
```

`hk.pkl` — adapt from eqmonitor-backend `hk.pkl` (gitleaks, pinact, zizmor, shellcheck, util checks). Use `mise exec --` in check commands.

`.npmrc`:
```
shamefully-hoist=false
strict-peer-dependencies=false
```

- [ ] **Step 2: Stub package.json for each workspace**

`frontend/package.json` name `@front-template/frontend`, `"type": "module"`, scripts placeholders: `dev`, `build`, `check-types`, `test`, `deploy`.

`backend/package.json` name `@front-template/backend`, same script keys.

`packages/api/package.json` name `@front-template/api`, `"exports": { ".": "./src/index.ts" }`, dependency on `@front-template/backend` as `workspace:*` (types only usage).

- [ ] **Step 3: Add root tooling deps via pnpm**

```bash
mise install
mise exec -- pnpm install
mise exec -- pnpm add -Dw turbo oxlint oxfmt oxlint-tsgolint typescript @typescript/native-preview vitest
```

(Adjust TS 7 native package names to whatever is current for TypeScript 7 / `tsgo` at implement time; prefer the same approach as `eqmonitor-backend/app/admin` which uses `@typescript/native-preview` + `tsgo --noEmit`.)

- [ ] **Step 4: Verify workspace**

```bash
mise exec -- pnpm -r list --depth 0
```

Expected: three workspace packages listed.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json mise.toml hk.pkl .gitignore .gitattributes .npmrc .oxlintrc.json .oxfmtrc.json .vscode frontend/package.json backend/package.json packages/api/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: scaffold monorepo workspace and toolchain

Add pnpm/turbo/mise/hk and stub frontend, backend, api packages.
EOF
)"
```

---

### Task 2: Backend Hono Worker skeleton

**Files:**
- Create: `backend/src/app.ts`, `backend/src/index.ts`, `backend/src/env.ts`, `backend/wrangler.jsonc`, `backend/tsconfig.json`, `backend/vite.config.ts` (if using vite for backend worker) or plain wrangler
- Create: `backend/src/app.test.ts`

**Interfaces:**
- Produces: `export type AppType = typeof app` from `backend/src/app.ts`
- Produces: Worker `fetch` handler exporting the Hono app
- Consumes: Cloudflare `Env` with at least placeholder types

- [ ] **Step 1: Write failing health test**

`backend/src/app.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("app", () => {
  it("returns ok on GET /api/v1/health", async () => {
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd backend && mise exec -- pnpm exec vitest run src/app.test.ts
```

Expected: FAIL (module/app missing or route missing).

- [ ] **Step 3: Implement minimal Hono app**

`backend/src/env.ts`:
```ts
export type Env = {
  DB: D1Database;
  AVATARS_BUCKET: R2Bucket;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};
```

`backend/src/app.ts`:
```ts
import { Hono } from "hono";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

const v1 = new Hono<{ Bindings: Env }>();
v1.get("/health", (c) => c.json({ ok: true as const }));

app.route("/api/v1", v1);

export { app };
export type AppType = typeof app;
```

`backend/src/index.ts`:
```ts
import { app } from "./app";

export default app;
```

`backend/wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "front-template-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-15",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "front-template-db",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "drizzle"
    }
  ],
  "r2_buckets": [
    {
      "binding": "AVATARS_BUCKET",
      "bucket_name": "front-template-avatars"
    }
  ],
  "vars": {
    "BETTER_AUTH_URL": "http://localhost:8787"
  }
}
```

Add deps:
```bash
mise exec -- pnpm --filter @front-template/backend add hono
mise exec -- pnpm --filter @front-template/backend add -D wrangler vitest @cloudflare/workers-types typescript @typescript/native-preview
```

- [ ] **Step 4: Run test — expect pass**

```bash
mise exec -- pnpm --filter @front-template/backend test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "$(cat <<'EOF'
feat(backend): add Hono worker skeleton with health route

Establish AppType export and wrangler D1/R2 bindings.
EOF
)"
```

---

### Task 3: Drizzle schema + Better Auth (Google)

**Files:**
- Create: `backend/src/lib/schema.ts`, `backend/src/lib/db.ts`, `backend/src/lib/auth.ts`, `backend/drizzle.config.ts`
- Modify: `backend/src/app.ts` — mount Better Auth handler at `/api/auth/*`
- Modify: `backend/wrangler.jsonc` — document required secrets

**Interfaces:**
- Produces: `createAuth(env: Env)` returning Better Auth instance
- Produces: Drizzle DB from `env.DB`
- Consumes: `Env` secrets `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL`

- [ ] **Step 1: Add dependencies**

```bash
mise exec -- pnpm --filter @front-template/backend add better-auth drizzle-orm
mise exec -- pnpm --filter @front-template/backend add -D drizzle-kit
```

- [ ] **Step 2: Write schema + db helpers**

Use Better Auth’s Drizzle adapter schema for `user`, `session`, `account`, `verification` (generate via Better Auth CLI or copy from current Better Auth Drizzle docs at implement time). File: `backend/src/lib/schema.ts`.

`backend/src/lib/db.ts`:
```ts
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../env";
import * as schema from "./schema";

export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof createDb>;
```

- [ ] **Step 3: Implement Better Auth**

`backend/src/lib/auth.ts`:
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../env";
import { createDb } from "./db";
import * as schema from "./schema";

export function createAuth(env: Env) {
  const db = createDb(env);
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
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
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://template.yumnumm.dev",
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

Mount in `app.ts` (pattern):
```ts
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
```

- [ ] **Step 4: Local D1 migrate script**

Add `backend/package.json` scripts via file edit of scripts only (deps already added):
- `db:generate`: `drizzle-kit generate`
- `db:push:local`: wrangler d1 migrations apply local
- Document exact commands in Task 13 docs; for now ensure `drizzle.config.ts` points at schema + D1.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "$(cat <<'EOF'
feat(backend): add Drizzle schema and Better Auth Google OAuth

Wire /api/auth/* to Better Auth with D1 adapter.
EOF
)"
```

---

### Task 4: `GET /api/v1/users/me` + tests

**Files:**
- Create: `backend/src/routes/v1/users.ts`, `backend/src/routes/v1/users.test.ts`
- Modify: `backend/src/app.ts` — `v1.route("/users", usersRoutes)`

**Interfaces:**
- Produces: `GET /api/v1/users/me` → JSON
```ts
type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  session: {
    id: string;
    expiresAt: string; // ISO
    token: string;
  };
};
```
- Produces: `401` with `{ error: "unauthorized" }` when no session

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { app } from "../app";

describe("GET /api/v1/users/me", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});
```

(Add authenticated case with mocked `createAuth` / session cookie once local test harness exists; minimum bar is 401 test for v1.)

- [ ] **Step 2: Run — expect fail**

```bash
mise exec -- pnpm --filter @front-template/backend exec vitest run src/routes/v1/users.test.ts
```

- [ ] **Step 3: Implement route**

`backend/src/routes/v1/users.ts`:
```ts
import { Hono } from "hono";
import type { Env } from "../../env";
import { createAuth } from "../../lib/auth";

export const usersRoutes = new Hono<{ Bindings: Env }>();

usersRoutes.get("/me", async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" as const }, 401);
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
```

Wire: `v1.route("/users", usersRoutes)`.

- [ ] **Step 4: Run tests — expect pass**

```bash
mise exec -- pnpm --filter @front-template/backend test
```

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "$(cat <<'EOF'
feat(backend): add GET /api/v1/users/me

Return session user and token summary for the demo page.
EOF
)"
```

---

### Task 5: `packages/api` Hono RPC client

**Files:**
- Create: `packages/api/src/index.ts`, `packages/api/tsconfig.json`, `packages/api/package.json` (finalize exports)
- Create: `packages/api/src/client.test.ts` (type-level / lightweight)

**Interfaces:**
- Produces:
```ts
import type { AppType } from "@front-template/backend/app"; // path alias — prefer exporting AppType from `@front-template/backend`
import { hc } from "hono/client";

export type { AppType };
export function createApiClient(
  baseUrl: string,
  init?: { fetch?: typeof fetch },
) {
  return hc<AppType>(baseUrl, { fetch: init?.fetch });
}
```

**Package boundary rule:** `@front-template/api` may depend on `@front-template/backend` for **types** only. Configure backend `package.json` `exports` so `AppType` is importable without pulling Worker entry. If circular risk appears, move `AppType` to a tiny `packages/api` import of `backend/src/app.ts` via TypeScript project references — prefer:

`backend/package.json`:
```json
"exports": {
  ".": "./src/index.ts",
  "./app": "./src/app.ts"
}
```

Then api imports `import type { AppType } from "@front-template/backend/app"`.

- [ ] **Step 1: Implement `packages/api/src/index.ts` as above**

- [ ] **Step 2: Add hono client dep on api package**

```bash
mise exec -- pnpm --filter @front-template/api add hono
mise exec -- pnpm --filter @front-template/api add -D typescript @typescript/native-preview
```

- [ ] **Step 3: Smoke import check**

```bash
mise exec -- pnpm --filter @front-template/api check-types
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api backend/package.json
git commit -m "$(cat <<'EOF'
feat(api): add Hono RPC client package

Re-export AppType and createApiClient for frontend use.
EOF
)"
```

---

### Task 6: Frontend TanStack Start skeleton

**Files:**
- Create: `frontend/vite.config.ts`, `frontend/wrangler.jsonc`, `frontend/tsconfig.json`, `frontend/src/styles.css`, `frontend/src/router.tsx`, `frontend/src/routes/__root.tsx`, `frontend/src/routes/index.tsx`, `frontend/components.json` (shadcn)
- Mirror `eqmonitor-backend/app/admin` vite plugin order: `cloudflare` → `tsConfigPaths` → `tailwindcss` → `tanstackStart` → `viteReact`

**Interfaces:**
- Produces: `pnpm --filter @front-template/frontend dev` serves UI (port **3000**)
- Produces: wrangler service binding name `BACKEND` (optional in local until wired)

- [ ] **Step 1: Add frontend dependencies**

```bash
mise exec -- pnpm --filter @front-template/frontend add react react-dom @tanstack/react-router @tanstack/react-start better-auth @front-template/api
mise exec -- pnpm --filter @front-template/frontend add -D vite @vitejs/plugin-react @cloudflare/vite-plugin @tailwindcss/vite tailwindcss wrangler typescript @typescript/native-preview vite-tsconfig-paths @types/react @types/react-dom
```

(Add shadcn deps when initializing shadcn: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, radix slots as needed.)

- [ ] **Step 2: Vite + wrangler config**

`frontend/vite.config.ts` — same pattern as admin (`server.port: 3000`).

`frontend/wrangler.jsonc`:
```jsonc
{
  "name": "front-template-web",
  "compatibility_date": "2026-07-15",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "services": [
    { "binding": "BACKEND", "service": "front-template-api" }
  ]
}
```

- [ ] **Step 3: Minimal routes**

`__root.tsx`: html shell + outlet + link to `/login` and `/me`.  
`index.tsx`: short “Front Template” home.

- [ ] **Step 4: Run dev smoke**

```bash
mise exec -- pnpm --filter @front-template/frontend dev
```

Expected: app loads on `http://localhost:3000`.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "$(cat <<'EOF'
feat(frontend): scaffold TanStack Start worker

Add Vite Cloudflare plugin setup and base routes.
EOF
)"
```

---

### Task 7: Frontend auth + `/me` demo page

**Files:**
- Create: `frontend/src/lib/auth-client.ts`, `frontend/src/lib/api.ts`, `frontend/src/routes/login.tsx`, `frontend/src/routes/me.tsx`
- Modify: protected `beforeLoad` on `/me`

**Interfaces:**
- Consumes: `createApiClient` from `@front-template/api`
- Consumes: Better Auth client with `baseURL` = same origin (empty or `window.location.origin`) and base path `/api/auth`
- Produces: `/login` Google button; `/me` shows JSON from `client.api.v1.users.me.$get()`

- [ ] **Step 1: Auth client**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});
```

Local dev note: browser calls `/api/auth` and `/api/v1` on the frontend origin — **must proxy or run a local reverse proxy**. Implement one of:

**Preferred local:** frontend Vite `server.proxy`:
```ts
server: {
  port: 3000,
  proxy: {
    "/api": "http://localhost:8787",
  },
},
```
Backend `wrangler dev` / vite on **8787**. `BETTER_AUTH_URL=http://localhost:3000` so cookies are on the UI origin.

- [ ] **Step 2: API client**

```ts
import { createApiClient } from "@front-template/api";

export const api = createApiClient("/", {
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});
```

- [ ] **Step 3: `/me` route with guard**

```ts
export const Route = createFileRoute("/me")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
  component: MePage,
});
```

`MePage` calls `api.api.v1.users.me.$get()` (exact hc path must match Hono route tree — verify after mount; adjust to actual client path). Render `<pre>{JSON.stringify(data, null, 2)}</pre>`.

- [ ] **Step 4: Login page**

Button: `authClient.signIn.social({ provider: "google", callbackURL: "/me" })`.

- [ ] **Step 5: Manual smoke (document in commit body if Google secrets missing)**

With secrets in `.dev.vars` for backend + proxy: login → `/me` shows user/session JSON.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "$(cat <<'EOF'
feat(frontend): add Google login and /me demo page

Proxy /api to backend and display users/me via Hono RPC.
EOF
)"
```

---

### Task 8: Local monorepo scripts + root README quickstart

**Files:**
- Modify: root `package.json` scripts, `backend/package.json`, `frontend/package.json`
- Create: `README.md` (quickstart only; full docs in Task 13)
- Create: `backend/.dev.vars.example`, `frontend/.env.example` if needed

- [ ] **Step 1: Align turbo `dev`**

Backend script: `"dev": "wrangler dev src/index.ts --port 8787"` (or vite if chosen).  
Frontend script: `"dev": "vite dev"`.  
Root: `"dev": "turbo run dev --parallel"`.

- [ ] **Step 2: Document ports**

| Process | Port |
|---------|------|
| frontend | 3000 |
| backend | 8787 |
| browser origin | 3000 (proxies `/api`) |

- [ ] **Step 3: Commit**

```bash
git add package.json frontend/package.json backend/package.json README.md backend/.dev.vars.example
git commit -m "$(cat <<'EOF'
chore: wire parallel local dev and quickstart README

Document proxy ports for same-origin /api during development.
EOF
)"
```

---

### Task 9: OpenTofu — Cloudflare stack

**Files:**
- Create: `infra/terraform/cloudflare/{main.tf,locals.tf,backend.tf,variables.tf,provider.tf}`
- Create: `infra/terraform/cloudflare/modules/workers-app/{main.tf,variables.tf,outputs.tf}` (optional module split)

**Interfaces:**
- Produces resources: Workers `front-template-web` + `front-template-api`, D1, R2, routes on `template.yumnumm.dev` (`/` and `/api/*`), service binding frontend→backend
- Variables: `cloudflare_account_id`, `zone_id` (or zone name `yumnumm.dev`), hostname default `template.yumnumm.dev`

- [ ] **Step 1: Scaffold provider + backend**

`provider.tf`: Cloudflare provider (OpenTofu registry).  
`backend.tf`: remote state backend placeholder (GCS or R2/S3-compatible — match team; document required bucket). Prefer pattern from eqmonitor (GCS) if already available; otherwise `local` backend for first apply with comment to switch.

- [ ] **Step 2: Resources in `main.tf` / `locals.tf`**

- D1 database `front-template-db`
- R2 bucket `front-template-avatars`
- Workers scripts (may be deployed by wrangler CI; tofu owns routes/bindings/DNS if split — **decide implement-time:** either tofu manages worker script from build artifacts, or tofu manages infrastructure + routes and CI uses `wrangler deploy`. **Default for this plan:** CI/`wrangler deploy` ships code; OpenTofu owns D1, R2, DNS/custom domain, route patterns, and documents binding names. If Cloudflare provider can attach routes to existing workers by name, use that.)

Exact Cloudflare resources depend on provider version — implement against current `cloudflare/cloudflare` OpenTofu provider docs. Minimum outputs: `d1_database_id`, `r2_bucket_name`, `hostname`.

- [ ] **Step 3: `tofu init` / `tofu plan` smoke** (credentials required)

```bash
cd infra/terraform/cloudflare
mise exec -- tofu init
mise exec -- tofu plan
```

- [ ] **Step 4: Commit**

```bash
git add infra/terraform/cloudflare
git commit -m "$(cat <<'EOF'
feat(infra): add Cloudflare OpenTofu stack

Provision D1, R2, and template.yumnumm.dev routing inputs.
EOF
)"
```

---

### Task 10: OpenTofu — GCP KMS + sops + `.env.enc.json`

**Files:**
- Create: `infra/terraform/googlecloud/{main.tf,locals.tf,backend.tf,variables.tf,provider.tf}`
- Create: `.sops.yaml`, `.env.enc.json` (encrypted), `scripts/decrypt-env.sh`
- Modify: docs later

**Interfaces:**
- Produces: KMS key ring `front-template` + crypto key `sops`
- Produces: `.sops.yaml` with `gcp_kms` resource ID
- Produces: `.env.enc.json` keys at minimum:
```json
{
  "BETTER_AUTH_SECRET": "...",
  "GOOGLE_CLIENT_ID": "...",
  "GOOGLE_CLIENT_SECRET": "..."
}
```

- [ ] **Step 1: Tofu GCP KMS module resources**

Create key ring + crypto key; output full resource name for sops.

- [ ] **Step 2: `.sops.yaml`**

```yaml
creation_rules:
  - path_regex: \.env\.enc\.json$
    gcp_kms: projects/<PROJECT>/locations/<LOC>/keyRings/front-template/cryptoKeys/sops
```

- [ ] **Step 3: Create plaintext locally, encrypt**

```bash
# after tofu apply and gcloud auth
echo '{"BETTER_AUTH_SECRET":"replace","GOOGLE_CLIENT_ID":"replace","GOOGLE_CLIENT_SECRET":"replace"}' > .env.json
mise exec -- sops -e .env.json > .env.enc.json
rm .env.json
```

Never commit plaintext `.env.json`.

- [ ] **Step 4: Decrypt helper**

`scripts/decrypt-env.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
mise exec -- sops -d .env.enc.json
```

- [ ] **Step 5: Commit** (encrypted file + tofu + scripts; no plaintext)

```bash
git add infra/terraform/googlecloud .sops.yaml .env.enc.json scripts/decrypt-env.sh
git commit -m "$(cat <<'EOF'
feat(infra): add GCP KMS and sops-encrypted .env.enc.json

Enable decrypt-to-wrangler-secret workflow for auth credentials.
EOF
)"
```

---

### Task 11: OpenTofu — GitHub OIDC + Actions vars

**Files:**
- Create: `infra/terraform/github/{main.tf,locals.tf,backend.tf,variables.tf,provider.tf}`
- Cross-link: GCP WIF bindings for GitHub repo `YumNumm/front-template` (or actual repo name); Cloudflare API token / OIDC trust for Workers deploy as supported

**Interfaces:**
- Produces: GitHub Actions variables for WIF provider + service account (eqmonitor pattern)
- Produces: deploy environment `production` optional protection rules
- Consumes: googlecloud remote state outputs for WIF

- [ ] **Step 1: Implement github stack** following eqmonitor `home8s/terraform/github` shape (repository data source, `github_actions_variable`, OIDC-related resources).

- [ ] **Step 2: Ensure GCP side grants `roles/cloudkms.cryptoKeyDecrypter` to the CI SA**

- [ ] **Step 3: Commit**

```bash
git add infra/terraform/github
git commit -m "$(cat <<'EOF'
feat(infra): add GitHub OIDC and Actions variables

Wire deploy identity for Cloudflare and sops decrypt via GCP.
EOF
)"
```

---

### Task 12: CI checks + Cloudflare deploy workflows

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Create: `.github/actionlint.yaml` (from eqmonitor if useful)
- Modify: `hk.pkl` already covers pinact/gitleaks locally; CI mirrors checks

**Interfaces:**
- `ci.yml` on PR/push: gitleaks, pinact, actionlint, zizmor, `pnpm check`
- `deploy.yml` on `main` + `workflow_dispatch`: OIDC → decrypt `.env.enc.json` → `wrangler secret bulk` / puts → `pnpm --filter … deploy` for backend then frontend

- [ ] **Step 1: Write `ci.yml`**

Jobs:
1. `security` — gitleaks, pinact, actionlint, zizmor  
2. `check` — mise + pnpm install + `pnpm check`

Pin actions with full SHAs (pinact-friendly).

- [ ] **Step 2: Write `deploy.yml`**

Steps (conceptual order):
1. Authenticate GCP via WIF  
2. `sops -d .env.enc.json > /tmp/env.json`  
3. Authenticate Cloudflare (OIDC or API token from GitHub secret provisioned by tofu)  
4. Apply D1 migrations  
5. Deploy backend worker  
6. Deploy frontend worker  
7. Redact and delete `/tmp/env.json`

- [ ] **Step 3: Run actionlint locally**

```bash
mise exec -- actionlint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .github
git commit -m "$(cat <<'EOF'
ci: add check and Cloudflare deploy workflows

Include gitleaks/pinact/zizmor and OIDC-based worker deploy.
EOF
)"
```

---

### Task 13: Docs + AGENTS.md

**Files:**
- Create: `AGENTS.md`, `docs/DATABASE_SETUP.md`, `docs/DEPLOYMENT.md`, `docs/FORKING.md`
- Modify: `README.md` — link to docs

**Content requirements:**
- DATABASE: local D1 migrate/seed, remote push
- DEPLOYMENT: tofu order (`googlecloud` → `cloudflare` → `github`), sops, `template.yumnumm.dev`, Google OAuth console redirect `https://template.yumnumm.dev/api/auth/callback/google`, CI deploy
- FORKING: rename `@front-template/*`, hostname, KMS, GitHub repo vars
- AGENTS: monorepo boundaries (frontend no Drizzle), `mise exec`, pnpm only, no Aegis

- [ ] **Step 1: Write the four docs**

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md docs README.md
git commit -m "$(cat <<'EOF'
docs: add setup guides and AGENTS conventions

Cover database, deployment, forking, and agent boundaries.
EOF
)"
```

---

### Task 14: End-to-end verification checklist

**Files:** none new (manual)

- [ ] **Step 1: Local**

```bash
mise install
mise exec -- pnpm install
mise exec -- pnpm --filter @front-template/backend db:push:local
mise exec -- pnpm dev
```

Open `http://localhost:3000`, complete Google login (dev client IDs), open `/me`, confirm JSON.

- [ ] **Step 2: Quality**

```bash
mise exec -- pnpm check
mise exec -- hk run check
```

Expected: pass.

- [ ] **Step 3: Infra + deploy** (with credentials)

Apply tofu stacks in order; merge to `main` or `workflow_dispatch`; verify `https://template.yumnumm.dev/api/v1/health` and `/me` after login.

- [ ] **Step 4: Final commit only if fixes needed**

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Monorepo frontend/backend/packages/api | 1, 5, 6 |
| Hono RPC + AppType | 2, 5 |
| Better Auth Google | 3, 7 |
| `GET /api/v1/users/me` | 4, 7 |
| Same-origin `/` + `/api/*` + Service Binding | 7 (local proxy), 9 (prod) |
| D1 + Drizzle + R2 binding | 2, 3, 9 |
| `template.yumnumm.dev` | 9, 12, 13 |
| `.env.enc.json` + sops + GCP KMS | 10 |
| GitHub OIDC | 11, 12 |
| CI + Cloudflare deploy | 12 |
| gitleaks/pinact/zizmor/hk | 1, 12 |
| Thin AGENTS + docs | 13 |
| No Aegis / no avatar UI / no staging | honored by omission |

## Placeholder / consistency notes

- Hono RPC client path for `users/me` must be verified against generated `hc` typings after routes are mounted (`api.api.v1.users.me.$get` vs alternate nesting).
- Cloudflare OpenTofu vs wrangler ownership: Task 9 default is tofu for data plane + DNS/routes, wrangler CI for script upload — keep docs aligned.
- TypeScript 7 native package names: follow whatever `eqmonitor` / upstream uses at implement time (`tsgo`).
