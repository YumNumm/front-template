variable "cloudflare_account_id" {
  description = "Cloudflare account ID. Set with TF_VAR_cloudflare_account_id."
  type        = string

  validation {
    condition     = length(var.cloudflare_account_id) > 0
    error_message = "cloudflare_account_id must not be empty."
  }
}

variable "zone_id" {
  description = "Cloudflare zone ID for yumnumm.dev. Set with TF_VAR_zone_id."
  type        = string

  validation {
    condition     = length(var.zone_id) > 0
    error_message = "zone_id must not be empty."
  }
}

variable "hostname" {
  description = "Hostname served by the frontend and API Workers."
  type        = string
  default     = "template.yumnumm.dev"

  validation {
    condition     = can(regex("^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$", var.hostname))
    error_message = "hostname must be a valid lowercase DNS hostname."
  }
}
