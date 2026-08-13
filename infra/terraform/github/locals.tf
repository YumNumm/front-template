locals {
  github_repository = "YumNumm/front-template"

  github_actions_variables = {
    WIF_PROVIDER = {
      value = data.terraform_remote_state.googlecloud.outputs.workload_identity_provider
    }
    WIF_SERVICE_ACCOUNT = {
      value = data.terraform_remote_state.googlecloud.outputs.service_account_email
    }
  }
}
