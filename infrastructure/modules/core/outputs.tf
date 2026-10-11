output "cloud_run_backend_url" {
  description = "Cloud Run Backend API URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repo" {
  description = "Docker artifact repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest"
}

output "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.store_repo.repository_id
}

output "firebase_site_url" {
  description = "Default Firebase Hosting URL"
  value       = "https://${google_firebase_hosting_site.primary.site_id}.web.app"
}

output "firebase_hosting_site_id" {
  description = "Firebase Hosting primary site ID"
  value       = google_firebase_hosting_site.primary.site_id
}

output "firebase_web_app_config" {
  description = "Firebase Web App Configuration (API Key, App ID, Auth Domain)"
  sensitive   = true
  value = {
    api_key             = data.google_firebase_web_app_config.web_app_config.api_key
    auth_domain         = data.google_firebase_web_app_config.web_app_config.auth_domain
    project_id          = var.project_id
    storage_bucket      = data.google_firebase_web_app_config.web_app_config.storage_bucket
    messaging_sender_id = data.google_firebase_web_app_config.web_app_config.messaging_sender_id
    app_id              = google_firebase_web_app.web_app.app_id
  }
}

output "firestore_database_name" {
  description = "Firestore NoSQL Database Name"
  value       = google_firestore_database.database.name
}

output "backend_docker_build_command" {
  description = "Command to build backend container for Cloud Run (linux/amd64) and push to GCP Artifact Registry"
  value       = "docker build --pull --no-cache --platform linux/amd64 -t ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest ../../backend && docker push ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest"
}

output "backend_cloud_build_command" {
  description = "Alternative: Cloud Build command (builds directly on GCP x86_64 servers)"
  value       = "gcloud builds submit --tag ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest ../../backend"
}

output "product_images_bucket" {
  description = "Name of dedicated GCS bucket for product images"
  value       = google_storage_bucket.product_images.name
}

