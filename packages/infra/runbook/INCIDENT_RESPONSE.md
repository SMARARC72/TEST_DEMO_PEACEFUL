# Peacefull.ai — Incident Response Runbook

**Version:** 2.0  
**Date:** 2026-03-03  
**Classification:** Internal — DevOps / On-Call

## Production Environment Reference

| Resource | Value |
|----------|-------|
| **AWS Account** | `827202647693` |
| **Region** | `us-east-1` |
| **ECS Cluster** | `peacefull-prod-cluster` |
| **ECS Service** | `peacefull-prod-api` |
| **Container** | `api` |
| **ECR Repo** | `827202647693.dkr.ecr.us-east-1.amazonaws.com/peacefull-prod-api` |
| **RDS Instance** | `peacefull-prod-postgres.cwbc646w4005.us-east-1.rds.amazonaws.com` |
| **RDS SG** | `sg-0a6c11da4eb4c20bc` |
| **API URL** | `https://api.peacefull.cloud` |
| **Frontend** | `https://peacefullai.netlify.app` |
| **Auth0 Tenant** | `dev-tu36ndmyt7pr2coi.us.auth0.com` |
| **Auth0 Audience** | `https://api.peacefull.ai` |
| **Docker Build Flags** | `--platform linux/amd64 --provenance=false --sbom=false` |

---

## 1. On-Call Rotation

| Role | Primary | Secondary |
|------|---------|-----------|
| DevOps | TBD | TBD |
| Backend | TBD | TBD |
| Clinical Ops | TBD | TBD |

**Escalation chain:** PagerDuty → Slack #incidents → Phone tree

**Secrets rotation runbook:** `packages/infra/runbook/SECRETS_ROTATION.md`

---

## 2. Severity Levels

| Level | Definition | Response SLA | Resolution SLA |
|-------|-----------|--------------|----------------|
| **SEV-1** | Platform fully down OR PHI breach | 15 min | 1 hour |
| **SEV-2** | Critical feature broken (T2/T3 escalations not firing) | 30 min | 4 hours |
| **SEV-3** | Degraded performance or non-critical feature failure | 2 hours | 24 hours |
| **SEV-4** | Cosmetic issue or minor bug | Next business day | 1 week |

---

## 3. Incident Procedures

### 3.1 SEV-1: Platform Down

```bash
# 1. Check ECS service health
aws ecs describe-services \
  --cluster peacefull-prod-cluster \
  --services peacefull-prod-api \
  --query 'services[0].{desired:desiredCount,running:runningCount,status:status}'

# 2. Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn $TARGET_GROUP_ARN

# 3. Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier peacefull-prod-postgres \
  --query 'DBInstances[0].DBInstanceStatus'

# 4. Check recent deployments
aws ecs describe-services \
  --cluster peacefull-prod-cluster \
  --services peacefull-prod-api \
  --query 'services[0].deployments'

# 5. Rollback if recent deployment caused issue
aws ecs update-service \
  --cluster peacefull-prod-cluster \
  --service peacefull-prod-api \
  --task-definition $PREVIOUS_TASK_DEF_ARN \
  --force-new-deployment
```

### 3.2 SEV-1: PHI Breach

1. **Immediately** trigger HIPAA breach notification process
2. Revoke all active JWT tokens (flush Redis token store)
3. Rotate all secrets in AWS Secrets Manager
4. Enable forensic logging (set `log_statement = 'all'` on RDS)
5. Preserve all CloudWatch logs, WAF logs, audit trail
6. Contact legal counsel within 1 hour
7. Document timeline in incident report

```bash
# Revoke all sessions by rotating JWT secret
aws secretsmanager update-secret \
  --secret-id peacefull/prod/jwt-secret-5Ike7z \
  --generate-cli-json

# Force restart all ECS tasks to pick up new secret
aws ecs update-service \
  --cluster peacefull-prod-cluster \
  --service peacefull-prod-api \
  --force-new-deployment
```

