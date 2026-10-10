module "core" {
  source = "../../modules/core"

  project_id     = var.project_id
  environment    = "production"
  region         = var.region
  service_name   = var.service_name
  storage_bucket = "peasants-running-kit-holding-page"
  admin_password = var.admin_password
}

# Firebase Hosting Custom Domain for Apex (peasants-running-kit.store) - PRODUCTION ONLY
resource "google_firebase_hosting_custom_domain" "apex" {
  provider      = google-beta
  project       = var.project_id
  site_id       = module.core.firebase_hosting_site_id
  custom_domain = var.domain_name
}

# Firebase Hosting Custom Domain for www (www.peasants-running-kit.store) - PRODUCTION ONLY
resource "google_firebase_hosting_custom_domain" "www" {
  provider      = google-beta
  project       = var.project_id
  site_id       = module.core.firebase_hosting_site_id
  custom_domain = "www.${var.domain_name}"
}
