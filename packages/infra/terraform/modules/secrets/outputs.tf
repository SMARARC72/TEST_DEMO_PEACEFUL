output "secret_arns" {
  description = "Map of secret ARNs"
  value = {
    for secret_name, secret in aws_secretsmanager_secret.managed :
    secret_name => secret.arn
  }
}

output "secret_arns_list" {
  description = "List of all secret ARNs (for IAM policies)"
  value       = [for secret in aws_secretsmanager_secret.managed : secret.arn]
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for secrets encryption"
  value       = aws_kms_key.secrets.key_id
}

output "rotation_lambda_arn" {
  description = "ARN of the Secrets Manager rotation lambda"
  value       = aws_lambda_function.secrets_rotation.arn
}
