# MVP V1 Readiness Reassessment - 2026-03-07

## Audit Prompt Used

```text
Review repo memory, current source, automated test evidence, and live smoke results to determine the true MVP V1 readiness of both the repository and the deployed platform. Weight verified evidence above stale launch documents. Output: current stage, percentage complete, launch verdict, blockers, bugs, refactor needs, red-team hardening gaps, page/button/API verification status, super-admin bootstrap status, missing security/compliance/capability work, and a phased PRD to reach release candidate.
```

## Executive Verdict

- Stage: Stage 4 of 5 - stabilization and production hardening
- Repository readiness: 82%
- Live platform readiness: 61%
- Combined MVP V1 readiness: 72%
- Release verdict: NO-GO for live MVP V1 until the blockers below are closed

Why the score is not lower:
- Core product flows, backend APIs, and local browser tests are largely working.
- Local validation is materially stronger than the older launch docs suggest.

Why the score is not higher:
- The live frontend is currently failing post-login authenticated journeys.
- A production super admin has not been provisioned yet.
- Security/compliance/operational hardening is incomplete for a mental-health platform handling PHI.

## Verified Evidence

### Local repository verification

| Area | Result |
|------|--------|
| API typecheck | PASS |
| API lint | PASS |
| API build | PASS |
| API tests | PASS - 158/158 |
| Frontend lint | PASS - 0 errors, 39 warnings |
| Frontend build | PASS |
| Frontend tests | PASS - 120/120 |
| Local Playwright suite | PASS - 15 passed, 1 skipped |

### Production verification

| Check | Result |
|------|--------|
| Public site load | PASS |
| Login page load | PASS |
| Register page load | PASS |
| Unknown route redirect | PASS |
| Unauthenticated patient redirect | PASS |
| Unauthenticated clinician redirect | PASS |
| Security headers smoke | PASS |
| Authenticated patient login journey | FAIL |
| Authenticated patient flow after login | FAIL |
| Related refresh/retry path | FAIL |

### Observed live production failure chain

1. `POST /api/v1/auth/login` returned `200` with valid tokens.
2. The next authenticated request returned `401 Missing or malformed Authorization header`.
3. Refresh then returned `400`.
4. The browser remained on `/login`.

This is consistent with frontend auth-mode drift: the deployed frontend was behaving like cookie mode while the backend required bearer tokens. The repository now includes a bearer-first client fix, but that fix is not deployed yet.

### Additional live issue observed

- `wss://peacefullai.netlify.app/ws?...` returned `404` during handshake.

## Current Stage by Area

| Area | Score | Notes |
|------|-------|-------|
| Product scope implemented | 85% | Core patient, clinician, org-management, MFA, consent, and safety surfaces exist. |
| Backend correctness | 83% | Core APIs are present and tests are green; org approval deadlock and escalation role bug were fixed in repo. |
| Frontend integration | 80% | Local UI/tests are healthy; production auth transport drift is still blocking real journeys. |
| Automated verification | 84% | Strong local test/build evidence plus local browser coverage; live authenticated coverage is incomplete. |
| Production deployment parity | 52% | The deployed frontend is out of sync with the validated code path. |
| Security/compliance readiness | 48% | Some controls exist, but launch-grade hardening evidence is incomplete. |

## Critical Blockers

| Priority | Blocker | Current State | Required Action |
|----------|---------|---------------|-----------------|
| P0 | Live auth transport regression | Fixed in repo, not deployed | Deploy the updated frontend auth client and rerun production smoke tests. |
| P0 | No live super-admin bootstrap completed | Dry-run only | Execute the new production seed path with the exact admin email and tenant slug. |
| P0 | Clinician approval deadlock when no supervisors exist | Fixed in repo, not deployed | Deploy admin approval endpoints/UI and verify the first clinician approval path live. |
| P0 | WebSocket handshake returns 404 in production | Open | Either provision the WS route/service or disable socket bootstrap until available. |
| P1 | No verified release gate preventing env/config drift | Open | Add deploy smoke that proves live login, consent, and dashboard navigation after each production build. |
| P1 | No completed security/compliance release sign-off | Open | Finish hardening, observability, retention, and compliance gates before launch. |

## Bugs, Issues, and Refactor Needs

### Fixed in repository during this reassessment

