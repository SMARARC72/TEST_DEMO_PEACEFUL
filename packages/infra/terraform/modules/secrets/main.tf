terraform {
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
    }
  }
}

# ------------------------------------------------------------------------------
# Secrets Module – AWS Secrets Manager + KMS
# ------------------------------------------------------------------------------

locals {
  secret_rotation_days_by_class = {
    critical = 30
    standard = 60
    baseline = 90
  }

  managed_secret_specs = {
    database_url = {
      name           = "database-url"
      rotation_class = "critical"
    }
    anthropic_api_key = {
      name           = "anthropic-api-key"
      rotation_class = "standard"
    }
    jwt_secret = {
      name           = "jwt-secret"
      rotation_class = "critical"
    }
    jwt_refresh_secret = {
      name           = "jwt-refresh-secret"
      rotation_class = "critical"
    }
    encryption_key = {
      name           = "encryption-key"
      rotation_class = "critical"
    }
    auth0_domain = {
      name           = "auth0-domain"
      rotation_class = "baseline"
    }
    auth0_client_id = {
      name           = "auth0-client-id"
      rotation_class = "baseline"
    }
    auth0_client_secret = {
      name           = "auth0-client-secret"
      rotation_class = "critical"
    }
  }

  rotatable_secret_names = toset([
    "database_url",
    "anthropic_api_key",
    "jwt_secret",
    "jwt_refresh_secret",
    "encryption_key",
    "auth0_client_secret"
  ])
}

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

resource "aws_secretsmanager_secret" "managed" {
  for_each = local.managed_secret_specs

  name       = "${var.app_name}/${var.environment}/${each.value.name}"
  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Name          = "${var.app_name}-${var.environment}-${each.value.name}"
    HIPAA         = "true"
    RotationClass = each.value.rotation_class
  }
}

# ------------------------------------------------------------------------------
# Secrets Rotation Lambda + IAM
# ------------------------------------------------------------------------------

data "archive_file" "secrets_rotation" {
  type        = "zip"
  output_path = "${path.module}/.artifacts/secrets-rotation.zip"

  source {
    content  = file("${path.module}/lambda/rotation_handler.py")
    filename = "rotation_handler.py"
  }
}

resource "aws_iam_role" "secrets_rotation_lambda" {
  name = "${var.app_name}-${var.environment}-secrets-rotation-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "secrets_rotation_lambda" {
  name = "${var.app_name}-${var.environment}-secrets-rotation"
  role = aws_iam_role.secrets_rotation_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = [for secret_name in local.rotatable_secret_names : aws_secretsmanager_secret.managed[secret_name].arn]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

resource "aws_lambda_function" "secrets_rotation" {
  function_name    = "${var.app_name}-${var.environment}-secrets-rotation"
  role             = aws_iam_role.secrets_rotation_lambda.arn
  runtime          = "python3.12"
  handler          = "rotation_handler.lambda_handler"
  filename         = data.archive_file.secrets_rotation.output_path
  source_code_hash = data.archive_file.secrets_rotation.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      APP_NAME    = var.app_name
      ENVIRONMENT = var.environment
    }
  }
}

resource "aws_lambda_permission" "allow_secret_rotation" {
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secrets_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

resource "aws_secretsmanager_secret_rotation" "managed" {
  for_each = local.rotatable_secret_names

  secret_id           = aws_secretsmanager_secret.managed[each.key].id
  rotation_lambda_arn = aws_lambda_function.secrets_rotation.arn

  rotation_rules {
    automatically_after_days = local.secret_rotation_days_by_class[local.managed_secret_specs[each.key].rotation_class]
  }

  lifecycle {
    precondition {
      condition = var.environment != "prod" ? true : contains(var.required_prod_rotation_secrets, each.key)
      error_message = "${each.key} must be declared in required_prod_rotation_secrets in prod."
    }
  }
}
