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
}

# Enable required GCP APIs
resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry_api" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase_api" {
  project            = var.project_id
  service            = "firebase.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase_hosting_api" {
  project            = var.project_id
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore_api" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage_api" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iamcredentials_api" {
  project            = var.project_id
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

# Provision Firestore NoSQL Database
resource "google_firestore_database" "database" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.region
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"

  depends_on = [google_project_service.firestore_api]
}

resource "google_project_service" "identitytoolkit_api" {
  project            = var.project_id
  service            = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

# Provision Identity Platform / Firebase Authentication
resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id

  sign_in {
    allow_duplicate_emails = false
    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [google_project_service.identitytoolkit_api]
}

# Artifact Registry Repository for storing backend container images
resource "google_artifact_registry_repository" "store_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = "peasants-running-kit"
  description   = "Docker repository for Peasants Running Kit backend API"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry_api]
}

# Fetch GCP project metadata
data "google_project" "project" {
  project_id = var.project_id
}

# Dedicated Google Cloud Storage Bucket for product images
resource "google_storage_bucket" "product_images" {
  name          = "${var.project_id}-product-images"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.storage_api]
}

# Allow public read access to uploaded product images
resource "google_storage_bucket_iam_member" "product_images_public_read" {
  bucket = google_storage_bucket.product_images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud Run Compute Service Account Storage Admin access on product images bucket
resource "google_storage_bucket_iam_member" "compute_sa_storage_admin" {
  bucket = google_storage_bucket.product_images.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Enable Google Cloud Secret Manager API
resource "google_project_service" "secretmanager_api" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Secret Manager Secret for Resend API Key (used for Christmas party ticket emails)
resource "google_secret_manager_secret" "resend_api_key" {
  project   = var.project_id
  secret_id = "resend-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

# Grant Cloud Run Compute Service Account access to read the Resend API Key secret
resource "google_secret_manager_secret_iam_member" "compute_sa_resend_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.resend_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Cloud Run Service for Hexagonal Backend API
resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.container_image

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

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "STORAGE_BUCKET"
        value = coalesce(var.storage_bucket, google_storage_bucket.product_images.name)
      }

      env {
        name  = "CHRISTMAS_EMAIL_FROM"
        value = var.environment == "qa" ? "Peasants Running Club <chrismaspartyqa@peasants-running-kit.store>" : "Peasants Running Club <christmas@peasants-running-kit.store>"
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

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
      client,
      client_version,
    ]
  }

  depends_on = [google_project_service.run_api, google_storage_bucket.product_images]
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

# Firebase Web App Registration
resource "google_firebase_web_app" "web_app" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Peasants Running Kit Web App (${var.environment})"

  depends_on = [google_firebase_project.default]
}

# Fetch Web App Config (includes API key, app ID, messaging sender ID, etc.)
data "google_firebase_web_app_config" "web_app_config" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.web_app.app_id
}
