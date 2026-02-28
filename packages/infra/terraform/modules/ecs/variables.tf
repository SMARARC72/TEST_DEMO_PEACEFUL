variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "container_image" {
  description = "Docker image URI for the API container"
  type        = string
}

variable "cpu" {
  description = "CPU units for the Fargate task"
  type        = number
  default     = 512
}

variable "memory" {
  description = "Memory (MiB) for the Fargate task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "secret_arns" {
  description = "List of Secrets Manager ARNs the task is allowed to read"
  type        = list(string)
}

variable "kms_key_arn" {
  description = "ARN of the KMS key used to encrypt secrets"
  type        = string
}

variable "database_url_secret_arn" {
  description = "ARN of the DATABASE_URL secret"
  type        = string
}

variable "anthropic_api_key_arn" {
  description = "ARN of the ANTHROPIC_API_KEY secret"
  type        = string
}

variable "jwt_secret_arn" {
  description = "ARN of the JWT_SECRET secret"
  type        = string
}

variable "jwt_refresh_secret_arn" {
  description = "ARN of the JWT_REFRESH_SECRET secret"
  type        = string
}

variable "encryption_key_arn" {
  description = "ARN of the ENCRYPTION_KEY secret"
  type        = string
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
}

variable "cors_origin" {
  description = "Allowed CORS origin"
  type        = string
  default     = "*"
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS (empty to skip)"
  type        = string
  default     = ""
}

variable "uploads_bucket_arn" {
  description = "ARN of the uploads S3 bucket"
  type        = string
}

variable "alb_logs_bucket" {
  description = "S3 bucket name for ALB access logs (empty to disable)"
  type        = string
  default     = ""
}
