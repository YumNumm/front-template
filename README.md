# front-template

TanStack Start frontend and Hono API on Cloudflare Workers.

## Quickstart

### Prerequisites

- [mise](https://mise.jdx.dev/)

### Setup

```bash
mise install
mise exec -- pnpm install
cp backend/.dev.vars.example backend/.dev.vars
# Fill in backend/.dev.vars (Google OAuth + Better Auth secret)
mise exec -- pnpm --filter @front-template/backend db:push:local
mise exec -- pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local ports

| Process | Port |
| --- | --- |
| Frontend (Vite) | 3000 |
| Backend (Wrangler) | 8787 |
| Browser origin | 3000 (`/api` proxied to backend) |

## Documentation

- [Getting started](docs/GETTING_STARTED.md)
- [Database setup](docs/DATABASE_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Forking checklist](docs/FORKING.md)
- [Agent guidelines](AGENTS.md)
