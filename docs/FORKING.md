# Forking checklist

Replace the template identifiers before using this repository for another application.

## Packages and Workers

- Rename the `@front-template/*` workspace scope in package manifests and TypeScript imports.
- Run `mise exec -- pnpm install` to regenerate workspace lockfile references; do not edit the lockfile manually.
- Rename `front-template-web` and `front-template-api` in both Wrangler configs and `infra/terraform/cloudflare/locals.tf`.
- Rename `front-template-db` and `front-template-avatars` in the backend Wrangler config, backend database scripts, deployment workflow, and Cloudflare locals.
- Keep the frontend `BACKEND` service binding aligned with the renamed API Worker.

## Hostname and authentication

- Set the new default hostname and zone description in `infra/terraform/cloudflare/variables.tf`.
- Update the production trusted origin in `backend/src/lib/auth.ts`.
- Register `https://<hostname>/api/auth/callback/google` in the Google OAuth Web application.
- Replace references to `template.yumnumm.dev` in documentation and operational configuration.

Local development remains on frontend port 3000 and backend port 8787 unless you deliberately change their scripts.

## Google Cloud KMS and state

- Replace the Google Cloud project and GitHub repository values in `infra/terraform/googlecloud/locals.tf`.
- Review the KMS key ring, service account, workload identity pool, and state bucket/prefix names.
- Apply `infra/terraform/googlecloud` before generating encrypted secrets.
- Replace the KMS resource ID in `.sops.yaml` with the `sops_kms_resource_id` output.
- Generate a new `.env.enc.json` from `.env.json.example`; ciphertext from the template KMS key is not portable to a fork.
- Update the Google Cloud and GitHub remote-state bucket/prefix configuration to avoid sharing template state.

## Cloudflare and GitHub

- Use the fork's Cloudflare account ID, zone ID, hostname, Worker names, D1 name, and R2 name.
- Change `github_repository` in `infra/terraform/github/locals.tf`.
- Update the GitHub stack's Google Cloud remote-state location.
- Apply the GitHub stack to create repository variables `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` and the `production` environment.
- Add `CLOUDFLARE_API_TOKEN` as a secret in the `production` environment.
- Check the Google workload identity condition targets the fork's `owner/repository`.

Finally, follow [Deployment](DEPLOYMENT.md) in the required Google Cloud → Cloudflare → GitHub order and run the full repository checks:

```bash
mise exec -- pnpm check
```
