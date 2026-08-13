locals {
  key_ring_name   = "front-template"
  crypto_key_name = "sops"

  sops_kms_resource_id = "projects/${var.project_id}/locations/${var.location}/keyRings/${local.key_ring_name}/cryptoKeys/${local.crypto_key_name}"
}
