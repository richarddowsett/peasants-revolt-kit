terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "peasants-running-kit-tfstate"
    prefix = "holding-page"
  }
}

provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

# Enable required GCP APIs
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase_api" {
  service            = "firebase.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase_hosting_api" {
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore_api" {
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "identitytoolkit_api" {
  service            = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

# Provision Identity Platform / Firebase Authentication
resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.identitytoolkit_api]
}

# Artifact Registry Repository for storing backend container images
resource "google_artifact_registry_repository" "store_repo" {
  location      = var.region
  repository_id = "peasants-running-kit"
  description   = "Docker repository for Peasants Running Kit backend API"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry_api]
}

# Cloud Run Service for Hexagonal Backend API
resource "google_cloud_run_v2_service" "api" {
  name     = "peasants-running-kit-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0 # Scales to 0 when idle ($0 cost when idle)
      max_instance_count = 10
    }
  }

  depends_on = [google_project_service.run_api]
}

# Allow public access to Cloud Run Backend API
resource "google_cloud_run_v2_service_iam_member" "public_api_access" {
  project  = google_cloud_run_v2_service.api.project
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Enable Firebase on the GCP project
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.firebase_api]
}

# Firebase Hosting Site
resource "google_firebase_hosting_site" "primary" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.project_id

  depends_on = [google_firebase_project.default]
}

# Firebase Hosting Custom Domain for Apex (peasants-running-kit.store)
resource "google_firebase_hosting_custom_domain" "apex" {
  provider      = google-beta
  project       = var.project_id
  site_id       = google_firebase_hosting_site.primary.site_id
  custom_domain = var.domain_name
}

# Firebase Hosting Custom Domain for www (www.peasants-running-kit.store)
resource "google_firebase_hosting_custom_domain" "www" {
  provider      = google-beta
  project       = var.project_id
  site_id       = google_firebase_hosting_site.primary.site_id
  custom_domain = "www.${var.domain_name}"
}

# Firebase Web App Registration
resource "google_firebase_web_app" "web_app" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Peasants Running Kit Web App"

  depends_on = [google_firebase_project.default]
}

# Fetch Web App Config (includes API key, app ID, messaging sender ID, etc.)
data "google_firebase_web_app_config" "web_app_config" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.web_app.app_id
}
