#!/usr/bin/env bash
# ─── Bootstrap AWS Infrastructure Prerequisites ──────────────────────
# Creates the S3 bucket for Terraform state and DynamoDB table for
# state locking. Run this ONCE before the first `terraform init`.
#
# Usage:
#   export AWS_PROFILE=peacefull   # or set AWS_ACCESS_KEY_ID/SECRET
#   ./bootstrap-aws.sh
#
# Requirements: aws-cli v2, appropriate IAM permissions.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STATE_BUCKET="peacefull-terraform-state"
LOCK_TABLE="peacefull-terraform-locks"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Peacefull.ai — AWS Bootstrap"
echo "  Account: $ACCOUNT_ID"
echo "  Region:  $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── S3 State Bucket ─────────────────────────────────────────────────

echo ""
echo "▸ Creating S3 bucket: $STATE_BUCKET"

if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  echo "  ✓ Bucket already exists"
else
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$REGION" \
    $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION")
  echo "  ✓ Bucket created"
fi

echo "▸ Enabling versioning on $STATE_BUCKET"
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

echo "▸ Enabling server-side encryption (AES-256)"
aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms"
      },
      "BucketKeyEnabled": true
    }]
  }'

echo "▸ Blocking public access"
aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "▸ Adding HIPAA tags"
aws s3api put-bucket-tagging \
  --bucket "$STATE_BUCKET" \
  --tagging 'TagSet=[{Key=Project,Value=peacefull-ai},{Key=HIPAA,Value=true},{Key=ManagedBy,Value=bootstrap-script}]'

# ─── DynamoDB Lock Table ─────────────────────────────────────────────

echo ""
echo "▸ Creating DynamoDB table: $LOCK_TABLE"

if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$REGION" 2>/dev/null | grep -q '"TableStatus": "ACTIVE"'; then
  echo "  ✓ Table already exists"
else
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" \
    --tags Key=Project,Value=peacefull-ai Key=HIPAA,Value=true Key=ManagedBy,Value=bootstrap-script

  echo "  ⏳ Waiting for table to become ACTIVE..."
  aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$REGION"
  echo "  ✓ Table created and active"
fi

# ─── Verify ──────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "    1. cd packages/infra/terraform/environments/dev"
echo "    2. terraform init"
echo "    3. terraform plan -var-file=dev.tfvars"
echo "    4. terraform apply -var-file=dev.tfvars"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
