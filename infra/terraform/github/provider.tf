terraform {
  required_version = ">= 1.8"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = split("/", local.github_repository)[0]
  token = var.GITHUB_TOKEN
}
