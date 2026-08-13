variable "project_id" {
  description = "Google Cloud project ID. Set with TF_VAR_project_id."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid Google Cloud project ID."
  }
}

variable "location" {
  description = "Google Cloud KMS location."
  type        = string
  default     = "global"

  validation {
    condition     = length(var.location) > 0
    error_message = "location must not be empty."
  }
}
