output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "ARN of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "web_bucket_name" {
  description = "Name of the web assets S3 bucket"
  value       = aws_s3_bucket.web.id
}

output "uploads_logs_bucket_name" {
  description = "Name of the uploads access logs S3 bucket"
  value       = aws_s3_bucket.uploads_logs.id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = try(aws_cloudfront_distribution.web[0].id, null)
}

output "cloudfront_domain" {
  description = "Domain name of the CloudFront distribution"
  value       = try(aws_cloudfront_distribution.web[0].domain_name, null)
}
