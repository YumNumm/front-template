# Agent guidelines

Keep changes small and follow the existing package boundaries.

## Monorepo boundaries

- `frontend/` owns the TanStack Start UI and frontend Worker (`front-template-web`).
- `backend/` owns the Hono API, Better Auth, Drizzle schema and migrations, D1, and R2 (`front-template-api`).
- `packages/api/` exposes the typed Hono RPC client. It may import backend types only; it must not pull backend runtime code into the frontend.
- Do not import Drizzle, database schemas, or D1 access into `frontend/`.
- Put shared API contracts behind `packages/api/` rather than importing backend implementation details.

## Tooling

- Run repository tools through mise, for example `mise exec -- pnpm check`.
- Use pnpm only. Do not use npm, Yarn, Bun, bare `pnpm`, or `npx`.
- Change dependencies with `mise exec -- pnpm add`, `remove`, or their filtered forms; do not edit dependency ranges or the lockfile by hand.
- Prefer `mise exec -- pnpm --filter @front-template/<package> ...` for package-scoped work.

## Conventions

- Follow the existing TypeScript style and keep abstractions thin.
- Add comments only when intent is not evident from the code.
- Keep secrets out of plaintext tracked files. Production secrets belong in the sops-encrypted `.env.enc.json`.
- This repository does not use Aegis; do not add Aegis-specific configuration or workflows.
