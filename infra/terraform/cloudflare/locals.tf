locals {
  worker_names = {
    web = "front-template-web"
    api = "front-template-api"
  }

  storage_names = {
    d1 = "front-template-db"
    r2 = "front-template-avatars"
  }

  binding_names = {
    api_database       = "DB"
    api_avatars_bucket = "AVATARS_BUCKET"
    web_backend        = "BACKEND"
  }

  worker_routes = {
    web = {
      pattern = "${var.hostname}/*"
      script  = local.worker_names.web
    }
    api = {
      pattern = "${var.hostname}/api/*"
      script  = local.worker_names.api
    }
  }
}
