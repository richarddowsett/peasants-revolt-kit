variable "project_id" {
  type        = string
  default     = "peasants-running-kit"
  description = "GCP Project ID for Production"
}

variable "region" {
  type        = string
  default     = "europe-west2"
  description = "GCP Region"
}

variable "domain_name" {
  type        = string
  default     = "peasants-running-kit.store"
  description = "Custom domain name registered on GoDaddy"
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
