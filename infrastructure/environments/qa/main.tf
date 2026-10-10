module "core" {
  source = "../../modules/core"

  project_id     = var.project_id
  environment    = "qa"
  region         = var.region
  service_name   = var.service_name
  admin_password = var.admin_password
}

# -----------------------------------------------------------------------------
# Declarative Imports
# Imports existing Firestore database and Identity Platform into state if already enabled in GCP
# -----------------------------------------------------------------------------
import {
  to = module.core.google_firestore_database.database
  id = "(default)"
}

import {
  to = module.core.google_identity_platform_config.default
  id = "projects/peasants-running-kit-qa/config"
}

