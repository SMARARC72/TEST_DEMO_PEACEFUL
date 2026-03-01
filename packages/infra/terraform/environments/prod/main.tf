# ------------------------------------------------------------------------------
# Prod Environment – Peacefull.ai (High Availability)
# ------------------------------------------------------------------------------

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  backend "s3" {
    bucket         = "peacefull-terraform-state"
    key            = "environments/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "peacefull-terraform-locks"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "peacefull-ai"
      Environment = "prod"
      ManagedBy   = "terraform"
      HIPAA       = "true"
    }
  }
}

locals {
  environment = "prod"
  app_name    = "peacefull"
}

# ------------------------------------------------------------------------------
# Variables for prod overrides
# ------------------------------------------------------------------------------

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "ECR image URI for the API"
  type        = string
}

variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
  default     = "api.peacefull.ai"
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS"
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# Modules
# ------------------------------------------------------------------------------

module "vpc" {
  source      = "../../modules/vpc"
  app_name    = local.app_name
  environment = local.environment
  vpc_cidr    = "10.0.0.0/16"
}

module "secrets" {
  source      = "../../modules/secrets"
  app_name    = local.app_name
  environment = local.environment
}

module "database" {
  source                  = "../../modules/database"
  app_name                = local.app_name
  environment             = local.environment
  private_subnet_ids      = module.vpc.private_subnet_ids
  rds_security_group_id   = module.vpc.rds_security_group_id
  redis_security_group_id = module.vpc.redis_security_group_id
  db_instance_class       = "db.r6g.large"
  db_name                 = "peacefull"
  db_username             = "peacefull_admin"
  db_password             = var.db_password
  redis_node_type         = "cache.r6g.large"
  multi_az                = true
}

module "storage" {
  source              = "../../modules/storage"
  app_name            = local.app_name
  environment         = local.environment
  domain_name         = var.domain_name
  acm_certificate_arn = var.acm_certificate_arn
  cors_origins        = ["https://${var.domain_name}"]
}

module "ecs" {
  source                  = "../../modules/ecs"
  app_name                = local.app_name
  environment             = local.environment
  vpc_id                  = module.vpc.vpc_id
  public_subnet_ids       = module.vpc.public_subnet_ids
  private_subnet_ids      = module.vpc.private_subnet_ids
  alb_security_group_id   = module.vpc.alb_security_group_id
  ecs_security_group_id   = module.vpc.ecs_security_group_id
  container_image         = var.container_image
  cpu                     = 1024
  memory                  = 2048
  desired_count           = 3
  secret_arns             = module.secrets.secret_arns_list
  kms_key_arn             = module.secrets.kms_key_arn
  database_url_secret_arn = module.secrets.secret_arns.database_url
  anthropic_api_key_arn   = module.secrets.secret_arns.anthropic_api_key
  jwt_secret_arn          = module.secrets.secret_arns.jwt_secret
  jwt_refresh_secret_arn  = module.secrets.secret_arns.jwt_refresh_secret
  encryption_key_arn              = module.secrets.secret_arns.encryption_key
  auth0_domain_secret_arn         = module.secrets.secret_arns.auth0_domain
  auth0_client_id_secret_arn      = module.secrets.secret_arns.auth0_client_id
  auth0_client_secret_secret_arn  = module.secrets.secret_arns.auth0_client_secret
  auth0_audience                  = "https://api.peacefull.ai"
  s3_uploads_bucket               = module.storage.uploads_bucket_name
  redis_url                       = "redis://${module.database.redis_endpoint}:${module.database.redis_port}"
  uploads_bucket_arn              = module.storage.uploads_bucket_arn
  acm_certificate_arn             = var.acm_certificate_arn
  cors_origin                     = "https://${var.domain_name}"
}

module "monitoring" {
  source           = "../../modules/monitoring"
  app_name         = local.app_name
  environment      = local.environment
  alert_email      = var.alert_email
  alb_arn_suffix   = module.ecs.alb_arn
  ecs_cluster_name = module.ecs.ecs_cluster_name
  ecs_service_name = module.ecs.ecs_service_name
  rds_instance_id  = "${local.app_name}-${local.environment}-postgres"
  redis_cluster_id = "${local.app_name}-${local.environment}-redis"
}

module "waf" {
  source      = "../../modules/waf"
  app_name    = local.app_name
  environment = local.environment
  alb_arn     = module.ecs.alb_arn

  # HIPAA: US-only geo-restriction for production
  geo_restrict          = true
  allowed_country_codes = ["US"]

  # Allow larger bodies for clinical note submissions
  max_body_size_bytes = 32768  # 32 KB

  # 90-day WAF log retention for compliance
  log_retention_days = 90
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------

output "alb_dns" {
  value = module.ecs.alb_dns
}

output "ecr_repository_url" {
  value = module.ecs.ecr_repository_url
}

output "cloudfront_domain" {
  value = module.storage.cloudfront_domain
}

output "cloudfront_distribution_id" {
  value = module.storage.cloudfront_distribution_id
}

output "rds_endpoint" {
  value     = module.database.db_endpoint
  sensitive = true
}

output "waf_web_acl_arn" {
  value = module.waf.web_acl_arn
}

output "waf_log_group" {
  value = module.waf.waf_log_group_name
}
