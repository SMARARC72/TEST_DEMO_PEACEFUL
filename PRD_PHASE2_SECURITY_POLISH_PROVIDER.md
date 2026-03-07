# PRD: Phase 2 — Security Hardening, Patient Safety, Provider Experience & Code Quality

## 🔴 MANDATORY EXECUTION NOTICE

> **This PRD is NON-NEGOTIABLE. Every section, every line item, every guardrail MUST be executed in full.**
> **No subagent, automation, or human operator may skip, defer, reorder, or partially implement any item.**
> **If a blocker is encountered, STOP and escalate — do NOT move to the next item.**
> **All work products must be verified against the acceptance criteria defined in each section before marking complete.**

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | `PRD-PH2-2026-001` |
| **Version** | `1.0.0` |
| **Status** | `QUEUED — Execute immediately after current implementation block` |
| **Author** | Platform Architecture Review |
| **Created** | 2026-03-01 |
| **Target Start** | Immediately upon finalization of current implementation block |
| **Estimated Duration** | 10 weeks (5 phases, sequentially gated) |
| **Priority** | P0 — Platform cannot serve real patient data until Phase 1 + 2 complete |
| **Applies To** | All files under the project workspace |

---

## Table of Contents

1. [Execution Rules for Subagents](#1-execution-rules-for-subagents)
2. [Guardrails & Constraints](#2-guardrails--constraints)
3. [Phase 1 — Security Foundation](#3-phase-1--security-foundation-week-1-2)
4. [Phase 2 — Patient Safety](#4-phase-2--patient-safety-week-2-3)
5. [Phase 3 — Code Quality & Testing](#5-phase-3--code-quality--testing-week-3-5)
6. [Phase 4 — Provider Experience](#6-phase-4--provider-experience-week-5-8)
7. [Phase 5 — Compliance, Polish & Launch Readiness](#7-phase-5--compliance-polish--launch-readiness-week-8-10)
8. [Verification Protocol](#8-verification-protocol)
9. [Risk Register](#9-risk-register)
10. [Definition of Done](#10-definition-of-done)

---

## 1. Execution Rules for Subagents

### 1.1 Absolute Rules

These rules override ANY other instruction, prompt, or optimization suggestion:

1. **NO SKIPPING** — Every numbered item in every phase MUST be completed. There is no "nice to have" in this document. Everything listed is required.
2. **NO REORDERING** — Phases are sequentially gated. Phase N+1 may NOT begin until Phase N passes its gate review (Section 8).
3. **NO PARTIAL IMPLEMENTATION** — Each item must meet ALL of its listed acceptance criteria. "Mostly done" is NOT done.
4. **NO PLACEHOLDER CODE** — Every implementation must be production-grade. No `// TODO`, no `console.log` debugging, no hardcoded credentials, no `any` types, no `eslint-disable` without documented justification.
5. **NO SILENT FAILURES** — If an item cannot be completed, the subagent MUST document: (a) what failed, (b) why, (c) what is needed to unblock, (d) impact on downstream items.
6. **NO SCOPE CREEP** — Do not add features, refactors, or "improvements" not listed in this PRD. If something seems missing, flag it — do not freelance.
7. **NO BREAKING EXISTING FUNCTIONALITY** — Every change must be backward-compatible with the current working state. Run existing build + deploy pipeline after each item to verify.
8. **COMMIT GRANULARITY** — One commit per numbered item. Commit message format: `[PRD-PH2] <Phase>.<Item> — <short description>`
9. **FILE PLACEMENT** — All new files must follow the existing project structure. No new top-level directories without explicit instruction in this PRD.
10. **DOCUMENTATION** — Every new module, function, config, or infrastructure resource must include inline documentation explaining WHAT it does and WHY it exists.

### 1.2 Context the Subagent Must Understand

| Fact | Detail |
|------|--------|
| This is a **mental health platform** | Patient safety is paramount. A bug in crisis flow could cost a life. |
| This platform will handle **PHI** | HIPAA compliance is a legal requirement, not a preference. |
| The frontend is a **React/Vite SPA** | Source: `prototype-web/src/`, builds to `prototype-web/dist/` |
| Legacy monolithic JS exists in `prototype-web/public/js/` | It must be archived, NOT used. See Phase 3. |
| Backend is **AWS Lambda + API Gateway + DynamoDB** | IaC in `packages/infra/terraform/` |
| Auth is **AWS Cognito** | Configured in Terraform; frontend uses `CognitoAuthProvider.tsx` |
| CI/CD is **GitHub Actions** | Workflows in `.github/workflows/` |
| Infrastructure is **Terraform** | State managed remotely; modules in `packages/infra/terraform/modules/` |
| The S3 frontend bucket pattern is | `peacefull-{env}-web-{account}` |
| CloudFront serves the SPA | With 404 → `index.html` rewrite for client-side routing |

### 1.3 Before Starting Any Work

The subagent MUST:

1. Read this entire PRD from top to bottom
2. Read `README.md` in the project root
3. Read `PRD_REACT_MIGRATION.md` if it exists
4. Read all files in `.github/workflows/`
5. Read `packages/infra/terraform/modules/` — all `.tf` files
6. Read `prototype-web/src/` — understand component tree
7. Verify the current build compiles: `cd prototype-web && npm ci && npm run build`
8. Verify Terraform validates: `cd packages/infra/terraform && terraform validate`
9. Document the current state hash (git SHA) as the rollback point

---

## 2. Guardrails & Constraints

### 2.1 Security Guardrails

| ID | Guardrail | Enforcement |
|----|-----------|-------------|
| SEC-01 | No AWS credentials in code, commits, or logs | Pre-commit hook + CI scan |
| SEC-02 | No `*` in any IAM policy | Terraform plan review |
| SEC-03 | No public S3 buckets | `aws_s3_bucket_public_access_block` on every bucket |
| SEC-04 | No unencrypted data stores | KMS encryption on DynamoDB, S3, CloudWatch Logs |
| SEC-05 | No HTTP — TLS 1.2+ everywhere | CloudFront minimum protocol version, API Gateway policy |
| SEC-06 | No `Access-Control-Allow-Origin: *` | CORS restricted to exact CloudFront domain |
| SEC-07 | No raw PHI in logs | Structured logger must redact SSN, DOB, name, email |
| SEC-08 | No Lambda function URLs | All access through API Gateway with authorizer |
| SEC-09 | All dependencies audited | `npm audit --audit-level=high` must pass in CI |
| SEC-10 | No inline scripts in HTML | CSP enforced via CloudFront response headers |

### 2.2 Code Quality Guardrails

| ID | Guardrail | Enforcement |
|----|-----------|-------------|
| CQ-01 | TypeScript `strict: true` | `tsconfig.json` — compiler will reject violations |
| CQ-02 | No `any` type | ESLint rule `@typescript-eslint/no-explicit-any: error` |
| CQ-03 | All functions have explicit return types | ESLint rule `@typescript-eslint/explicit-function-return-type: error` |
| CQ-04 | No `console.log` in production code | ESLint rule `no-console: error` (allow `console.error` in catch blocks only via override) |
| CQ-05 | Minimum 80% unit test coverage | CI gate — merge blocked below threshold |
| CQ-06 | 100% coverage on crisis and risk-scoring paths | CI gate — explicit coverage threshold on those directories |
| CQ-07 | No files > 300 lines | Enforced by review; exceptions documented |
| CQ-08 | All API responses follow standard envelope | `{ statusCode, body: { data?, error?, message?, requestId } }` |
| CQ-09 | All PR merges require passing CI | Branch protection rule |
| CQ-10 | No dead code | ESLint + `ts-prune` in CI |

### 2.3 Infrastructure Guardrails

| ID | Guardrail | Enforcement |
|----|-----------|-------------|
| INF-01 | All infra changes via Terraform | No console/CLI changes to AWS resources |
| INF-02 | Terraform plan on every PR | GitHub Actions workflow |
| INF-03 | Remote state encrypted with versioning | S3 backend config |
| INF-04 | State lock via DynamoDB | Prevent concurrent applies |
| INF-05 | No hardcoded AWS account IDs in HCL | Use `data.aws_caller_identity` |
| INF-06 | All resources tagged | Minimum tags: `Project`, `Environment`, `ManagedBy`, `PHI` |
| INF-07 | Staging environment mirrors prod | Same modules, different workspace/vars |

---

## 3. Phase 1 — Security Foundation (Week 1-2)

> **GATE:** No subsequent phase may begin until ALL items in Phase 1 are complete and verified.
> **RATIONALE:** The platform cannot accept any patient data until this phase is done.

### 3.1 — WAF on API Gateway

**What:** Deploy AWS WAF v2 with managed rule groups on API Gateway and CloudFront distribution.

**Where to modify:**
- Create `packages/infra/terraform/modules/security/waf.tf`
- Update `packages/infra/terraform/modules/api/main.tf` to associate WAF
- Update `packages/infra/terraform/modules/storage/main.tf` to associate WAF with CloudFront

**Rules to enable:**
- `AWSManagedRulesCommonRuleSet` (OWASP core)
- `AWSManagedRulesSQLiRuleSet` (SQL injection)
- `AWSManagedRulesKnownBadInputsRuleSet` (known exploit patterns)
- `AWSManagedRulesAmazonIpReputationList` (malicious IPs)
- Custom rate-based rule: 1000 requests per 5 minutes per IP

**Acceptance criteria:**
- [ ] WAF web ACL deployed and associated with API Gateway stage
- [ ] WAF web ACL deployed and associated with CloudFront distribution
- [ ] All 4 managed rule groups active in COUNT mode initially (switch to BLOCK after 48h monitoring)
- [ ] Rate-based rule active in BLOCK mode
- [ ] WAF logs shipping to CloudWatch Logs
- [ ] Terraform plan shows no errors
- [ ] Existing API calls still succeed

### 3.2 — API Gateway Rate Limiting & Usage Plans

**What:** Add throttling at API Gateway level in addition to WAF rate limiting.

**Where to modify:**
- `packages/infra/terraform/modules/api/main.tf`

**Configuration:**
- Default throttle: 100 requests/second, burst 200
- Per-route throttle on sensitive endpoints (`/auth/*`, `/crisis/*`): 10 req/sec, burst 20
- Usage plan for future API key management

**Acceptance criteria:**
- [ ] API Gateway stage has method-level throttling configured
- [ ] 429 responses returned when limits exceeded
- [ ] Throttle settings are Terraform-managed variables (not hardcoded)

### 3.3 — Input Validation Layer for All Lambda Functions

**What:** Create a shared validation package using Zod, integrated into every Lambda handler.

**Where to create:**
- `packages/shared/validation/` — shared Zod schemas
- `packages/shared/validation/schemas/` — one schema file per API resource (mood, journal, patient, auth, crisis, risk)
- `packages/shared/validation/middleware.ts` — Lambda middleware wrapper that validates input before handler executes

**Where to modify:**
- Every Lambda handler in `packages/lambdas/` (or wherever Lambda source lives) — wrap with validation middleware
- Each handler must reject invalid input with `400` and a descriptive error before any business logic runs

**Validation rules (minimum):**
- String fields: max length, regex pattern where applicable, XSS sanitization (strip HTML tags)
- Numeric fields: min/max range
- Email fields: RFC 5322 regex
- Date fields: ISO 8601 format validation
- Enum fields: exact match against allowed values
- Required vs. optional clearly defined per endpoint
- No additional/unexpected properties allowed (`strict` mode)

**Acceptance criteria:**
- [ ] `packages/shared/validation/` exists with exported schemas for every API resource
- [ ] Every Lambda handler uses the validation middleware
- [ ] Invalid input returns `400` with `{ error: "VALIDATION_ERROR", message: "<specific field failure>", requestId: "<uuid>" }`
- [ ] XSS payloads in string fields are rejected or sanitized
- [ ] SQL injection strings in any field are rejected
- [ ] Unit tests for every schema with valid and invalid inputs (min 10 test cases per schema)

### 3.4 — CORS Lockdown

**What:** Restrict CORS to the exact CloudFront distribution domain.

**Where to modify:**
- API Gateway CORS configuration in Terraform
- Lambda response headers (any Lambda that sets CORS headers manually)

**Configuration:**
- `Access-Control-Allow-Origin`: `https://<cloudfront-domain>` (from Terraform output, not hardcoded)
- `Access-Control-Allow-Methods`: Only methods actually used per endpoint
- `Access-Control-Allow-Headers`: Only headers actually sent
- `Access-Control-Max-Age`: `7200`
- No `Access-Control-Allow-Credentials` unless cookies are used (currently they are not)

**Acceptance criteria:**
- [ ] No `*` in any CORS header anywhere in the codebase (grep verification)
- [ ] Requests from unauthorized origins receive no CORS headers (browser blocks them)
- [ ] Preflight OPTIONS requests return correct headers
- [ ] Frontend still functions correctly from CloudFront domain

### 3.5 — Security Headers via CloudFront Response Headers Policy

**What:** Add comprehensive security headers to all CloudFront responses.

**Where to modify:**
- `packages/infra/terraform/modules/storage/main.tf` — add `aws_cloudfront_response_headers_policy`
- Associate policy with CloudFront distribution

**Headers to set:**
- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://<api-gateway-domain>; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `X-XSS-Protection`: `1; mode=block`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`

**Acceptance criteria:**
- [ ] All headers present on every CloudFront response (verify with `curl -I`)
- [ ] CSP does not break any frontend functionality
- [ ] No inline scripts in the React build output (Vite should not produce any)
- [ ] Terraform plan clean

### 3.6 — Server-Side JWT Validation in Lambda Authorizer

**What:** Ensure the API Gateway Lambda authorizer fully validates Cognito JWT tokens.

**Where to modify:**
- Lambda authorizer source code
- Add `aws-jwt-verify` as a dependency

**Validation must include:**
- [ ] Token signature verification against Cognito JWKS endpoint (cached)
- [ ] Token expiry (`exp` claim) check
- [ ] Token issuer (`iss` claim) matches Cognito User Pool URL
- [ ] Token audience (`aud` or `client_id` claim) matches expected app client
- [ ] Token use (`token_use` claim) is `access` or `id` as appropriate
- [ ] Token `sub` extracted and passed to downstream Lambda as `requestContext.authorizer.principalId`
- [ ] Expired tokens return `401`
- [ ] Malformed tokens return `401`
- [ ] Tokens signed by wrong key return `401`

**Acceptance criteria:**
- [ ] Authorizer uses `aws-jwt-verify` (not manual JWT parsing)
- [ ] JWKS is cached (not fetched on every request)
- [ ] All 5 validation checks above are implemented
- [ ] Unit tests cover: valid token, expired token, wrong issuer, wrong audience, malformed token, missing token
- [ ] No authenticated endpoint is accessible without a valid token

### 3.7 — PHI Audit Trail

**What:** Implement comprehensive audit logging for all PHI access and modification.

**Where to create:**
- `packages/infra/terraform/modules/security/audit.tf` — CloudTrail config + DynamoDB audit table
- `packages/shared/audit/` — audit logging utility consumed by all Lambdas

**Two layers:**
1. **AWS CloudTrail data events** on DynamoDB tables and S3 buckets containing PHI
2. **Application-level audit log** — a dedicated DynamoDB table recording every PHI access

**Audit log table schema:**
- `PK`: `AUDIT#<YYYY-MM-DD>`
- `SK`: `<timestamp>#<requestId>`
- `userId`: who performed the action
- `action`: `READ | CREATE | UPDATE | DELETE`
- `resource`: `patient | mood | journal | risk | clinical-note`
- `resourceId`: the specific record ID
- `ipAddress`: from API Gateway `requestContext.identity.sourceIP`
- `userAgent`: from request headers
- `timestamp`: ISO 8601
- `ttl`: 7 years from creation (HIPAA minimum retention)

**Where to modify:**
- Every Lambda handler — add audit log write after successful PHI operations
- Audit writes must be non-blocking (fire-and-forget with error logging, not blocking the response)

**Acceptance criteria:**
- [ ] CloudTrail trail exists logging DynamoDB data events for all PHI tables
- [ ] CloudTrail trail exists logging S3 data events for PHI buckets
- [ ] `audit-log` DynamoDB table exists with PITR enabled
- [ ] Every Lambda that reads or writes PHI writes an audit record
- [ ] Audit records include all fields listed above
- [ ] TTL is set to 7 years
- [ ] Audit writes do not impact API latency (async/fire-and-forget)
- [ ] Audit table is NOT accessible to patient-role users

### 3.8 — VPC for Lambda Functions

**What:** Move all Lambda functions into a VPC with VPC endpoints for AWS services.

**Where to create:**
- `packages/infra/terraform/modules/network/` — VPC, subnets, VPC endpoints
- Or update existing network module if one exists

**Where to modify:**
- All Lambda function Terraform resources — add `vpc_config` block
- Lambda execution role — add `AWSLambdaVPCAccessExecutionRole` managed policy

**Architecture:**
- VPC with 2 private subnets (no public subnets needed for Lambda)
- VPC endpoint for DynamoDB (Gateway type)
- VPC endpoint for S3 (Gateway type)
- VPC endpoint for SES (Interface type)
- VPC endpoint for SNS (Interface type)
- VPC endpoint for CloudWatch Logs (Interface type)
- VPC endpoint for Cognito IDP (Interface type) — if Lambdas call Cognito
- Security group: outbound to VPC endpoints only; no internet access unless NAT is needed

**Acceptance criteria:**
- [ ] VPC exists with 2 private subnets across 2 AZs
- [ ] All VPC endpoints created and functional
- [ ] All Lambda functions configured with `vpc_config`
- [ ] Lambda functions can still reach DynamoDB, S3, SES, SNS, CloudWatch
- [ ] Lambda functions CANNOT reach the public internet (unless a documented exception exists)
- [ ] Cold start impact measured and documented (VPC adds ~1-2s — acceptable for this use case)
- [ ] All existing API calls still succeed

### 3.9 — Dependency Vulnerability Scanning in CI

**What:** Add automated dependency and CodeQL severity scanning to the CI pipeline.

**Where to create:**
- New job in `.github/workflows/ci.yml` (or create `.github/workflows/security-scan.yml`)

**What to run:**
- `npm audit --audit-level=high` on `prototype-web/`
- `npm audit --audit-level=high` on every Lambda package directory
- `npm audit --audit-level=high` on `packages/shared/`
- CodeQL analysis with severity threshold policy (`high` default)
- Optionally add `Snyk` or `Trivy` for deeper scanning

**Where to modify:**
- Branch protection rules — `security-scan` must be configured as a required status check for `main`.

**Branch protection policy for `main`:**
1. Require pull request before merge.
2. Require status checks to pass before merge.
3. Add `security-scan` to required status checks.
4. Block merge when the `security-scan` job fails due to:
   - Any `npm audit` result at/above the configured threshold.
   - Any open CodeQL alert at/above the configured threshold.

**Audit evidence retention policy:**
- Upload CI artifacts for security evidence (`npm audit` JSON + CodeQL SARIF).
- Retain security evidence artifacts for at least 90 days.

**Acceptance criteria:**
- [ ] CI workflow runs dependency audit and CodeQL checks on every PR
- [ ] PRs targeting `main` fail if any `high`/`critical` dependency vulnerability is found
- [ ] PRs targeting `main` fail if any open CodeQL alert at/above threshold exists
- [ ] Branch protection on `main` requires the `security-scan` check before merge
- [ ] Security scan artifacts are published and retained for audit evidence
- [ ] Current codebase passes (fix any existing vulnerabilities first)
- [ ] Dependabot or Renovate configured for automated dependency update PRs

### 3.10 — DynamoDB Point-in-Time Recovery & Backup

**What:** Enable PITR on all DynamoDB tables.

**Where to modify:**
- Every `aws_dynamodb_table` resource in Terraform — add `point_in_time_recovery { enabled = true }`

**Acceptance criteria:**
- [ ] PITR enabled on every DynamoDB table in every environment
- [ ] Terraform plan shows only the PITR change (no unrelated drift)
- [ ] Verified via AWS Console or CLI that PITR status is `ENABLED`

### 3.11 — S3 Bucket Hardening

**What:** Verify and enforce security on all S3 buckets.

**Where to modify:**
- All `aws_s3_bucket` resources in Terraform

**Requirements per bucket:**
- `aws_s3_bucket_public_access_block` — all four settings `true`
- `aws_s3_bucket_server_side_encryption_configuration` — `aws:kms` with dedicated key or `AES256` minimum
- `aws_s3_bucket_versioning` — enabled
- `aws_s3_bucket_logging` — access logs to a dedicated logging bucket
- Bucket policy denying `s3:*` unless via CloudFront OAI or specific IAM roles

**Acceptance criteria:**
- [ ] Every S3 bucket has public access blocked
- [ ] Every S3 bucket has encryption enabled
- [ ] Every S3 bucket has versioning enabled
- [ ] Every S3 bucket has access logging enabled
- [ ] No bucket is accessible without authentication
- [ ] `terraform plan` clean after changes

---

### Phase 1 Gate Review

Before proceeding to Phase 2, the following must ALL be true:

- [ ] All 11 items (3.1–3.11) complete with all acceptance criteria met
- [ ] `terraform plan` shows no pending changes
- [ ] `npm run build` succeeds in `prototype-web/`
- [ ] All existing API endpoints still function (manual smoke test OR automated)
- [ ] Security scan CI job passes
- [ ] Git tag created: `phase1-security-foundation-complete`

---

## 4. Phase 2 — Patient Safety (Week 2-3)

> **GATE:** Phase 1 must be complete. No exceptions.
> **RATIONALE:** These features directly impact patient wellbeing and safety.

### 4.1 — End-to-End Crisis Escalation Path

**What:** Wire the existing crisis UI button to a fully functional backend notification system.

**Where to create:**
- `packages/lambdas/crisis-alert/` — Lambda that processes crisis signals
- SNS topic for crisis notifications in Terraform
- SES email template for provider crisis alerts

**Where to modify:**
- Frontend crisis modal/button — ensure it calls the crisis API endpoint
- API Gateway — add `/crisis/alert` POST endpoint
- `alert-router` Lambda (if exists) — integrate with SNS

**Flow:**
1. Patient clicks crisis button → frontend sends `POST /crisis/alert` with `{ patientId, timestamp, context }`
2. API Gateway → Lambda authorizer validates token → `crisis-alert` Lambda
3. Lambda writes crisis record to DynamoDB `crisis-events` table
4. Lambda publishes to SNS `crisis-alerts` topic
5. SNS fans out to: (a) Provider email via SES, (b) CloudWatch alarm, (c) future: SMS
6. Lambda returns `200` with confirmation message to patient
7. Frontend shows confirmation: "Your care team has been notified. If you are in immediate danger, call 988 or 911."

**Acceptance criteria:**
- [ ] Crisis button triggers API call
- [ ] Crisis event persisted in DynamoDB
- [ ] SNS notification sent
- [ ] Provider receives email within 60 seconds
- [ ] Patient sees confirmation with emergency numbers
- [ ] Audit log records the crisis event
- [ ] System functional even if SNS fails (graceful degradation — event still persisted)
- [ ] Unit tests for Lambda handler
- [ ] Integration test for full flow (mocked SNS)

### 4.2 — Session Timeout Warning & Auto-Save

**What:** Warn patients before their auth session expires; auto-save any in-progress form data.

**Where to create:**
- `prototype-web/src/components/SessionTimeoutWarning.tsx`
- `prototype-web/src/hooks/useIdleTimeout.ts`
- `prototype-web/src/hooks/useAutoSave.ts`
- `prototype-web/src/utils/secureStorage.ts` — encrypted localStorage wrapper

**Where to modify:**
- `CognitoAuthProvider.tsx` — expose token expiry time
- App root layout — mount `SessionTimeoutWarning`
- All form components (mood entry, journal, etc.) — integrate `useAutoSave`

**Behavior:**
- 5 minutes before token expiry: show modal warning
- Modal offers "Continue Session" (triggers token refresh) or "Log Out"
- 60 seconds before expiry: auto-save all form state to encrypted localStorage
- On actual expiry: redirect to login; on next login, offer to restore draft
- Idle detection: if no interaction for 15 minutes, show warning regardless of token state

**Encryption for auto-save:**
- Use `SubtleCrypto` API with a key derived from the user's Cognito `sub` + a salt
- Drafts auto-delete after 24 hours (TTL in storage)
- Drafts deleted on successful form submission

**Acceptance criteria:**
- [ ] Warning modal appears 5 minutes before token expiry
- [ ] "Continue Session" refreshes the token successfully
- [ ] Form data auto-saved to encrypted localStorage at 60 seconds before expiry
- [ ] After re-login, patient prompted to restore draft
- [ ] Drafts encrypted (not readable as plaintext in devtools)
- [ ] Drafts auto-expire after 24 hours
- [ ] Idle timeout triggers after 15 minutes of no interaction
- [ ] No data loss during token refresh cycle

### 4.3 — Offline Fallback with Crisis Information

**What:** Add a service worker that caches a fallback page with crisis hotline information.

**Where to create:**
- `prototype-web/public/sw.js` — service worker
- `prototype-web/public/offline.html` — static fallback page
- `prototype-web/src/serviceWorkerRegistration.ts`

**Where to modify:**
- `prototype-web/src/main.tsx` — register service worker
- `prototype-web/vite.config.ts` — configure service worker plugin if using `vite-plugin-pwa`

**Offline page content:**
- PeaceFull branding (minimal)
- Message: "You appear to be offline. Please check your connection."
- Prominently displayed: 988 Suicide & Crisis Lifeline, Crisis Text Line (text HOME to 741741), 911
- Local crisis resources link (cached)
- "Retry Connection" button

**Service worker strategy:**
- Network-first for API calls
- Cache-first for static assets (CSS, JS, images)
- Fallback to `offline.html` for navigation requests when offline

**Acceptance criteria:**
- [ ] Service worker registers successfully on first visit
- [ ] When offline, navigating to any route shows the offline page (not browser error)
- [ ] Offline page displays all crisis hotline numbers
- [ ] When connection restores, normal app resumes
- [ ] Service worker does NOT cache API responses containing PHI
- [ ] Service worker updates correctly when new version deployed

### 4.4 — Accessibility Audit & Remediation

**What:** Bring the entire frontend to WCAG 2.1 AA compliance.

**Where to modify:**
- Every component in `prototype-web/src/`

**Requirements checklist (every item must be addressed):**

**Keyboard Navigation:**
- [ ] Every interactive element is focusable and operable via keyboard
- [ ] Focus order follows logical reading order
- [ ] No keyboard traps
- [ ] Skip navigation link at top of page
- [ ] Focus visible indicator on all elements (minimum 3:1 contrast ratio)
- [ ] Modal dialogs trap focus and return focus on close

**Screen Reader:**
- [ ] All images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` elements
- [ ] All buttons have accessible names
- [ ] Page regions use landmark roles (`<nav>`, `<main>`, `<header>`, `<footer>`)
- [ ] Dynamic content changes announced via `aria-live` regions
- [ ] Error messages associated with form fields via `aria-describedby`
- [ ] Crisis button has `aria-label` describing urgency

**Color & Contrast:**
- [ ] All text meets 4.5:1 contrast ratio (3:1 for large text)
- [ ] Information not conveyed by color alone
- [ ] Focus indicators meet contrast requirements

**Motion & Timing:**
- [ ] No content flashes more than 3 times per second
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Session timeout warning provides adequate time to respond (per 4.2)

**Where to create:**
- `prototype-web/src/components/SkipNavigation.tsx`
- `prototype-web/src/styles/accessibility.css` — focus styles, high-contrast overrides

**Verification:**
- Run `axe-core` via browser extension on every route
- Run `eslint-plugin-jsx-a11y` — zero errors
- Manual keyboard-only navigation test on every user flow
- Manual screen reader test (NVDA or VoiceOver) on critical flows

**Acceptance criteria:**
- [ ] `eslint-plugin-jsx-a11y` configured and zero errors
- [ ] `axe-core` audit returns zero violations on every route
- [ ] Keyboard-only navigation documented and verified for: login, dashboard, mood entry, journal entry, crisis button
- [ ] Screen reader announces all content meaningfully (verified manually)
- [ ] Contrast checker passes on all color combinations
- [ ] `prefers-reduced-motion` media query present for all animations

### 4.5 — Loading States, Error Boundaries & User Feedback

**What:** Add comprehensive loading states, error handling, and feedback across all views.

**Where to create:**
- `prototype-web/src/components/common/SkeletonLoader.tsx` — reusable skeleton
- `prototype-web/src/components/common/ErrorBoundary.tsx` — React error boundary
- `prototype-web/src/components/common/Toast.tsx` — feedback toast system
- `prototype-web/src/components/common/EmptyState.tsx` — empty data state

**Where to modify:**
- Every page/view component — wrap data-fetching sections with loading/error states
- App root — wrap with `ErrorBoundary`
- All form submissions — show success/error toast

**Error boundary behavior:**
- Catches rendering errors
- Shows patient-friendly message: "Something went wrong. Your data is safe."
- Includes crisis hotline numbers (always visible, even in error state)
- "Try Again" button that resets state
- Error details logged (NOT shown to user)

**Acceptance criteria:**
- [ ] Every data-fetching view shows skeleton loader during load
- [ ] Every data-fetching view shows error state on failure
- [ ] Error states include retry mechanism
- [ ] Error boundary catches and handles component crashes
- [ ] Crisis information visible even in error states
- [ ] Success toast after: mood submission, journal save, profile update
- [ ] Error toast on: API failure, validation error
- [ ] Empty state shown when: no moods logged, no journal entries, no notifications

### 4.6 — Patient Data Export (Right of Access)

**What:** Allow patients to download all their data per HIPAA Right of Access.

**Where to create:**
- `packages/lambdas/data-export/` — Lambda that aggregates all patient data
- API Gateway endpoint: `GET /patient/data-export`
- Frontend: download button in patient settings/profile

**What data to include:**
- All mood entries
- All journal entries
- Risk assessment history
- Crisis event history
- Account information (email, created date — NOT password hash)
- Audit log of who accessed their data

**Format:** JSON file with clear structure; future: add PDF option

**Security:**
- Endpoint requires authentication (same patient only)
- Rate limited: 1 export per 24 hours
- Export event logged in audit trail
- File generated on-demand (not pre-cached)

**Acceptance criteria:**
- [ ] Patient can request data export from UI
- [ ] Export contains all data categories listed above
- [ ] Export is JSON formatted and human-readable
- [ ] Export only contains the requesting patient's data
- [ ] Rate limiting prevents abuse
- [ ] Audit log records the export event
- [ ] Different patient cannot access another patient's export

---

### Phase 2 Gate Review

- [ ] All 6 items (4.1–4.6) complete with all acceptance criteria met
- [ ] Crisis flow tested end-to-end (button → notification received)
- [ ] Offline fallback verified by disabling network in DevTools
- [ ] Accessibility audit tool returns zero violations
- [ ] `npm run build` succeeds
- [ ] All Phase 1 items still passing
- [ ] Git tag created: `phase2-patient-safety-complete`

---

## 5. Phase 3 — Code Quality & Testing (Week 3-5)

> **GATE:** Phase 2 must be complete. No exceptions.

### 5.1 — Archive Legacy Monolithic JavaScript

**What:** Move all legacy JS files from `prototype-web/public/js/` to archive.

**Where to move (NOT delete):**
- `prototype-web/public/js/state.js` → `_archive/prototype/state.js`
- `prototype-web/public/js/api-bridge.js` → `_archive/prototype/api-bridge.js`
- `prototype-web/public/js/render.js` → `_archive/prototype/render.js`
- `prototype-web/public/js/actions.js` → `_archive/prototype/actions.js`
- `prototype-web/public/js/helpers.js` → `_archive/prototype/helpers.js`
- `prototype-web/public/js/events.js` → `_archive/prototype/events.js`
- `prototype-web/public/js/index.js` → `_archive/prototype/index.js`
- `prototype-web/public/js/api.js` → `_archive/prototype/api.js`

**Additionally:**
- Move `build-single-file.mjs` → `_archive/build-single-file.mjs`
- Move `peacefull-demo-github/` → `_archive/peacefull-demo-github/`

**Where to create:**
- `_archive/README.md` — explain these are archived reference files, not part of the build

**Where to modify:**
- `.gitignore` — do NOT ignore `_archive/` (keep for reference)
- Verify `prototype-web/vite.config.ts` — confirm no references to old JS files
- Verify `prototype-web/index.html` — only entry point is `src/main.tsx`

**Acceptance criteria:**
- [ ] No JS files remain in `prototype-web/public/js/`
- [ ] `build-single-file.mjs` moved to `_archive/`
- [ ] `_archive/README.md` exists explaining purpose
- [ ] `npm run build` in `prototype-web/` succeeds
- [ ] Built `dist/` contains only React output (no legacy JS files)
- [ ] Deployed site functions correctly

### 5.2 — TypeScript Strict Mode

**What:** Enable full TypeScript strict mode and fix all resulting errors.

**Where to modify:**
- `prototype-web/tsconfig.json`
- Every `.ts` and `.tsx` file that produces errors after strict mode enabled

**Settings to enable:**
- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"noImplicitAny": true`
- `"noImplicitReturns": true`
- `"noFallthroughCasesInSwitch": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"exactOptionalPropertyTypes": true`

**Process:**
1. Enable all settings
2. Run `tsc --noEmit`
3. Fix every single error (no `@ts-ignore`, no `as any`)
4. Repeat until zero errors

**Acceptance criteria:**
- [ ] All strict settings enabled in `tsconfig.json`
- [ ] `tsc --noEmit` produces zero errors
- [ ] Zero `@ts-ignore` comments in codebase
- [ ] Zero `as any` casts in codebase
- [ ] All function parameters and return types explicitly typed

### 5.3 — ESLint Configuration

**What:** Configure comprehensive ESLint rules enforcing code quality guardrails.

**Where to create or modify:**
- `prototype-web/.eslintrc.cjs` or `eslint.config.js`
- `.eslintrc` at repo root for Lambda code

**Rules (minimum):**
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/explicit-function-return-type: error`
- `@typescript-eslint/no-unused-vars: error`
- `no-console: error` (with `allow: ["warn", "error"]` override)
- `jsx-a11y/*` — all recommended rules as errors
- `react-hooks/rules-of-hooks: error`
- `react-hooks/exhaustive-deps: warn`
- `import/no-unresolved: error`
- `import/order` — enforced import ordering

**Acceptance criteria:**
- [ ] ESLint config exists and includes all rules above
- [ ] `npm run lint` passes with zero errors across entire frontend codebase
- [ ] CI pipeline runs lint and blocks on errors
- [ ] Pre-commit hook runs lint on staged files (via `husky` + `lint-staged`)

### 5.4 — Structured Logging for All Lambda Functions

**What:** Replace all `console.log` with structured logger using AWS Lambda Powertools.

**Where to create:**
- `packages/shared/logger/` — wrapper around `@aws-lambda-powertools/logger`

**Where to modify:**
- Every Lambda handler — replace `console.log/warn/error` with structured logger

**Logger requirements:**
- JSON format
- Correlation ID from API Gateway `requestContext.requestId`
- Log level configurable via environment variable
- Automatic redaction of PHI fields (configure sensitive keys: `email`, `name`, `dob`, `ssn`, `phoneNumber`)
- Structured fields: `timestamp`, `level`, `message`, `correlationId`, `functionName`, `service`

**Acceptance criteria:**
- [ ] Zero `console.log` statements in any Lambda code
- [ ] All Lambdas use shared structured logger
- [ ] Logs are JSON format in CloudWatch
- [ ] Correlation ID present in every log line
- [ ] PHI fields redacted in logs (test with sample data)
- [ ] Log level configurable via `LOG_LEVEL` environment variable

### 5.5 — Standardized API Response Envelope

**What:** Ensure every API endpoint returns a consistent response format.

**Where to create:**
- `packages/shared/api-response/` — response builder utilities

**Response format:**
Success:
```json
{
  "statusCode": 200,
  "body": {
    "data": { },
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Error:
```json
{
  "statusCode": 400,
  "body": {
    "error": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [ ],
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

**Error codes (standardized enum):**
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

**Where to modify:**
- Every Lambda handler — use response builder instead of manual `{ statusCode, body }` construction

**Acceptance criteria:**
- [ ] Response builder utility exists and is used by all Lambdas
- [ ] Every success response includes `data`, `requestId`, `timestamp`
- [ ] Every error response includes `error`, `message`, `requestId`, `timestamp`
- [ ] Frontend API client updated to parse standardized envelope
- [ ] No Lambda returns a raw string body

### 5.6 — Typed Frontend API Client

**What:** Create a typed API client consumed by all frontend data-fetching code.

**Where to create:**
- `prototype-web/src/api/client.ts` — base HTTP client with auth header injection, error handling, retry
- `prototype-web/src/api/types.ts` — TypeScript interfaces for all API requests/responses
- `prototype-web/src/api/mood.ts` — mood API methods
- `prototype-web/src/api/journal.ts` — journal API methods
- `prototype-web/src/api/patient.ts` — patient API methods
- `prototype-web/src/api/crisis.ts` — crisis API methods
- `prototype-web/src/api/index.ts` — barrel export

**Base client features:**
- Automatic Cognito token injection in `Authorization` header
- Automatic retry on 5xx (3 attempts, exponential backoff)
- Automatic token refresh on 401 (one attempt, then logout)
- Request/response logging (no PHI in logs)
- Typed generics: `apiClient.get<MoodEntry[]>('/mood')`

**Where to modify:**
- All existing `fetch`/`axios` calls — replace with typed API client

**Acceptance criteria:**
- [ ] Typed API client exists with all methods
- [ ] All API calls in frontend go through this client (no raw `fetch`)
- [ ] TypeScript catches type mismatches at compile time
- [ ] Auth token automatically injected
- [ ] 401 triggers token refresh
- [ ] 5xx triggers retry
- [ ] Network errors caught and surfaced via error boundary/toast

### 5.7 — Unit Test Suite — Lambda Functions

**What:** Add comprehensive unit tests for all Lambda handlers.

**Where to create:**
- `packages/lambdas/<function-name>/__tests__/` — test files colocated with handlers
- `packages/shared/validation/__tests__/`
- `packages/shared/audit/__tests__/`
- `packages/shared/api-response/__tests__/`

**Testing framework:** Jest with TypeScript

**Coverage requirements:**
- Overall: minimum 80%
- Crisis-related Lambdas: 100%
- Risk-scoring Lambdas: 100%
- Validation schemas: 100%
- Auth/authorizer: 100%

**What to test per Lambda:**
- Happy path (valid input → correct output)
- Validation rejection (invalid input → 400)
- Auth failure (no token → 401)
- DynamoDB error (simulate failure → 500 with correct envelope)
- Edge cases specific to the function

**Acceptance criteria:**
- [ ] Every Lambda handler has a test file
- [ ] Coverage report generated in CI
- [ ] Overall coverage >= 80%
- [ ] Crisis + risk + auth coverage = 100%
- [ ] CI blocks merge if coverage drops below threshold
- [ ] Tests use mocks for AWS services (not live calls)

### 5.8 — Unit Test Suite — React Components

**What:** Add unit tests for all React components.

**Where to create:**
- `prototype-web/src/components/**/__tests__/` — colocated test files

**Testing framework:** Vitest + React Testing Library

**Priority components (100% coverage):**
- Crisis modal/button
- Session timeout warning
- Error boundary
- Auth provider
- All form components (mood, journal)

**General components (80% coverage):**
- Dashboard views
- Navigation
- Layout components

**What to test per component:**
- Renders without crashing
- Renders correct content for given props
- User interactions trigger expected callbacks
- Loading/error/empty states render correctly
- Accessibility: components have correct ARIA attributes
- Edge cases: empty data, long strings, special characters

**Acceptance criteria:**
- [ ] Every component has a test file
- [ ] Coverage >= 80% overall; 100% on crisis, auth, form components
- [ ] Tests use React Testing Library (not Enzyme, not shallow rendering)
- [ ] CI runs tests and blocks merge on failure
- [ ] No snapshot tests (they provide false confidence)

### 5.9 — End-to-End Test Suite

**What:** Add E2E tests for critical patient flows.

**Where to create:**
- `prototype-web/e2e/` — Playwright test files
- `prototype-web/playwright.config.ts`

**Flows to test:**
1. Patient signup → email verification → first login → dashboard
2. Patient login → mood entry → submission → see in history
3. Patient login → journal write → save → see in list
4. Patient login → crisis button → confirmation displayed
5. Patient login → idle for 15 min → timeout warning → continue session
6. Patient login → navigate to all routes → no errors
7. Offline → fallback page displayed with crisis numbers
8. Invalid login → error message displayed
9. Session expired → redirect to login → restore draft

**Acceptance criteria:**
- [ ] Playwright configured and 9 test flows implemented
- [ ] Tests run in CI on every PR (headless browser)
- [ ] Tests run against a staging/preview environment (not prod)
- [ ] All 9 flows pass
- [ ] Test results visible in CI output

### 5.10 — Pre-Commit Hooks & CI Pipeline Updates

**What:** Add pre-commit hooks and update CI to enforce all quality gates.

**Where to create:**
- `.husky/pre-commit` — runs lint-staged
- `.lintstagedrc` — configuration for lint-staged
- Update `.github/workflows/ci.yml`

**Pre-commit hook runs:**
- ESLint on staged `.ts`/`.tsx` files
- TypeScript type-check
- Prettier format check

**CI pipeline must run (in order):**
1. Install dependencies
2. Lint (ESLint)
3. Type check (`tsc --noEmit`)
4. Unit tests (Lambda + React) with coverage
5. Coverage threshold check (fail if below minimums)
6. Security audit (`npm audit`)
7. Build (`npm run build`)
8. E2E tests (against preview deployment)
9. Terraform validate + plan (if infra files changed)

**Acceptance criteria:**
- [ ] Pre-commit hook prevents committing lint errors
- [ ] CI pipeline includes all 9 steps
- [ ] Branch protection requires CI pass
- [ ] Coverage thresholds configured and enforced
- [ ] Pipeline completes in < 15 minutes

---

### Phase 3 Gate Review

- [ ] All 10 items (5.1–5.10) complete with all acceptance criteria met
- [ ] Legacy JS archived
- [ ] TypeScript strict mode — zero errors
- [ ] ESLint — zero errors
- [ ] Unit test coverage >= 80% (100% on critical paths)
- [ ] E2E tests pass
- [ ] CI pipeline fully operational with all gates
- [ ] `npm run build` succeeds
- [ ] All Phase 1 and Phase 2 items still passing
- [ ] Git tag created: `phase3-code-quality-complete`

---

## 6. Phase 4 — Provider Experience (Week 5-8)

> **GATE:** Phase 3 must be complete. No exceptions.
> **NOTE:** This phase introduces new features. Each feature must have unit tests, input validation, audit logging, and proper error handling from day one (as established in Phase 1-3).

### 6.1 — Provider Role & RBAC

**What:** Add role-based access control distinguishing patients from providers from admins.

**Where to modify:**
- Cognito User Pool — add `custom:role` attribute (`patient`, `provider`, `admin`)
- Lambda authorizer — extract role from token claims; include in authorizer context
- API Gateway — add authorizer context passing to Lambdas
- Every Lambda handler — check role before processing (providers can access patient list; patients can only access their own data)

**Where to create:**
- `packages/shared/auth/` — role enum, permission matrix, role-checking middleware

**Permission matrix:**

| Resource | Patient | Provider | Admin |
|----------|---------|----------|-------|
| Own mood entries | CRUD | Read (their patients) | Read all |
| Own journal entries | CRUD | Read (their patients) | Read all |
| Own risk scores | Read | Read + Write (their patients) | Read all |
| Patient list | — | Read (assigned patients) | Read all |
| Clinical notes | — | CRUD (their patients) | Read all |
| Crisis alerts | Create (self) | Read (their patients) | Read all |
| Audit logs | Read (own) | Read (their patients) | Read all |
| User management | — | — | CRUD |

**Acceptance criteria:**
- [ ] Cognito `custom:role` attribute configured
- [ ] Lambda authorizer extracts and validates role
- [ ] Permission middleware exists and is used by all Lambdas
- [ ] Patient cannot access provider endpoints (returns 403)
- [ ] Provider cannot access other providers' patients (returns 403)
- [ ] Admin can access all (with audit logging)
- [ ] Unit tests for every permission combination
- [ ] Existing patient flows still work

### 6.2 — Provider Dashboard

**What:** Build the provider-facing dashboard in the React frontend.

**Where to create:**
- `prototype-web/src/pages/provider/` — provider page components
- `prototype-web/src/pages/provider/ProviderDashboard.tsx` — main dashboard
- `prototype-web/src/pages/provider/PatientList.tsx` — patient roster
- `prototype-web/src/pages/provider/PatientDetail.tsx` — individual patient view
- `prototype-web/src/pages/provider/AlertQueue.tsx` — pending crisis/risk alerts
- `prototype-web/src/components/provider/` — provider-specific components

**Where to modify:**
- Router config — add `/provider/*` routes
- Navigation — role-based nav (patients see patient nav; providers see provider nav)
- Auth guard — `/provider/*` routes require `provider` or `admin` role

**Dashboard features:**
- **Patient roster**: sortable table showing: name, last activity, current risk level, unread alerts
- **Risk heat map**: visual indicator (green/yellow/orange/red) per patient based on latest risk score
- **Alert queue**: chronological list of crisis events and risk threshold breaches, with acknowledge button
- **Quick stats**: total patients, patients needing attention, unacknowledged alerts count
- **Patient detail view**: when clicking a patient → see their mood history, journal entries (read-only), risk trend chart, crisis history

**Acceptance criteria:**
- [ ] Provider dashboard accessible at `/provider/dashboard`
- [ ] Patient list displays all assigned patients with correct data
- [ ] Risk indicators render correctly per score thresholds
- [ ] Alert queue shows unacknowledged alerts
- [ ] Acknowledge button updates alert status
- [ ] Patient detail view shows full history
- [ ] Unauthorized users redirected away from provider routes
- [ ] Loading states, error boundaries, empty states all present
- [ ] Fully accessible (keyboard, screen reader, contrast)
- [ ] Unit tests for all provider components

### 6.3 — Clinical Notes System

**What:** Allow providers to create, read, update clinical notes for their patients.

**Where to create:**
- DynamoDB table: `clinical-notes` in Terraform
- `packages/lambdas/clinical-notes/` — CRUD Lambda
- API endpoints: `POST/GET/PUT /provider/patients/{patientId}/notes`
- `prototype-web/src/pages/provider/ClinicalNotes.tsx`
- `prototype-web/src/components/provider/NoteEditor.tsx`
- Zod validation schema for clinical notes

**Note schema:**
- `noteId` (UUID)
- `patientId`
- `providerId`
- `noteType` (enum: `SOAP`, `DAP`, `PROGRESS`, `GENERAL`)
- `content` (encrypted at rest — structured JSON per note type)
- `createdAt`
- `updatedAt`
- `status` (enum: `DRAFT`, `SIGNED`, `AMENDED`)
- Signed notes are immutable; amendments create a linked new note

**Acceptance criteria:**
- [ ] DynamoDB table created with encryption and PITR
- [ ] CRUD operations work through API
- [ ] Only the note's provider can edit it
- [ ] Signed notes cannot be modified (only amended)
- [ ] All notes access audit-logged
- [ ] Note editor has auto-save (draft mode)
- [ ] Note templates for SOAP/DAP note types
- [ ] Patients CANNOT see clinical notes (provider-only)
- [ ] Unit tests for CRUD Lambda
- [ ] Input validation on all note fields

### 6.4 — Secure Provider-Patient Messaging

**What:** Add encrypted asynchronous messaging between providers and their patients.

**Where to create:**
- DynamoDB table: `messages` in Terraform
- `packages/lambdas/messaging/` — send + retrieve Lambda
- API endpoints: `POST /messages`, `GET /messages/{conversationId}`
- `prototype-web/src/pages/shared/Messages.tsx` — shared (both roles)
- `prototype-web/src/components/shared/MessageThread.tsx`
- `prototype-web/src/components/shared/MessageComposer.tsx`

**Requirements:**
- Messages encrypted at rest (DynamoDB encryption + application-level encryption for content field)
- Patients can only message their assigned provider
- Providers can message any of their assigned patients
- Read receipts tracked (timestamp when recipient opens message)
- Unread count shown in navigation badge
- Messages cannot be deleted (audit requirement) — but can be archived

**Schema:**
- `PK`: `CONV#<patientId>#<providerId>`
- `SK`: `MSG#<timestamp>#<messageId>`
- `senderId`, `senderRole`, `content` (encrypted), `readAt`, `createdAt`

**Acceptance criteria:**
- [ ] Messages table created with encryption and PITR
- [ ] Patient can send/receive messages to/from their provider
- [ ] Provider can send/receive messages to/from their patients
- [ ] Patient cannot message a non-assigned provider
- [ ] Message content encrypted at application level
- [ ] Read receipts tracked and displayed
- [ ] Unread indicator in navigation
- [ ] All message access audit-logged
- [ ] Input validation (max length, no scripts)
- [ ] Unit tests for messaging Lambda
- [ ] Accessible message UI (keyboard nav, screen reader)

### 6.5 — Alert Severity & Provider Configuration

**What:** Add severity levels to alerts and allow providers to configure notification preferences.

**Where to modify:**
- `alert-router` Lambda — add severity classification
- SNS notification — include severity in message
- Crisis events table — add severity field
- Provider dashboard alert queue — sort by severity

**Where to create:**
- `packages/lambdas/provider-preferences/` — CRUD for provider notification settings
- DynamoDB table or attribute: provider notification preferences
- API endpoint: `GET/PUT /provider/preferences`
- `prototype-web/src/pages/provider/NotificationSettings.tsx`

**Severity levels:**
- `CRITICAL` — crisis button activated → immediate notification (email + future SMS)
- `HIGH` — risk score above threshold → notification within 15 minutes (batched)
- `MEDIUM` — unusual pattern detected → daily digest
- `LOW` — informational (new mood entry, journal update) → weekly digest or off

**Provider can configure:**
- Notification channel per severity (email, in-app, both, none — except CRITICAL which is always on)
- Threshold for HIGH (customizable risk score cutoff)
- Digest schedule for MEDIUM/LOW
- Quiet hours (no non-CRITICAL notifications between configurable times)

**Acceptance criteria:**
- [ ] All alerts classified by severity
- [ ] Provider notification preferences configurable via UI
- [ ] CRITICAL alerts always delivered (cannot be turned off)
- [ ] HIGH alerts batched and delivered per preference
- [ ] MEDIUM/LOW follow digest schedule
- [ ] Quiet hours respected for non-CRITICAL
- [ ] Provider preferences persisted in DynamoDB
- [ ] Unit tests for severity classification logic
- [ ] Unit tests for batching/scheduling logic

### 6.6 — Patient Risk Stratification View

**What:** Visualize risk scores and trends for providers to identify patients needing attention.

**Where to create:**
- `prototype-web/src/pages/provider/RiskDashboard.tsx`
- `prototype-web/src/components/provider/RiskTrendChart.tsx` — line chart of risk over time
- `prototype-web/src/components/provider/RiskHeatMap.tsx` — grid view of all patients by risk

**Where to modify:**
- Risk scoring Lambda output — ensure historical scores are retained (not just latest)

**Features:**
- Sortable patient list by current risk score
- Trend chart per patient (last 30/60/90 days)
- Configurable risk threshold line on charts
- Color coding: green (0-25), yellow (26-50), orange (51-75), red (76-100)
- Drill-down from risk view → patient detail

**Acceptance criteria:**
- [ ] Risk dashboard renders with current data
- [ ] Trend chart shows historical risk scores
- [ ] Sorting and filtering functional
- [ ] Color coding correct per thresholds
- [ ] Chart accessible (data table alternative for screen readers)
- [ ] Loading/error/empty states present
- [ ] Unit tests for chart components

---

### Phase 4 Gate Review

- [ ] All 6 items (6.1–6.6) complete with all acceptance criteria met
- [ ] Provider can: view patients, write notes, send messages, see risks, manage alerts
- [ ] Patient flows unaffected by provider additions
- [ ] RBAC enforced — verified with cross-role access attempts
- [ ] All new code has unit tests meeting coverage thresholds
- [ ] All new UI accessible
- [ ] All new endpoints have input validation, audit logging, error handling
- [ ] All Phase 1, 2, 3 items still passing
- [ ] Git tag created: `phase4-provider-experience-complete`

---

## 7. Phase 5 — Compliance, Polish & Launch Readiness (Week 8-10)

> **GATE:** Phase 4 must be complete. No exceptions.

### 7.1 — HIPAA Risk Assessment Document

**What:** Formalize the security and compliance posture into an official risk assessment document.

**Where to create:**
- `docs/compliance/hipaa-risk-assessment.md`

**Contents:**
- Asset inventory (all AWS resources handling PHI)
- Threat identification (what could go wrong)
- Vulnerability assessment (what weaknesses exist)
- Risk rating per vulnerability (likelihood x impact)
- Mitigation measures implemented (reference Phase 1-4 items)
- Residual risk acceptance (what risks remain and why they're acceptable)
- Review schedule (quarterly)

**Acceptance criteria:**
- [ ] Document exists and covers all required sections
- [ ] Every AWS resource handling PHI is listed
- [ ] Every Phase 1 security item is referenced as a mitigation
- [ ] Residual risks explicitly documented
- [ ] Review date set for 90 days out

### 7.2 — Data Retention & Disposal Policy

**What:** Define and implement data retention rules.

**Where to create:**
- `docs/compliance/data-retention-policy.md`
- DynamoDB TTL configurations in Terraform

**Retention schedule:**
| Data Type | Retention | Mechanism |
|-----------|-----------|-----------|
| Clinical notes | 7 years from last update | DynamoDB TTL |
| Mood entries | 7 years from creation | DynamoDB TTL |
| Journal entries | 7 years from creation | DynamoDB TTL |
| Crisis events | 7 years from creation | DynamoDB TTL |
| Risk scores | 7 years from creation | DynamoDB TTL |
| Audit logs | 7 years from creation | DynamoDB TTL + CloudWatch retention |
| Session/auth logs | 1 year | CloudWatch retention policy |
| Messages | 7 years from creation | DynamoDB TTL |
| Deleted account data | 30 days post-deletion (soft delete) then permanent purge | Lambda scheduled job |

**Acceptance criteria:**
- [ ] Policy document exists
- [ ] TTL attribute set on all DynamoDB tables
- [ ] CloudWatch log group retention set appropriately
- [ ] Account deletion flow implemented (soft delete then permanent purge)
- [ ] Purge job Lambda created and scheduled

### 7.3 — Incident Response & Breach Notification Runbook

**What:** Document the process for responding to security incidents and potential breaches.

**Where to create:**
- `docs/compliance/incident-response-runbook.md`

**Contents:**
- Incident severity classification
- Contact list (who to notify at each severity)
- Detection methods (GuardDuty, CloudTrail, application monitoring)
- Containment steps per incident type
- Investigation procedures
- HIPAA breach notification requirements (HHS notification within 60 days, patient notification without unreasonable delay)
- Post-incident review template
- Evidence preservation procedures

**Acceptance criteria:**
- [ ] Runbook exists with all sections
- [ ] Contact list populated
- [ ] HIPAA breach notification timeline documented
- [ ] Runbook reviewed and understood by all team members

### 7.4 — Monitoring, Alerting & Observability

**What:** Add comprehensive monitoring and alerting for the platform.

**Where to create:**
- `packages/infra/terraform/modules/monitoring/` — CloudWatch alarms and dashboards

**Alarms to create:**
| Metric | Threshold | Action |
|--------|-----------|--------|
| API Gateway 5xx rate | > 1% for 5 minutes | SNS → ops email |
| API Gateway latency P99 | > 3 seconds for 5 minutes | SNS → ops email |
| Lambda errors | > 5 in 5 minutes per function | SNS → ops email |
| Lambda duration P99 | > 80% of timeout | SNS → ops email |
| DynamoDB throttled requests | > 0 for 1 minute | SNS → ops email |
| DynamoDB read/write capacity | > 80% for 5 minutes | SNS → ops email |
| CloudFront 5xx rate | > 1% for 5 minutes | SNS → ops email |
| WAF blocked requests spike | > 100 in 1 minute | SNS → ops email |
| Crisis alert Lambda errors | ANY error | SNS → ops email (CRITICAL) |

**CloudWatch dashboard:**
- API request volume (24h)
- Error rates by endpoint
- Latency percentiles
- Lambda invocations and errors
- DynamoDB consumed capacity
- Active users (based on auth events)
- Crisis events (rolling 7 days)

**Health check endpoint:**
- Create `packages/lambdas/health-check/` — health endpoint
- API endpoint: `GET /health`
- Verifies: DynamoDB reachable (attempt read), Cognito reachable (describe user pool)
- Returns `200` with component status or `503` if any dependency down

**Acceptance criteria:**
- [ ] All alarms created in Terraform
- [ ] Alarms fire to correct SNS topics
- [ ] CloudWatch dashboard created and accessible
- [ ] Health check endpoint returns component-level status
- [ ] Crisis Lambda alarm is highest priority
- [ ] Ops team email receives test alarm

### 7.5 — Staging Environment

**What:** Create a staging environment that mirrors production.

**Where to modify:**
- Terraform workspace or variable file for staging
- CI/CD pipeline — add staging deployment before production

**Requirements:**
- Same Terraform modules as production
- Separate AWS account or at minimum separate resource naming (`peacefull-staging-*`)
- Separate Cognito user pool
- Separate DynamoDB tables
- Separate S3 bucket + CloudFront
- CD pipeline: merge to `develop` → deploy to staging; merge to `main` → deploy to production
- Staging uses same WAF rules, same security configuration

**Acceptance criteria:**
- [ ] Staging environment fully deployed and functional
- [ ] Staging uses identical Terraform modules
- [ ] CD pipeline deploys to staging on `develop` branch
- [ ] E2E tests run against staging in CI
- [ ] Staging is NOT accessible to real patients (require specific Cognito accounts)

### 7.6 — Internationalization (i18n) Framework

**What:** Add multi-language support framework to the frontend.

**Where to create:**
- `prototype-web/src/i18n/` — i18n configuration
- `prototype-web/src/i18n/locales/en.json` — English translations
- `prototype-web/src/i18n/locales/es.json` — Spanish translations (initial)

**Where to modify:**
- All components — replace hardcoded strings with translation keys
- App root — wrap with i18n provider

**Framework:** `react-i18next` with `i18next`

**Phase 5 scope:** English complete, Spanish started (crisis-related strings mandatory in Spanish), framework ready for additional languages.

**Acceptance criteria:**
- [ ] i18n framework configured
- [ ] All hardcoded user-facing strings extracted to `en.json`
- [ ] Crisis-related strings translated to Spanish
- [ ] Language switcher in settings
- [ ] Correct language renders per selection
- [ ] RTL layout support foundation (for future Arabic/Hebrew)

### 7.7 — Performance Optimization & Lighthouse Audit

**What:** Optimize frontend performance and achieve Lighthouse scores >= 90 in all categories.

**Where to modify:**
- `prototype-web/vite.config.ts` — code splitting, tree shaking, chunk optimization
- Components — lazy loading for routes
- Images — optimize, use WebP, add dimensions
- Fonts — preload critical fonts

**Targets:**
| Category | Target |
|----------|--------|
| Performance | >= 90 |
| Accessibility | >= 95 |
| Best Practices | >= 95 |
| SEO | >= 90 |

**Acceptance criteria:**
- [ ] Route-level code splitting implemented
- [ ] Lighthouse CI runs in pipeline
- [ ] All 4 scores meet targets
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size analyzed and documented (no single chunk > 250KB)

### 7.8 — Penetration Test Preparation

**What:** Prepare the platform for external penetration testing.

**Where to create:**
- `docs/security/pentest-scope.md` — defines what to test
- `docs/security/pentest-checklist.md` — pre-test verification

**Scope document includes:**
- All API endpoints with authentication requirements
- All frontend routes
- Infrastructure endpoints (CloudFront, API Gateway)
- Exclude list (third-party services, AWS infra itself)
- Rules of engagement (no destructive testing, no real PHI in test env)
- Test environment details (staging, not prod)

**Pre-test checklist:**
- [ ] All Phase 1 security items verified
- [ ] Staging environment ready with test data
- [ ] Monitoring active to observe test traffic
- [ ] Rollback plan documented
- [ ] Test accounts created for each role (patient, provider, admin)

**Acceptance criteria:**
- [ ] Scope document complete
- [ ] Pre-test checklist all items checked
- [ ] Staging environment populated with realistic (synthetic) test data
- [ ] Penetration test firm identified (or date scheduled for internal test)

---

### Phase 5 Gate Review (Launch Readiness)

- [ ] All 8 items (7.1–7.8) complete with all acceptance criteria met
- [ ] HIPAA risk assessment documented
- [ ] Data retention policy implemented
- [ ] Incident response runbook exists
- [ ] Monitoring and alerting operational
- [ ] Staging environment functional
- [ ] i18n framework active with English + Spanish crisis strings
- [ ] Lighthouse scores >= 90
- [ ] Penetration test preparation complete
- [ ] ALL items from ALL phases verified (full regression)
- [ ] Git tag created: `phase5-launch-ready`

---

## 8. Verification Protocol

After each phase AND after all phases:

### Per-Item Verification

1. Read the acceptance criteria for the item
2. Verify each criterion independently
3. Document pass/fail for each criterion
4. If ANY criterion fails, the item is NOT complete — fix before proceeding

### Per-Phase Gate Review

1. Every item in the phase must pass per-item verification
2. Run full build: `cd prototype-web && npm ci && npm run build`
3. Run full test suite: `npm test -- --coverage`
4. Run lint: `npm run lint`
5. Run type check: `npx tsc --noEmit`
6. Run security audit: `npm audit --audit-level=high`
7. Run Terraform validate: `cd packages/infra/terraform && terraform validate`
8. Verify previous phases haven't regressed (run their gate reviews again)
9. Create git tag for the phase
10. Document completion in this PRD (update status field)

### Final Verification (Post Phase 5)

1. All phase gate reviews pass simultaneously
2. E2E tests pass against staging
3. Lighthouse audit passes
4. Manual walkthrough of all patient flows
5. Manual walkthrough of all provider flows
6. Security scan clean
7. Someone other than the implementer reviews each phase

---

## 9. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R01 | VPC for Lambda increases cold start latency | High | Medium | Measure impact; use provisioned concurrency for crisis Lambda |
| R02 | Strict TypeScript breaks many files | High | Low | Budget extra time; systematic file-by-file approach |
| R03 | WAF false positives block legitimate requests | Medium | High | Start in COUNT mode; tune rules before switching to BLOCK |
| R04 | i18n extraction misses strings | Medium | Low | Automated scanner for untranslated strings |
| R05 | Provider features scope creep | Medium | Medium | Strict adherence to PRD scope — no freelancing |
| R06 | E2E tests flaky in CI | Medium | Medium | Add retry logic; use stable selectors; run against dedicated staging |
| R07 | Existing frontend breaks during migration | Medium | High | Run build + deploy verification after every single item |
| R08 | Penetration test reveals critical vulnerability | Medium | High | Budget time after pentest for remediation sprint |
| R09 | AWS service limits hit during staging creation | Low | Medium | Request limit increases proactively |
| R10 | Team unfamiliar with aws-jwt-verify | Low | Low | Clear documentation and examples in shared module |

---

## 10. Definition of Done

This PRD is **DONE** when and only when:

1. All 41 items across 5 phases are complete
2. All acceptance criteria for all items verified
3. All 5 phase gate reviews pass
4. Final verification protocol complete
5. All git tags created
6. Zero ESLint errors
7. Zero TypeScript errors
8. Unit test coverage >= 80% (100% on critical paths)
9. E2E tests pass
10. Lighthouse scores >= 90
11. Security audit clean
12. HIPAA documentation complete
13. Staging environment operational
14. Monitoring and alerting active
15. Code reviewed by someone other than the implementer

**ANYTHING LESS THAN ALL 15 ITEMS = NOT DONE.**

---

*This PRD is a living document. Any modifications require documented justification and do not reduce scope — they may only clarify or expand.*