### 3.3 Database Failover

```bash
# Check Multi-AZ status
aws rds describe-db-instances \
  --db-instance-identifier peacefull-prod-postgres \
  --query 'DBInstances[0].{MultiAZ:MultiAZ,AZ:AvailabilityZone,SecondaryAZ:SecondaryAvailabilityZone}'

# Initiate failover (automatic for Multi-AZ, manual trigger if needed)
aws rds reboot-db-instance \
  --db-instance-identifier peacefull-prod-postgres \
  --force-failover

# Verify new primary endpoint
aws rds describe-db-instances \
  --db-instance-identifier peacefull-prod-postgres \
  --query 'DBInstances[0].Endpoint'
```

### 3.4 T3 Escalation Delivery Failure

1. Check Twilio SMS delivery status in Twilio console
2. Check SES email bounce/complaint metrics in CloudWatch
3. Verify notification service logs: `aws logs filter-log-events --log-group-name /ecs/peacefull-prod --filter-pattern "escalation"`
4. If SMS gateway down: activate backup email-only path
5. If all channels down: manual phone call roster for active T3 patients

### 3.5 Secrets Rotation Failure

1. Check CloudWatch alarm `peacefull-prod-secrets-rotation-failures`.
2. Open `runbook/SECRETS_ROTATION.md` and execute investigation steps.
3. If JWT/Auth secret rotation is impacted, trigger ECS force deployment after promoting known-good version.
4. Escalate to SEV-2 if rotation cannot be restored in 30 minutes.

---

## 4. Database Backup & Restore

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier peacefull-prod-postgres \
  --query 'DBSnapshots[*].{id:DBSnapshotIdentifier,time:SnapshotCreateTime,status:Status}' \
  --output table

# Restore from snapshot (creates new instance)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier peacefull-prod-postgres-restored \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --db-instance-class db.r6g.large \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name peacefull-prod-db-subnet

# Point-in-time recovery (within backup retention window)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier peacefull-prod-postgres \
  --target-db-instance-identifier peacefull-prod-postgres-pitr \
  --restore-time "2026-02-28T12:00:00Z" \
  --db-instance-class db.r6g.large
```

**Recovery Time Objective (RTO):** < 1 hour  
**Recovery Point Objective (RPO):** < 5 minutes (continuous backup)

---

## 5. Deployment Procedure

```bash
# 1. Run full test suite
cd packages/api && npx vitest run

# 2. Build and push Docker image
docker build -t peacefull-api:$(git rev-parse --short HEAD) -f packages/infra/docker/Dockerfile .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
docker tag peacefull-api:$(git rev-parse --short HEAD) $ECR_REPO:$(git rev-parse --short HEAD)
docker push $ECR_REPO:$(git rev-parse --short HEAD)

# 3. Update ECS task definition
aws ecs update-service \
  --cluster peacefull-prod \
  --service peacefull-prod-api \
  --task-definition peacefull-prod-api:$NEW_REVISION \
  --force-new-deployment

# 4. Monitor deployment
aws ecs wait services-stable \
  --cluster peacefull-prod \
  --services peacefull-prod-api

# 5. Smoke test
curl -sf https://api.peacefull.cloud/health | jq .
```

---

## 6. Key Contacts

| Service | Dashboard | Support |
|---------|-----------|---------|
| AWS | console.aws.amazon.com | AWS Support (Business tier) |
| RDS (Postgres) | AWS RDS Console | AWS Support (Business tier) |
| Auth0 | manage.auth0.com | Auth0 Support |
| Twilio (SMS) | console.twilio.com | Twilio Support |
| Anthropic (Claude) | console.anthropic.com | support@anthropic.com |

---

## 7. Post-Incident

1. Create incident report within 24 hours
2. Schedule blameless post-mortem within 48 hours
3. Document action items with owners and deadlines
4. Update this runbook with lessons learned
5. If PHI involved: follow HIPAA breach notification timeline (60 days)
