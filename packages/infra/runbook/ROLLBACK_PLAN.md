# Rollback Plan — Peacefull.ai

**Last Updated:** 2026-03-02  
**Applies to:** Frontend (S3+CloudFront), Backend (ECS Fargate), Database (Neon PostgreSQL)

---

## 1. Frontend Rollback (S3 + CloudFront)

### Option A: Redeploy Previous Commit

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Check out and build
git checkout <good-commit-hash>
cd prototype-web && npm ci && npm run build

# 3. Sync to S3
aws s3 sync dist/ s3://peacefull-prod-web-<account-id>/ --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "assets/*"
aws s3 sync dist/assets/ s3://peacefull-prod-web-<account-id>/assets/ \
  --cache-control "public, max-age=31536000, immutable"

# 4. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/*"

# 5. Verify
curl -s -o /dev/null -w "%{http_code}" https://<cloudfront-url>/
```

### Option B: S3 Object Versioning Restore

S3 versioning is enabled on the web bucket.

```bash
# List object versions for index.html
aws s3api list-object-versions \
  --bucket peacefull-prod-web-<account-id> \
  --prefix index.html

# Copy previous version back as current
aws s3api copy-object \
  --bucket peacefull-prod-web-<account-id> \
  --copy-source peacefull-prod-web-<account-id>/index.html?versionId=<prev-version-id> \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/index.html"
```

### Option C: Netlify Instant Rollback (Staging)

Netlify keeps all deploy snapshots. Rollback from the Netlify dashboard:

1. Go to [Netlify Deploys](https://app.netlify.com/sites/peacefullai/deploys)
2. Click on the last working deploy
3. Click **"Publish deploy"**
4. Live in ~10 seconds

---

## 2. Backend Rollback (ECS Fargate)

### Option A: ECS Task Definition Revert

```bash
# 1. List recent task definitions
aws ecs list-task-definitions \
  --family-prefix peacefull-dev-api \
  --sort DESC \
  --max-items 5

# 2. Update service to use previous task definition
aws ecs update-service \
  --cluster peacefull-dev-cluster \
  --service peacefull-dev-api-service \
  --task-definition peacefull-dev-api:<previous-revision> \
  --force-new-deployment

# 3. Wait for stability
aws ecs wait services-stable \
  --cluster peacefull-dev-cluster \
  --services peacefull-dev-api-service

# 4. Verify health
curl -f https://<alb-dns>/health
```

### Option B: ECR Image Rollback

```bash
# 1. Find previous image tag
aws ecr describe-images \
  --repository-name peacefull-dev-api \
  --query 'imageDetails | sort_by(@, &imagePushedAt) | [-5:].[imageTags[0],imagePushedAt]' \
  --output table

# 2. Retag previous image as latest
MANIFEST=$(aws ecr batch-get-image \
  --repository-name peacefull-dev-api \
  --image-ids imageTag=<previous-tag> \
  --query 'images[0].imageManifest' --output text)

aws ecr put-image \
  --repository-name peacefull-dev-api \
  --image-tag latest \
  --image-manifest "$MANIFEST"

# 3. Force new deployment (picks up latest tag)
aws ecs update-service \
  --cluster peacefull-dev-cluster \
  --service peacefull-dev-api-service \
  --force-new-deployment
```

---

## 3. Database Rollback (Neon PostgreSQL)

### Option A: Neon Branch Point-in-Time Recovery

Neon supports branching from any point in time.

```bash
# Create a branch from before the bad migration
neon branches create \
  --project-id <project-id> \
  --name rollback-$(date +%Y%m%d) \
  --parent main \
  --restore-time "2026-03-01T12:00:00Z"

# Update connection string in Secrets Manager
aws secretsmanager update-secret \
  --secret-id peacefull/dev/database-url \
  --secret-string "postgresql://...@<new-branch-host>/neondb"
```

### Option B: Prisma Migration Revert

```bash
# View migration history
cd packages/api
npx prisma migrate status

# Roll back the last migration (manual SQL)
npx prisma migrate resolve --rolled-back <migration-name>

# Apply the revert SQL manually
psql $DATABASE_URL < prisma/migrations/<migration>/revert.sql
```

---

## 4. Feature Flag Emergency Kill Switch

Disable any feature instantly without redeployment:

```bash
# Set feature flag env var on Netlify (staging)
netlify env:set VITE_FF_PATIENT_CHAT false
netlify deploy --prod

# Set feature flag env var on S3 build (production)
# Re-run CD with updated env vars in GitHub repository variables
# Go to: Settings → Environments → production → Variables
# Set VITE_FF_PATIENT_CHAT=false
# Re-run the cd-frontend workflow
```

For runtime remote flags (if `VITE_FEATURE_FLAGS_URL` is configured):
Update the JSON config at the remote endpoint — changes take effect on next page load.

---

## 5. Communication Checklist

| Step | Action | Who |
|------|--------|-----|
| 1 | Detect incident (monitoring alert / user report) | On-call engineer |
| 2 | Assess severity (P0–P3) | On-call engineer |
| 3 | If P0/P1: Immediately execute rollback | On-call engineer |
| 4 | Notify #incidents Slack channel | On-call engineer |
| 5 | For clinical impact: notify clinical advisor | On-call engineer |
| 6 | Post-rollback: verify health + run smoke tests | On-call engineer |
| 7 | Write incident report (within 24h) | Team lead |
| 8 | Schedule post-mortem (within 48h) | Team lead |

---

## 6. Smoke Test After Rollback

```bash
# Frontend smoke
curl -s https://peacefullai.netlify.app/ | grep -q "Peacefull" && echo "✓ Frontend OK"

# API health
curl -f https://<api-url>/health && echo "✓ API OK"

# Database connectivity (via API)
curl -f https://<api-url>/ready && echo "✓ DB OK"

# Critical path: login
curl -X POST https://<api-url>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.local","password":"..."}' \
  -w "\nHTTP %{http_code}\n"
```

---

## Recovery Time Objectives

| Component | RTO | Method |
|-----------|-----|--------|
| Frontend (Netlify) | < 1 min | Netlify deploy rollback |
| Frontend (CloudFront) | < 5 min | S3 sync + cache invalidation |
| API (ECS) | < 10 min | Task definition revert |
| Database | < 15 min | Neon branch restore |
| Feature toggle | < 1 min | Env var update + redeploy or remote config |
