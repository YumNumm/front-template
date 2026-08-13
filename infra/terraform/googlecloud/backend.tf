terraform {
  backend "gcs" {
    bucket = "home8s-terraform-state"
    prefix = "terraform/front-template/googlecloud/state"
  }
}
