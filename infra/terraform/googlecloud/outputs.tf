output "sops_kms_resource_id" {
  description = "Full Cloud KMS crypto key resource ID for sops."
  value       = google_kms_crypto_key.sops.id
}
