variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "peacefull"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "peacefull"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "peacefull_admin"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "ecs_api_cpu" {
  description = "CPU units for the API ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_api_memory" {
  description = "Memory (MiB) for the API ECS task"
  type        = number
  default     = 1024
}

variable "ecs_api_desired_count" {
  description = "Desired number of API ECS tasks"
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Custom domain name (leave empty to skip DNS/cert setup)"
  type        = string
  default     = ""
}

variable "anthropic_api_key_arn" {
  description = "ARN of the Anthropic API key stored in AWS Secrets Manager"
  type        = string
}

variable "container_image" {
  description = "ECR image URI for the API container"
  type        = string
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}
