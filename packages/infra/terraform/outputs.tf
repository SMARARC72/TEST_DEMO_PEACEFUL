output "alb_dns" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.storage.cloudfront_domain
}

output "ecr_repository_url" {
  description = "ECR repository URL for API container images"
  value       = module.ecs.ecr_repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.db_endpoint
}
