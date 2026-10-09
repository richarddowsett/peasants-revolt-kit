output "cloud_run_backend_url" {
  description = "Cloud Run Backend API URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repo" {
  description = "Docker artifact repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest"
}

output "firebase_site_url" {
  description = "Default Firebase Hosting URL"
  value       = "https://${google_firebase_hosting_site.primary.site_id}.web.app"
}

output "apex_domain" {
  description = "Custom apex domain mapped on Firebase Hosting"
  value       = google_firebase_hosting_custom_domain.apex.custom_domain
}

output "www_domain" {
  description = "Custom www subdomain mapped on Firebase Hosting"
  value       = google_firebase_hosting_custom_domain.www.custom_domain
}

output "backend_docker_build_command" {
  description = "Command to build backend container for Cloud Run (linux/amd64) and push to GCP Artifact Registry"
  value       = "docker build --pull --no-cache --platform linux/amd64 -t ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest ../backend && docker push ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest"
}

output "backend_cloud_build_command" {
  description = "Alternative: Cloud Build command (builds directly on GCP x86_64 servers)"
  value       = "gcloud builds submit --tag ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.store_repo.repository_id}/backend-api:latest ../backend"
}
