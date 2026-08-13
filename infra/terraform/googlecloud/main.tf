resource "google_project_service" "cloud_kms" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "workload_identity" {
  for_each = toset([
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_kms_key_ring" "sops" {
  project  = var.project_id
  name     = local.key_ring_name
  location = var.location

  depends_on = [google_project_service.cloud_kms]
}

resource "google_kms_crypto_key" "sops" {
  name            = local.crypto_key_name
  key_ring        = google_kms_key_ring.sops.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = local.github_actions_service_account_id
  display_name = "GitHub Actions"
  description  = "Service account for GitHub Actions via Workload Identity Federation"
}

resource "google_iam_workload_identity_pool" "github_actions" {
  project                   = var.project_id
  workload_identity_pool_id = local.workload_identity_pool_id
  display_name              = "GitHub Actions"
  description               = "Workload Identity Pool for GitHub Actions"

  depends_on = [google_project_service.workload_identity]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = local.workload_identity_provider_id
  display_name                       = "GitHub Actions"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == \"${local.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_actions_workload_identity_user" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_actions.workload_identity_pool_id}/attribute.repository/${local.github_repository}"
}

resource "google_kms_crypto_key_iam_member" "github_actions_decrypter" {
  crypto_key_id = google_kms_crypto_key.sops.id
  role          = "roles/cloudkms.cryptoKeyDecrypter"
  member        = "serviceAccount:${google_service_account.github_actions.email}"
}
