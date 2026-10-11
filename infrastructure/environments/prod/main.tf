module "core" {
  source = "../../modules/core"

  project_id     = var.project_id
  environment    = "production"
  region         = var.region
  service_name   = var.service_name
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

# -----------------------------------------------------------------------------
# State Migration (Moved Blocks)
# Migrates existing production state resources from root to module.core without recreation
# -----------------------------------------------------------------------------
moved {
  from = google_project_service.run_api
  to   = module.core.google_project_service.run_api
}

moved {
  from = google_project_service.artifactregistry_api
  to   = module.core.google_project_service.artifactregistry_api
}

moved {
  from = google_project_service.firebase_api
  to   = module.core.google_project_service.firebase_api
}

moved {
  from = google_project_service.firebase_hosting_api
  to   = module.core.google_project_service.firebase_hosting_api
}

moved {
  from = google_project_service.firestore_api
  to   = module.core.google_project_service.firestore_api
}

moved {
  from = google_project_service.identitytoolkit_api
  to   = module.core.google_project_service.identitytoolkit_api
}

import {
  to = module.core.google_firestore_database.database
  id = "(default)"
}

import {
  to = module.core.google_identity_platform_config.default
  id = "projects/peasants-running-kit/config"
}


moved {
  from = google_artifact_registry_repository.store_repo
  to   = module.core.google_artifact_registry_repository.store_repo
}

moved {
  from = google_cloud_run_v2_service.api
  to   = module.core.google_cloud_run_v2_service.api
}

moved {
  from = google_cloud_run_v2_service_iam_member.public_api_access
  to   = module.core.google_cloud_run_v2_service_iam_member.public_api_access
}

moved {
  from = google_firebase_project.default
  to   = module.core.google_firebase_project.default
}

moved {
  from = google_firebase_hosting_site.primary
  to   = module.core.google_firebase_hosting_site.primary
}

moved {
  from = google_firebase_web_app.web_app
  to   = module.core.google_firebase_web_app.web_app
}

