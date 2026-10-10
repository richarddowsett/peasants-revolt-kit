variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. qa, production)"
}

variable "region" {
  type        = string
  default     = "europe-west2"
  description = "GCP Region"
}

variable "service_name" {
  type        = string
  default     = "peasants-running-kit-api"
  description = "Cloud Run service name"
}

variable "storage_bucket" {
  type        = string
  default     = null
  description = "Storage bucket name override for Firebase/GCS"
}

variable "admin_password" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Admin CMS authentication password override"
}

variable "container_image" {
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
  description = "Initial container image used to bootstrap Cloud Run (defaults to official public hello image; subsequent deployments are managed via CI/CD)"
}

variable "enable_identity_platform_config" {
  type        = bool
  default     = false
  description = "Whether to configure Identity Platform via Terraform (requires roles/identityplatform.admin; defaults to false so initial apply succeeds without permission errors)"
}
