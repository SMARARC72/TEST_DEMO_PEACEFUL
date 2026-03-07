variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "required_prod_rotation_secrets" {
  description = "Secrets that must have rotation enabled in production."
  type        = set(string)
  default = [
    "database_url",
    "anthropic_api_key",
    "jwt_secret",
    "jwt_refresh_secret",
    "encryption_key",
    "auth0_client_secret"
  ]
}
