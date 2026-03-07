# Security Incident Note: ECS Task Definition Metadata Exposure

- **Date closed:** 2026-03-07
- **Severity:** Medium (sensitive infrastructure metadata exposure; no plaintext credentials)
- **Scope:** Raw ECS task-definition JSON artifacts committed to source control.

## Summary
Deployment metadata dumps were previously committed with environment-specific infrastructure identifiers (account IDs, ARNs, ECR hosts, IAM role ARNs, and cache hostnames). These files are now removed from tracked source and replaced with sanitized templates only.

## Rotation / replacement completion
Rotation and replacement actions are **completed** for the exposed references from the removed task-definition dumps:

1. Secret references were rotated in AWS Secrets Manager and new secret versions/identifiers were issued.
2. ECS task and execution IAM role references were replaced with newly provisioned principals.
3. Updated runtime configuration now references rotated secrets and replacement principals outside this repository.
4. Repository artifacts now use non-sensitive placeholders in `*.example.json` templates.

> Operational rotation evidence (CloudTrail events, Secrets Manager version IDs, and IAM change tickets) is retained in the internal incident tracking system and intentionally not stored in this repository.

## Containment and hardening
- Added a CI policy check to fail if sensitive patterns (`arn:aws:secretsmanager:`, `taskDefinitionArn`, `dkr.ecr.`, IAM ARN patterns) appear in tracked JSON files outside approved `*.example.json` templates.
- Added `.gitignore` guardrails to avoid re-committing generated deployment snapshots and `aws ecs describe-task-definition` outputs.

## History rewrite status
A full Git history rewrite is technically feasible but requires coordinated branch protection changes and team communication. This action is tracked as a follow-up with release engineering and repository admins for scheduled execution.
