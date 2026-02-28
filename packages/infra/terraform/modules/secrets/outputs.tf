output "secret_arns" {
  description = "Map of secret ARNs"
  value = {
    database_url       = aws_secretsmanager_secret.database_url.arn
    anthropic_api_key  = aws_secretsmanager_secret.anthropic_api_key.arn
    jwt_secret         = aws_secretsmanager_secret.jwt_secret.arn
    jwt_refresh_secret = aws_secretsmanager_secret.jwt_refresh_secret.arn
    encryption_key     = aws_secretsmanager_secret.encryption_key.arn
    auth0_domain       = aws_secretsmanager_secret.auth0_domain.arn
    auth0_client_id    = aws_secretsmanager_secret.auth0_client_id.arn
    auth0_client_secret = aws_secretsmanager_secret.auth0_client_secret.arn
  }
}

output "secret_arns_list" {
  description = "List of all secret ARNs (for IAM policies)"
  value = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.anthropic_api_key.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.jwt_refresh_secret.arn,
    aws_secretsmanager_secret.encryption_key.arn,
    aws_secretsmanager_secret.auth0_domain.arn,
    aws_secretsmanager_secret.auth0_client_id.arn,
    aws_secretsmanager_secret.auth0_client_secret.arn,
  ]
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for secrets encryption"
  value       = aws_kms_key.secrets.key_id
}
