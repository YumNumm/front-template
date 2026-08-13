output "sops_kms_resource_id" {
  description = "Full Cloud KMS crypto key resource ID for sops."
  value       = google_kms_crypto_key.sops.id
}

output "workload_identity_provider" {
  description = "Full resource name of the Workload Identity Provider for GitHub Actions."
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_actions.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_actions.workload_identity_pool_provider_id}"
}

output "service_account_email" {
  description = "Email of the GitHub Actions service account."
  value       = google_service_account.github_actions.email
}
