variable "project_id" {
  type        = string
  default     = "peasants-running-kit-qa"
  description = "GCP Project ID for QA"
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

variable "admin_password" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Admin CMS authentication password override"
}
