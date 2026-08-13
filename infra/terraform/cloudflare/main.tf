resource "cloudflare_d1_database" "app" {
  account_id = var.cloudflare_account_id
  name       = local.storage_names.d1
}

resource "cloudflare_r2_bucket" "avatars" {
  account_id = var.cloudflare_account_id
  name       = local.storage_names.r2
}

# Workers Routes require a proxied DNS record. The reserved address is never
# contacted because Cloudflare dispatches matching requests to the Workers.
resource "cloudflare_dns_record" "app" {
  zone_id = var.zone_id
  name    = var.hostname
  type    = "AAAA"
  content = "100::"
  proxied = true
  ttl     = 1
}

# Wrangler owns Worker scripts and their bindings. These routes attach to the
# existing scripts by name; deploy both Workers before the first tofu apply.
resource "cloudflare_workers_route" "app" {
  for_each = local.worker_routes

  zone_id = var.zone_id
  pattern = each.value.pattern
  script  = each.value.script

  depends_on = [cloudflare_dns_record.app]
}
