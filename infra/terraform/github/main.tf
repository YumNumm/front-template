data "terraform_remote_state" "googlecloud" {
  backend = "gcs"

  config = {
    bucket = "home8s-terraform-state"
    prefix = "terraform/front-template/googlecloud/state"
  }
}

data "github_repository" "front_template" {
  full_name = local.github_repository
}

resource "github_actions_variable" "vars" {
  for_each = local.github_actions_variables

  repository    = data.github_repository.front_template.name
  variable_name = each.key
  value         = each.value.value
}

resource "github_repository_environment" "production" {
  repository  = data.github_repository.front_template.name
  environment = "production"
}
