# Frontend Monorepo Template — Design Spec

**Date:** 2026-08-14  
**Status:** Approved for planning  
**References:**
- [imaimai-front-templete](https://github.com/imaimai17468/imaimai-front-templete) — app skeleton inspiration
- `YumNumm/eqmonitor-backend` — tooling (`mise`, `hk`, pnpm, turbo, gitleaks/pinact), `app/admin` (TanStack Start + CF Workers), terraform layout

## Goal

実務用のフロント向けモノレポスターターを作る。

- アプリ骨格は imaimai 系（TanStack Start / Better Auth / D1 / R2 / CF Workers）に倣う
- AI エージェント向けの厚い仕組み（Aegis、厳格コミットゲート）は載せない
- ツールチェーンと IaC / シークレット運用は eqmonitor-backend に寄せる
- **UI Worker と API Worker を完全分離**し、Hono RPC で型付き通信する

## Decisions (summary)

| Topic | Choice |
|-------|--------|
| Template depth | Practical starter (thin agent layer) |
| Auth | Better Auth, Google OAuth only |
| CF resources (initial) | Workers ×2, D1, R2, secrets/vars |
| Environments | Single prod + local dev |
| Sample features | Login + protected page showing `GET /api/v1/users/me` session/user/token summary |
| Repo shape | Monorepo: `frontend` / `backend` / `packages/api` / infra |
| API boundary | Separate Hono Worker; frontend uses Hono RPC |
| Edge routing | Same host `template.yumnumm.dev`: `/` → frontend, `/api/*` → backend + Service Binding |
| Rendering default | Hybrid (SSR shell; post-auth data mainly client RPC) |
| Secrets | sops + GCP KMS; encrypted file `.env.enc.json`; decrypt → Workers secrets |
| CI/CD | PR checks + Cloudflare deploy via GitHub OIDC |
| Quality gates | eqmonitor-like: gitleaks, pinact, zizmor, shellcheck via `hk` + CI |
| Docs / agents | Thin `AGENTS.md` + setup docs (eqmonitor-inspired, no Aegis) |

## Architecture

```
Browser (same-origin: `template.yumnumm.dev`)
  ├─ /        → frontend Worker (TanStack Start: SSR shell + UI)
  └─ /api/*   → backend Worker  (Hono: Better Auth, D1, R2 bindings)
                    ▲
                    │ Service Binding (SSR server → API)
                 frontend Worker
```

**Production hostname:** `template.yumnumm.dev` (Cloudflare zone route / custom domain). Local dev does not require this host.
### Responsibilities

| Unit | Does | Depends on |
|------|------|------------|
| `frontend/` | TanStack Start app, Tailwind v4, shadcn/ui, login UI, protected demo page | `packages/api`, CF bindings (service binding to backend) |
| `backend/` | Hono app, Better Auth (Google), Drizzle schema + D1, `GET /api/v1/users/me`, R2 binding wiring only | D1, R2, auth secrets |
| `packages/api/` | Re-export Hono `AppType` from `backend` and provide RPC client factory (browser + optional binding fetcher). Owns no CF runtime. | `backend` types only (workspace dep); must not pull Workers runtime into the client bundle |
| `infra/terraform/cloudflare/` | Workers, D1, R2, routes/path split, service binding, worker secrets wiring inputs | Cloudflare account |
| `infra/terraform/googlecloud/` | KMS key ring / crypto key for sops | GCP project |
| `infra/terraform/github/` | Repo secrets/vars, Environments, OIDC for Cloudflare + GCP deploy | GitHub repo |

### Rendering flexibility

TanStack Start stays on the frontend Worker only.

| Mode | Use |
|------|-----|
| Hybrid (default) | SSR for HTML shell / public pages; authenticated data via client RPC |
| CSR-heavy | Optional later for admin-like apps |
| SSR with data | Frontend server calls backend via Service Binding during render |

Initial sample stays hybrid with **client RPC for `GET /api/v1/users/me`**.

## Repository layout

```
/
├── frontend/                      # TanStack Start Worker
├── backend/                       # Hono Worker
├── packages/
│   └── api/                       # Hono RPC AppType + client
├── infra/
│   └── terraform/
│       ├── cloudflare/            # main.tf locals.tf backend.tf variables.tf provider.tf modules/*/*.tf
│       ├── googlecloud/           # same file set; KMS for sops
│       └── github/                # same file set; OIDC + Actions secrets/vars
├── docs/                          # setup: database, deployment, forking
├── AGENTS.md
├── mise.toml
├── hk.pkl
├── pnpm-workspace.yaml
├── turbo.json
├── .sops.yaml
├── .env.enc.json                  # sops-encrypted secrets (JSON)
├── .github/workflows/
├── .vscode/
└── .gitattributes
```

Workspace package names use a placeholder scope (e.g. `@front-template/*`) replaceable when forking.

**Not used:** `environments/production` nesting. Provider roots are flat under `infra/terraform/{cloudflare,googlecloud,github}/`.

## Toolchain

Aligned with eqmonitor-backend, adapted for this stack:

| Tool | Role |
|------|------|
| mise | Tool versions (`node`, `pnpm`, `hk`, `sops`, `opentofu`/`terraform`, `gcloud`, `gitleaks`, `pinact`, `zizmor`, `actionlint`, `shellcheck`, `pkl`, …) |
| pnpm | Package manager |
| turbo | `dev` / `build` / `check-types` / `test` task graph |
| hk | Git hooks (`hk.pkl`): gitleaks, pinact, zizmor, shellcheck, merge-conflict/symlink/private-key util checks |
| oxlint / oxfmt | Lint / format |
| TypeScript 7 (native) | Typecheck (`tsgo` / native `tsc` as pinned by mise) |
| vitest | Unit / light integration tests |
| `@cloudflare/vite-plugin` + wrangler | Local CF bindings + deploy |
| OpenTofu | IaC (via mise; directory name `terraform/` for familiarity) |

Package manager is **pnpm** (not Bun). Git hooks are **hk** (not lefthook).

## Auth & sample product surface

1. User opens login UI on `frontend`.
2. Better Auth client calls `/api/auth/*` on `backend` (same origin).
3. Google OAuth completes; session cookie set for `template.yumnumm.dev` (prod) or local origin.
4. Protected route redirects unauthenticated users to login.
5. Demo page calls RPC `GET /api/v1/users/me` (name fixed) and displays a JSON summary.

Google OAuth redirect / trusted origins include `https://template.yumnumm.dev` (and local dev origin).

**`GET /api/v1/users/me` response (explicit):** authenticated Better Auth session payload safe for the demo UI — at minimum `user` (`id`, `name`, `email`, `image`) and `session` (`id`, `expiresAt`, and session `token` if exposed by Better Auth’s server session API). No Google raw id_token juggling in v1 unless Better Auth already surfaces it on the session object; if not available, document that the page shows **session token + user**, which satisfies the “token info” demo intent.

API versioning: app routes live under `/api/v1/*`. Better Auth remains at `/api/auth/*` (library convention).

**Out of sample scope:** profile editing, avatar upload UI, email/password.

**R2:** binding exists on `backend` for future use; no upload/download sample API/UI in v1.

## Data flow & errors

| Layer | Behavior |
|-------|----------|
| backend | Hono typed routes; 401/403/404/500 consistent; Better Auth as source of session |
| frontend | Auth guard on protected routes; RPC failures → toast or inline error |
| SSR → API | Prefer Service Binding; avoid public URL + CORS for server-side calls |
| Local | turbo `dev` runs frontend + backend with local D1; R2 local as supported by wrangler |

### Testing (v1)

- `backend`: auth guard + `GET /api/v1/users/me` tests (Vitest)
- `frontend`: protected-route redirect / smoke tests
- **No E2E** in initial template

## Secrets

- `.sops.yaml` targets GCP KMS (key created by `infra/terraform/googlecloud`)
- Encrypted secrets file is **`.env.enc.json`** (JSON). Holds Better Auth secret, Google OAuth client id/secret, etc.
- Docs describe: `sops -d .env.enc.json` → `wrangler secret put` (or scripted equivalent)
- CI deploy uses OIDC → GCP to decrypt `.env.enc.json`, then deploy Workers with secrets applied (see CI/CD)

## CI/CD

### PR / push checks

- oxlint, oxfmt, typecheck, vitest (via turbo/pnpm)
- Workflow hygiene: **pinact**, **actionlint**, **zizmor** (eqmonitor-style)
- Secret scanning: **gitleaks** (hk pre-commit + CI)

### Deploy

- Trigger: `main` push and/or `workflow_dispatch`
- Auth: GitHub OIDC federated to Cloudflare (and GCP for sops decrypt) — provisioned by `infra/terraform/github` (+ related cloud trust config)
- Steps (conceptual): checkout → mise/pnpm → sops decrypt → build → deploy **backend** and **frontend** Workers → verify routes

Exact workflow file split can mirror eqmonitor’s “check vs deploy” separation during implementation planning.

## Infra (OpenTofu) detail

Each stack under `infra/terraform/<provider>/` contains at least:

- `main.tf`, `locals.tf`, `backend.tf`, `variables.tf`, `provider.tf`
- `modules/*/*.tf` as needed

### cloudflare

- Two Workers (frontend, backend)
- D1 database bound to backend
- R2 bucket bound to backend
- Route/path configuration on **`template.yumnumm.dev`**: `/` → frontend, `/api/*` → backend  
  - Path split requires this routable hostname (zone custom domain / route). Plain independent `*.workers.dev` URLs alone cannot express same-origin `/` + `/api/*` across two Workers.  
  - OpenTofu encodes `template.yumnumm.dev` (zone/account as variables or locals). Forking docs explain how to change the hostname. Local dev uses Vite/wrangler without needing that host.
- Service Binding: frontend → backend
- Inputs for secret names (values from sops/CI, not plaintext in state when avoidable)

### googlecloud

- KMS key ring + crypto key for sops
- Minimal IAM for CI OIDC decrypt principal

### github

- Repository Actions secrets/variables as required
- Environments if useful for deploy protection
- OIDC / workload identity style trust for Cloudflare + GCP deploy (eqmonitor-inspired “B” scope)

## Documentation & agent layer

**Include:**
- `AGENTS.md` — coding / monorepo conventions only (thin, eqmonitor-inspired tone)
- `docs/` — database setup, deployment (incl. sops + CI), forking/renaming checklist

**Exclude:**
- Aegis KB, imaimai-style review stamp commit gates, heavy agent eval harnesses

Optional light `.claude/` may be omitted in v1 unless needed for mise/hk parity; default is docs + `AGENTS.md` only.

## Out of scope (v1)

- Staging environment
- Email/password auth
- Avatar / R2 sample UI
- Queues, KV, Analytics scaffolds
- Aegis / strict agent commit pipeline
- E2E browser tests
- Changing production hostname away from `template.yumnumm.dev` without updating tofu + auth callback URLs (forking docs cover the rename)
- Independent dual `*.workers.dev` same-origin illusion (not supported; see cloudflare routes note)

## Success criteria

1. `mise install && pnpm install` then local `pnpm dev` serves app with CF bindings.
2. Google login works against local/prod backend; protected page shows session/token info via Hono RPC.
3. Production deploy serves `https://template.yumnumm.dev` with `/` and `/api/*` on the same origin.
4. `pnpm` check scripts + `hk` hooks catch format/lint/secret issues.
5. OpenTofu stacks apply for cloudflare / googlecloud / github (with documented prerequisites).
6. CI runs checks on PR; deploy workflow ships both Workers to Cloudflare via OIDC.
7. Forking docs explain renaming workspace scope, secrets, hostname, and Cloudflare/GCP/GitHub bootstrap.

## Implementation notes (non-binding)

- Prefer Hono RPC `AppType` exported through `packages/api` (Approach 1) over frontend importing `backend` directly.
- Keep frontend free of Drizzle/D1 imports.
- Match `app/admin` vite plugin order patterns where applicable (`cloudflare` + `tanstackStart` + react + tailwind).
- Use `mise exec --` for tools managed by mise (per team convention).
