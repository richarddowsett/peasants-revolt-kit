output "cloud_run_backend_url" {
  description = "Cloud Run Backend API URL"
  value       = module.core.cloud_run_backend_url
}

output "artifact_registry_repo" {
  description = "Docker artifact repository path"
  value       = module.core.artifact_registry_repo
}

output "firebase_site_url" {
  description = "Default Firebase Hosting URL"
  value       = module.core.firebase_site_url
}

output "firebase_web_app_config" {
  description = "Firebase Web App Configuration (API Key, App ID, Auth Domain)"
  sensitive   = true
  value       = module.core.firebase_web_app_config
}

output "firestore_database_name" {
  description = "Firestore NoSQL Database Name"
  value       = module.core.firestore_database_name
}

output "backend_docker_build_command" {
  description = "Command to build backend container for Cloud Run (linux/amd64) and push to GCP Artifact Registry"
  value       = module.core.backend_docker_build_command
}

output "backend_cloud_build_command" {
  description = "Alternative: Cloud Build command (builds directly on GCP x86_64 servers)"
  value       = module.core.backend_cloud_build_command
}
