# ------------------------------------------------------------------------------
# Secrets Module – AWS Secrets Manager + KMS
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# KMS Key for Secrets Encryption
# ------------------------------------------------------------------------------

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager – ${var.app_name}-${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name  = "${var.app_name}-${var.environment}-secrets-kms"
    HIPAA = "true"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.app_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ------------------------------------------------------------------------------
# Secrets
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "database_url" {
  name       = "${var.app_name}/${var.environment}/database-url"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name  = "${var.app_name}-${var.environment}-database-url"
    HIPAA = "true"
  }
}

resource "aws_secretsmanager_secret_rotation" "database_url" {
  secret_id           = aws_secretsmanager_secret.database_url.id
  rotation_rules {
    automatically_after_days = 90
  }
}

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name       = "${var.app_name}/${var.environment}/anthropic-api-key"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name  = "${var.app_name}-${var.environment}-anthropic-api-key"
    HIPAA = "true"
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name       = "${var.app_name}/${var.environment}/jwt-secret"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name  = "${var.app_name}-${var.environment}-jwt-secret"
    HIPAA = "true"
  }
}

resource "aws_secretsmanager_secret_rotation" "jwt_secret" {
  secret_id           = aws_secretsmanager_secret.jwt_secret.id
  rotation_rules {
    automatically_after_days = 90
  }
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name       = "${var.app_name}/${var.environment}/jwt-refresh-secret"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name  = "${var.app_name}-${var.environment}-jwt-refresh-secret"
    HIPAA = "true"
  }
}

resource "aws_secretsmanager_secret_rotation" "jwt_refresh_secret" {
  secret_id           = aws_secretsmanager_secret.jwt_refresh_secret.id
  rotation_rules {
    automatically_after_days = 90
  }
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name       = "${var.app_name}/${var.environment}/encryption-key"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name  = "${var.app_name}-${var.environment}-encryption-key"
    HIPAA = "true"
  }
}

resource "aws_secretsmanager_secret_rotation" "encryption_key" {
  secret_id           = aws_secretsmanager_secret.encryption_key.id
  rotation_rules {
    automatically_after_days = 90
  }
}
