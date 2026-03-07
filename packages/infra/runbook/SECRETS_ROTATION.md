# Secrets Rotation Runbook

## Scope
Applies to production secrets managed in `packages/infra/terraform/modules/secrets` with automated rotation:
- `database_url` (30 days)
- `jwt_secret` (30 days)
- `jwt_refresh_secret` (30 days)
- `encryption_key` (30 days)
- `auth0_client_secret` (30 days)
- `anthropic_api_key` (60 days)

Baseline metadata secrets (`auth0_domain`, `auth0_client_id`) are 90-day class and not auto-rotated by Lambda.

## Zero-Downtime Key Rollover Expectations
1. Rotation Lambda writes new value into `AWSPENDING`.
2. For JSON secrets, previous values are retained in `*_PREVIOUS` fields.
3. Application keeps validating JWTs using current then previous key during overlap window.
4. ECS service is force-redeployed after rotation to load new `AWSCURRENT` values.
5. After overlap window expires, remove `*_PREVIOUS` values.

## Manual Rotation Procedure (Emergency)
```bash
# Trigger immediate rotation
aws secretsmanager rotate-secret \
  --secret-id peacefull/prod/jwt-secret

# Force ECS rollout to pick up new AWSCURRENT value
aws ecs update-service \
  --cluster peacefull-prod-cluster \
  --service peacefull-prod-api \
  --force-new-deployment
```

## Alarms and Monitoring
### Required CloudWatch Alarm
- Alarm name: `peacefull-prod-secrets-rotation-failures`
- Metric namespace: `AWS/SecretsManager`
- Metric name: `FailedRotationAttempts`
- Dimension: `SecretId=<secret ARN>` (alarm per critical secret)
- Threshold: `>= 1` in 5 minutes
- Action: PagerDuty SNS + `#incidents`

### Investigation Steps on Alarm
1. Find failed secret ARN from alarm dimensions.
2. Inspect Lambda logs (`/aws/lambda/peacefull-prod-secrets-rotation`).
3. Validate staging labels:
   ```bash
   aws secretsmanager describe-secret --secret-id <secret-id>
   ```
4. Verify Lambda IAM can call `GetSecretValue`, `PutSecretValue`, and `UpdateSecretVersionStage`.
5. Re-run rotation after fix:
   ```bash
   aws secretsmanager rotate-secret --secret-id <secret-id>
   ```
6. If still failing, execute rollback to previous `AWSCURRENT` and open SEV-2.

## Rollback for Bad Rotation
```bash
aws secretsmanager update-secret-version-stage \
  --secret-id <secret-id> \
  --version-stage AWSCURRENT \
  --move-to-version-id <known-good-version> \
  --remove-from-version-id <bad-version>

aws ecs update-service \
  --cluster peacefull-prod-cluster \
  --service peacefull-prod-api \
  --force-new-deployment
```
