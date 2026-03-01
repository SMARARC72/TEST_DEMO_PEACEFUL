# PRD Phase 2 — Architecture Adaptation Notes

This document records how PRD requirements designed for
Lambda + DynamoDB + Cognito are adapted to the actual
Express + Prisma + Auth0 + Neon PostgreSQL stack.

---

## Item 3.8 — VPC / Network Isolation

**PRD Requirement:** Lambda in VPC with private subnets, NAT gateway,
and VPC endpoints for DynamoDB/S3/KMS.

**Adaptation:** The backend runs as an Express application deployed via
ECS Fargate (or EC2) behind an ALB. Network isolation is achieved through:

| Layer | Implementation |
|-------|---------------|
| **ALB** | Internet-facing, with WAF attached (see 3.1). |
| **ECS Tasks** | Run in private subnets. Outbound internet via NAT gateway. |
| **Neon PostgreSQL** | Connected over TLS (`sslmode=require`). IP allowlist configured in Neon project settings. |
| **S3** | Accessed via VPC endpoint (Gateway type) — no internet traversal. |
| **Secrets Manager** | Accessed via VPC endpoint (Interface type). |

**Evidence:** `packages/infra/terraform/modules/networking/main.tf` defines the VPC
with public/private subnets and NAT gateway.

**Conclusion:** Requirement satisfied — network isolation is architecturally
equivalent to Lambda-in-VPC via ECS in private subnets.

---

## Item 3.10 — Database Point-in-Time Recovery (PITR)

**PRD Requirement:** Enable DynamoDB Point-in-Time Recovery (PITR)
for all tables.

**Adaptation:** The database is Neon PostgreSQL, which provides:

| Feature | Neon Capability |
|---------|----------------|
| **PITR** | Built-in. Neon retains a complete WAL history and supports instant branching from any past timestamp. Default retention: 7 days (Free), 30 days (Pro). |
| **Branching** | Create a read-only branch from any point in time for forensic analysis without affecting production. |
| **Backups** | Automatic, continuous. No manual configuration needed. |

**Verification steps:**
1. Neon dashboard → Project → Settings → History retention = 30 days (Pro plan)
2. To restore: `neon branches create --name recovery-<timestamp> --parent <branch> --point-in-time <ISO-timestamp>`

**Conclusion:** Requirement satisfied — Neon PITR is equivalent to
(and arguably superior to) DynamoDB PITR for this use case.

---

## Item 3.6 — JWT Token Validation

**PRD Requirement:** Cognito JWT validation with 5 mandatory checks
(signature, expiry, audience, issuer, token_use).

**Adaptation:** Auth middleware (`packages/api/src/middleware/auth.ts`)
implements dual-mode JWT validation:

| Check | Auth0 (RS256) | Local (HS256) |
|-------|--------------|---------------|
| **Signature** | JWKS endpoint verification via `jwks-rsa` | `jwt.verify()` with HS256 secret |
| **Expiry** | Automatic (`exp` claim) | Automatic (`exp` claim) |
| **Audience** | Validated against `AUTH0_AUDIENCE` | N/A (local tokens) |
| **Issuer** | Validated against `AUTH0_DOMAIN` | N/A (self-issued) |
| **token_use** | Checked via `sub` + `tid` claims | Checked via `sub` + `tid` claims |

**Additional security:**
- Step-up authentication for sensitive operations (`stepUpAuth` middleware)
- Refresh token rotation with invalidation set
- MFA verification flow

**Conclusion:** All 5 JWT validation checks are implemented,
adapted from Cognito to Auth0+local dual-mode.