- Admin fallback approval path added when no clinical supervisors exist.
- Platform admins can now list, approve, and reject pending clinicians.
- Organization moderation logic now allows admin bypass without org membership.
- Notification escalation lookup no longer uses the wrong care-team role string.
- Auth/job-queue imports were made lazy so API tests no longer time out.
- Frontend auth client now sends bearer tokens even if `VITE_AUTH_MODE=cookie`.
- Frontend auth refresh now prefers bearer refresh payloads before cookie fallback.

### Still needing follow-up

1. `prototype-web` still has 39 lint warnings. This is not release-blocking by itself, but it signals maintainability debt.
2. Auth configuration is still conceptually split between "cookie" and "bearer" modes. The deploy pipeline needs a single authoritative production contract.
3. Large route/service files should be split by responsibility, especially org moderation and notification logic.
4. WebSocket behavior lacks a robust feature flag or graceful no-socket fallback.
5. Production verification is too dependent on manual confidence rather than post-deploy automated checks.
6. Existing docs contain stale "CONDITIONAL GO" and "UNCONDITIONAL GO" conclusions that no longer match live evidence.

## Red-Team Hardening Assessment

### Controls confirmed in code or tests

- Rate limiting exists across multiple API domains.
- JWT auth, MFA, and step-up flows exist.
- PHI encryption and PHI-redacted logging exist.
- Security headers are at least partially present in live smoke tests.
- Tenant-scoped and role-based controls exist and now include the admin approval escape hatch.

### Gaps that still need explicit release-grade evidence

| Priority | Gap | Why it matters |
|----------|-----|----------------|
| P0 | WAF / bot / abusive-IP layer not verified | Public auth and PHI endpoints need outer-layer abuse controls. |
| P0 | External red-team or penetration test not completed | A mental-health platform should not launch on self-attestation alone. |
| P0 | Observability stack not fully verified (Sentry, centralized logs, uptime alerting) | Failures like the current auth regression should be obvious immediately. |
| P0 | Backup restore and disaster-recovery drills not evidenced | Launching without restore proof is not acceptable for PHI workloads. |
| P1 | Account lockout and auth abuse throttling evidence incomplete | MFA alone is not enough if brute-force controls are weak. |
| P1 | Refresh-token rotation and revocation proof not fully demonstrated end to end | Critical for session abuse containment. |
| P1 | Audit coverage for PHI read events is not fully proven | Compliance and forensic gaps remain. |
| P1 | File upload and presign threat controls are not fully documented | Needed for SSRF/malware/path abuse prevention. |
| P1 | Dependency audit, SBOM, and supply-chain gating are not part of this validation pass | Required for launch hardening. |
| P1 | Retention, purge, legal hold, and consent-revocation operational flows are incomplete | Needed for HIPAA/privacy posture. |

## Page, Button, and API Verification Status

### Verified

- Local critical user journeys through Playwright:
  - public smoke
  - patient check-in
  - clinician review
  - registration flow
- Local frontend component/integration coverage:
  - 120 tests across auth, domain UI, session notes, step-up auth, organization access, and API client behavior
- Local API route/service coverage:
  - 158 tests including auth, organizations, notifications, job queue, and routes

### Not yet fully verified live

- Every authenticated patient page
- Every authenticated clinician page
- Every admin moderation action in production
- Every button/page permutation on mobile and tablet
- All WebSocket-dependent surfaces
- Full live API matrix against the deployed environment

Conclusion: the repository is heavily tested, but the platform is not yet "every button and page" verified in live production because the current auth regression blocks that level of coverage.

## Missing Work That Would Improve Security, Capability, and Compliance

### Security / compliance

1. Production WAF, IP reputation filtering, and anomaly detection.
2. Centralized alerting plus Sentry or equivalent error tracking.
3. Formal retention and deletion automation for PHI and audit data.
4. Backup restore testing and disaster-recovery runbooks with timestamps and owners.
5. External penetration test and remediation sign-off.
6. BAA / subprocessor inventory / compliance evidence package.
7. Security regression checks in CI for live login, headers, auth refresh, and tenant isolation.

### Capability / operations

1. Deployed platform-admin approval console with live operator playbook.
2. Feature-flagged WebSocket bootstrap or a non-socket fallback UX.
3. Staging environment with production parity and seeded non-PHI test data.
4. Post-deploy canary smoke tests with rollback criteria.
5. Queue/worker health dashboards for background jobs and email delivery.

### Product quality

1. Remaining lint-warning cleanup and targeted refactors on oversized modules.
2. Bundle-size reduction for the largest frontend chunks.
3. More authenticated Playwright coverage across patient, clinician, and admin roles.
4. Explicit accessibility regression checks in CI.

