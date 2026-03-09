# AWS Deployment Guide — Peacefull.ai

## Prerequisites

| Tool       | Version | Notes                                     |
|------------|---------|-------------------------------------------|
| AWS CLI    | v2+     | `aws sts get-caller-identity` must work   |
| Terraform  | ≥ 1.7   | `terraform -version`                      |
| Docker     | 20+     | For local builds                          |
| Node.js    | 22      | API & frontend builds                     |
| Git        | 2+      | Source control                            |

Required AWS IAM permissions:
- `AdministratorAccess` (for bootstrap) or scoped to: VPC, ECS, ECR, RDS, ElastiCache, S3, CloudFront, WAF, KMS, Secrets Manager, CloudWatch, SNS, DynamoDB, IAM roles

---

## Architecture Overview

```
┌───────────────┐     ┌──────────────┐     ┌───────────────┐
│   CloudFront  │────▸│     ALB      │────▸│  ECS Fargate  │
│   (Static)    │     │  (HTTPS/443) │     │  (API × N)    │
└───────────────┘     └──────────────┘     └───────┬───────┘
                                                   │
                                     ┌─────────────┼─────────────┐
                                     │             │             │
                              ┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
                              │  RDS Postgres│ │ Redis  │ │ S3 Uploads  │
                              │  (16, enc)   │ │ (7.0)  │ │ (AES-256)   │
                              └─────────────┘  └────────┘ └─────────────┘
```

- **VPC**: 3 AZs, public + private subnets, NAT gateway, VPC flow logs
- **ECS**: Fargate tasks running `node:22-alpine` API container
- **RDS**: PostgreSQL 16, encrypted at rest (KMS), automated backups
- **ElastiCache**: Redis 7.0 for session/rate-limit cache
- **S3 + CloudFront**: Static frontend + encrypted uploads
- **WAF**: 6 rules (rate limit, SQL injection, XSS, geo-block, IP reputation, known bad inputs)
- **Secrets Manager**: 8 secrets (DB URL, JWT, API keys, Auth0, encryption key)
- **Monitoring**: CloudWatch dashboards, SNS alerts, Container Insights

---

## Step 1 — Bootstrap (ONE TIME)

Create the S3 bucket for Terraform state and DynamoDB lock table:

```bash
cd packages/infra/scripts
chmod +x bootstrap-aws.sh
export AWS_REGION=us-east-1
./bootstrap-aws.sh
```

This creates:
- `peacefull-terraform-state` — versioned, KMS-encrypted S3 bucket
- `peacefull-terraform-locks` — DynamoDB table for state locking

---

## Step 2 — Configure Secrets

Before deploying, populate AWS Secrets Manager. The Terraform `secrets` module creates the secret resources, but you must set their values manually:

```bash
# After terraform apply, set each secret:
aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-database-url \
  --secret-string "postgresql://user:pass@host:5432/peacefull?sslmode=require"

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-jwt-secret \
  --secret-string "$(openssl rand -base64 48)"

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-jwt-refresh-secret \
  --secret-string "$(openssl rand -base64 48)"

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-encryption-key \
  --secret-string "$(openssl rand -hex 32)"

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-anthropic-api-key \
  --secret-string "sk-ant-..."

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-auth0-domain \
  --secret-string "peacefull-dev.auth0.com"

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-auth0-client-id \
  --secret-string "..."

aws secretsmanager put-secret-value \
  --secret-id peacefull-dev-auth0-client-secret \
  --secret-string "..."
```

---

## Step 3 — Deploy Dev Environment

```bash
cd packages/infra/terraform/environments/dev

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with real values

# Initialize
terraform init

# Plan (review changes)
terraform plan -out=plan.tfplan

# Apply
terraform apply plan.tfplan
```

Outputs to note:
- `alb_dns` — API load balancer DNS
- `ecr_repository_url` — Container registry for CI/CD
- `cloudfront_domain` — Static asset CDN domain
- `rds_endpoint` — Database endpoint (sensitive)

---

## Step 4 — Build & Push Docker Image (first time)

