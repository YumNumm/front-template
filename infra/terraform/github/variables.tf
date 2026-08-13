variable "GITHUB_TOKEN" {
  description = "GitHub Personal Access Token with repository administration permissions. Set with TF_VAR_GITHUB_TOKEN."
  type        = string
  sensitive   = true
}
