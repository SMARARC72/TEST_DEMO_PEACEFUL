variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "cors_origins" {
  description = "List of allowed CORS origins for the uploads bucket"
  type        = list(string)
  default     = ["*"]
}

variable "domain_name" {
  description = "Custom domain name for CloudFront (leave empty to skip)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront HTTPS (empty to use default)"
  type        = string
  default     = ""
}
