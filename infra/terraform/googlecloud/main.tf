resource "google_project_service" "cloud_kms" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  disable_on_destroy = false
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
