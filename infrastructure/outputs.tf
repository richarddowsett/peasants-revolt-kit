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

output "deploy_command" {
  description = "Command to deploy site files from app directory to Firebase Hosting"
  value       = "cd app && npx -y firebase-tools@latest deploy --only hosting --project ${var.project_id}"
}
