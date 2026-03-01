terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.34"
    }
  }

  backend "s3" {
    bucket         = "peacefull-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "peacefull-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "peacefull-ai"
      Environment = var.environment
      ManagedBy   = "terraform"
      HIPAA       = "true"
    }
  }
}
