module "core" {
  source = "../../modules/core"

  project_id     = var.project_id
  environment    = "qa"
  region         = var.region
  service_name   = var.service_name
  admin_password = var.admin_password
}
