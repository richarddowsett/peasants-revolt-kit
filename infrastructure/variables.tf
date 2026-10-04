variable "project_id" {
  type        = string
  default     = "peasants-running-kit"
  description = "GCP Project ID"
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
  default     = "peasants-running-kit-store"
  description = "Cloud Run service name"
}