## Production Super Admin Bootstrap Status

### What was added

- New script: `packages/api/prisma/seed-super-admin.ts`
- New package script: `npm run db:seed-super-admin`

### What was verified

- Dry-run succeeded for:
  - email: `admin@peacefull.cloud`
  - tenant slug: `peacefull-health`
  - role: `ADMIN`
  - status: `ACTIVE`

### What is still blocked

- The live mutation has not been executed.
- The current shell did not have `DATABASE_URL` exported.
- The exact production admin email and target tenant slug still need confirmation before mutating live data.

### Recommended live command once confirmed

```bash
cd packages/api
npm run db:seed-super-admin -- --email <confirmed-email> --tenant-slug <confirmed-tenant> --first-name Super --last-name Admin
```

After execution, require immediate MFA enrollment and a password reset.

## PRD Extension - MVP V1 Recovery Plan

### PRD-0 Goal

Move the platform from "locally healthy but live-blocked" to an MVP V1 release candidate with verified production auth, admin bootstrap, security hardening, and launch evidence.

### PRD-1 Non-Negotiable Release Criteria

1. Live patient login works end to end.
2. Live clinician login and approval flow work end to end.
3. A production super admin exists, has MFA enabled, and can approve the first clinician.
4. No production WebSocket 404s or silent socket failures remain.
5. Local build, lint, backend tests, frontend tests, and critical Playwright suites stay green.
6. Production smoke is green for patient, clinician, admin, and security paths.
7. Red-team, observability, retention, and rollback gates are complete.

### PRD-2 Phase A - Immediate Production Recovery (0-24 hours)

| ID | Task | Output |
|----|------|--------|
| A1 | Deploy the updated frontend auth client | Bearer header attached after live login; patient flow passes |
| A2 | Provision the production super admin | Active admin can enter org-management approvals |
| A3 | Deploy admin pending-clinician endpoints/UI | Admin can approve first clinician without supervisor deadlock |
| A4 | Resolve or disable broken WebSocket bootstrap | No `/ws` 404 noise in live journeys |
| A5 | Rerun production smoke immediately after deploy | New dated evidence replaces stale launch claims |

### PRD-3 Phase B - Functional Verification and Cleanup (24-72 hours)

| ID | Task | Output |
|----|------|--------|
| B1 | Expand authenticated Playwright coverage for patient, clinician, and admin | Critical button/page coverage on live and local |
| B2 | Add post-deploy canary suite to CI/CD | Deploy drift detected automatically |
| B3 | Close remaining frontend lint warnings with priority on auth, a11y, and complexity | Lower maintenance risk |
| B4 | Refactor large org/notification/auth modules | Cleaner ownership and lower regression surface |
| B5 | Validate every critical API used by the main journeys against production | Route matrix with pass/fail evidence |

### PRD-4 Phase C - Security and Compliance Hardening (3-10 days)

| ID | Task | Output |
|----|------|--------|
| C1 | Verify rate limits, lockout, refresh rotation, revocation, and MFA fallback behaviors | Auth abuse controls signed off |
| C2 | Add centralized error tracking, uptime monitoring, and production alert routing | Operational visibility |
| C3 | Validate WAF, headers, and perimeter controls | Layered defense in place |
| C4 | Complete audit-read coverage, retention policy, deletion flows, and restore drills | Compliance posture materially stronger |
| C5 | Run external penetration test or formal red-team review | Independent security evidence |

### PRD-5 Phase D - Launch Gate (after Phase C)

| ID | Task | Output |
|----|------|--------|
| D1 | Run full production smoke on public routes and authenticated journeys | Final pass/fail record |
| D2 | Run staged load and resilience tests with rollback criteria | Performance confidence |
| D3 | Freeze production env contract and document operator runbooks | Less config drift |
| D4 | Obtain final launch sign-off from engineering, security, and product owners | Documented MVP V1 go/no-go |

### PRD-6 Ownership

| Workstream | Owner |
|------------|-------|
| Auth/deploy parity | Frontend + DevOps |
| Admin bootstrap and org approvals | Backend |
| Browser verification | QA / Playwright |
| Security hardening | Security + Backend |
| Compliance and ops evidence | Product + Security + DevOps |

### PRD-7 Final Release Decision Rule

Do not call this platform "MVP V1 ready" until Phase A and Phase B are complete and Phase C has at least closed the P0/P1 controls listed in this document. The repository is close. The live deployment is not.
