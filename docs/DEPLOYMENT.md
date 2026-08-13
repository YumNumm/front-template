# Deployment

Production serves the frontend and API from `https://template.yumnumm.dev`. Cloudflare routes `/api/*` to `front-template-api` and all other paths to `front-template-web`.

## Prerequisites

- Access to the Google Cloud project and the `yumnumm.dev` Cloudflare zone
- Google Cloud Application Default Credentials for OpenTofu
- `CLOUDFLARE_API_TOKEN` and `TF_VAR_cloudflare_account_id` / `TF_VAR_zone_id`
- `TF_VAR_GITHUB_TOKEN` with repository administration access
- Tools installed with `mise install`

## Provision infrastructure

Apply the OpenTofu stacks in this order:

1. `infra/terraform/googlecloud` creates the KMS key, GitHub Actions workload identity provider, and deploy service account.
2. `infra/terraform/cloudflare` creates D1, R2, DNS, and Worker routes.
3. `infra/terraform/github` writes `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` repository variables and creates the `production` environment.

For each stack:

```bash
cd infra/terraform/<stack>
mise exec -- tofu init
mise exec -- tofu plan
mise exec -- tofu apply
```

The Cloudflare routes reference `front-template-api` and `front-template-web` by name. On a fresh account, the first Cloudflare apply may create D1 and R2 but stop when it cannot attach routes to Workers that do not exist yet. Use the created D1 ID in `backend/wrangler.jsonc`, deploy both Workers once, and rerun the Cloudflare apply to attach the routes.

Before the production deploy, also change `BETTER_AUTH_URL` in `backend/wrangler.jsonc` from the local default to `https://template.yumnumm.dev`.

## Encrypt deployment secrets

Only generate `.env.enc.json` after the Google Cloud stack has created KMS. Copy the example to an ignored plaintext file, fill in real values, and encrypt it:

```bash
cp .env.json.example .env.json
mise exec -- sops --encrypt .env.json > .env.enc.json
rm .env.json
```

`.sops.yaml` must reference the KMS resource ID output by the Google Cloud stack. Commit `.env.enc.json`; never commit the plaintext `.env.json`.

The encrypted JSON contains `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. The deploy workflow decrypts it using GitHub OIDC and uploads the values with `wrangler secret bulk`.

## Google OAuth

Create a Web application OAuth client in Google Cloud and configure this authorized redirect URI exactly:

```text
https://template.yumnumm.dev/api/auth/callback/google
```

Put its client ID and secret in the encrypted deployment secrets. If the hostname changes, update the OAuth redirect URI and the application's production trusted origin.

## CI deployment

Pushes to `main` and manual workflow dispatches run `.github/workflows/deploy.yml`. The workflow:

1. authenticates to Google Cloud with `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT`;
2. decrypts `.env.enc.json` and uploads backend secrets;
3. applies remote D1 migrations to `front-template-db`;
4. deploys `front-template-api`, then `front-template-web`.

Configure `CLOUDFLARE_API_TOKEN` as a secret in the `production` GitHub environment. The token needs permission to deploy Workers and update the bound Cloudflare resources.