```bash
# Get ECR URL from terraform output
ECR_URL=$(cd packages/infra/terraform/environments/dev && terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL

# Build
docker build -t $ECR_URL:latest -f packages/infra/docker/Dockerfile .

# Push
docker push $ECR_URL:latest

# Force ECS to pull new image
aws ecs update-service \
  --cluster peacefull-dev-cluster \
  --service peacefull-dev-api-service \
  --force-new-deployment
```

After first push, subsequent deployments are handled by the CD pipeline (`.github/workflows/cd.yml`).

---

## Step 5 — Run Database Migrations

SSH into the ECS task or use a bastion host to run migrations:

```bash
# Option A: ECS Exec (recommended)
aws ecs execute-command \
  --cluster peacefull-dev-cluster \
  --task <TASK_ID> \
  --container api \
  --interactive \
  --command "npx prisma migrate deploy"

# Option B: Run locally against the RDS endpoint (requires VPN/bastion)
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Step 6 — Verify Deployment

```bash
# Get ALB DNS
ALB_DNS=$(cd packages/infra/terraform/environments/dev && terraform output -raw alb_dns)

# Health check
curl https://$ALB_DNS/health
# Expected: {"status":"ok","version":"...","environment":"dev"}

# Readiness check
curl https://$ALB_DNS/ready
# Expected: {"status":"ready","database":"connected","uptime":...}
```

---

## Environment Matrix

| Setting             | Dev              | Staging          | Prod              |
|---------------------|------------------|------------------|--------------------|
| VPC CIDR            | 10.2.0.0/16      | 10.1.0.0/16      | 10.0.0.0/16        |
| DB Instance         | db.t3.medium     | db.t3.medium     | db.r6g.large       |
| ECS CPU/Memory      | 512/1024         | 1024/2048        | 1024/2048          |
| ECS Desired Count   | 1                | 2                | 3                  |
| Multi-AZ DB         | No               | No               | Yes                |
| WAF                 | No               | No               | Yes                |
| Redis               | cache.t3.micro   | cache.t3.small   | cache.r6g.large    |

---

## CI/CD Pipeline

The project has two GitHub Actions workflows:

1. **CI** (`.github/workflows/ci.yml`): Triggered on push to `main`/`develop` and PRs
   - Lint & type-check (prototype + API + ML pipeline)
   - Unit tests (vitest)
   - Build prototype (artifact upload)
   - Security scan (npm audit + CodeQL)
   - API integration test (start server, check /health)

2. **CD** (`.github/workflows/cd.yml`): Triggered after CI passes on `main`
   - Build Docker image → push to ECR
   - Update ECS task definition → deploy to ECS Fargate
   - Wait for service stability
   - Deploy prototype to Netlify

### Required GitHub Secrets

| Secret                 | Source                           |
|------------------------|----------------------------------|
| `AWS_DEPLOY_ROLE_ARN`  | IAM role with OIDC trust policy  |
| `DATABASE_URL`         | From Terraform output            |
| `DIRECT_DATABASE_URL`  | Direct (non-pooled) DB URL       |
| `ANTHROPIC_API_KEY`    | Anthropic dashboard              |
| `NETLIFY_AUTH_TOKEN`   | Netlify personal access token    |
| `NETLIFY_SITE_ID`      | Netlify site settings            |

---

## Tear Down

```bash
# DANGER: Destroys all resources in the environment
cd packages/infra/terraform/environments/dev
terraform destroy
```

---

## Troubleshooting

| Issue                          | Resolution                                |
|--------------------------------|-------------------------------------------|
| `terraform init` fails         | Run `bootstrap-aws.sh` first              |
| ECS tasks keep restarting      | Check CloudWatch logs: `/ecs/peacefull-dev/api` |
| DB connection refused          | Verify security groups allow ECS → RDS    |
| Docker build fails             | Ensure `.dockerignore` is in build context |
| Secrets Manager empty          | Manually set values per Step 2            |
| WAF blocking requests          | Check WAF logs in CloudWatch              |
