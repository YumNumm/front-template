output "d1_database_id" {
  description = "D1 database ID for the backend DB binding."
  value       = cloudflare_d1_database.app.id
}

output "r2_bucket_name" {
  description = "R2 bucket name for the backend AVATARS_BUCKET binding."
  value       = cloudflare_r2_bucket.avatars.name
}

output "hostname" {
  description = "Hostname served by the Workers routes."
  value       = var.hostname
}

output "binding_names" {
  description = "Binding names configured in backend and frontend Wrangler files."
  value       = local.binding_names
}
