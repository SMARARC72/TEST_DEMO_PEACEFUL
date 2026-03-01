# ------------------------------------------------------------------------------
# WAF Module Variables
# ------------------------------------------------------------------------------

variable "app_name" {
  description = "Application name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the ALB to protect with WAF"
  type        = string
}

variable "geo_restrict" {
  description = "Enable geographic restriction (US-only for HIPAA)"
  type        = bool
  default     = false
}

variable "allowed_country_codes" {
  description = "Country codes allowed when geo_restrict is enabled"
  type        = list(string)
  default     = ["US"]
}

variable "max_body_size_bytes" {
  description = "Maximum request body size in bytes (default 16KB)"
  type        = number
  default     = 16384
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}
