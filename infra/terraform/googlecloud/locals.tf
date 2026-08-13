locals {
  key_ring_name   = "front-template"
  crypto_key_name = "sops"

  github_repository                 = "YumNumm/front-template"
  github_actions_service_account_id = "github-actions-front-template"
  workload_identity_pool_id         = "github-actions-front-template"
  workload_identity_provider_id     = "github-actions-front-template"

  sops_kms_resource_id = "projects/${var.project_id}/locations/${var.location}/keyRings/${local.key_ring_name}/cryptoKeys/${local.crypto_key_name}"
}
