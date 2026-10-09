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
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable Firebase & Firebase Hosting APIs
resource "google_project_service" "firebase_api" {
  service            = "firebase.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase_hosting_api" {
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
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
