# 🔴 MANDATORY: READ BEFORE ANY WORK

> **ALL SUBAGENTS, DEVELOPERS, AND AUTOMATION MUST READ AND FULLY COMPLY WITH THE FOLLOWING PRD BEFORE PERFORMING ANY WORK ON THIS CODEBASE.**
> **FAILURE TO COMPLY WITH ANY ITEM IS A BLOCKING VIOLATION. NO EXCEPTIONS. NO WORKAROUNDS. NO PARTIAL DELIVERY.**

---

## 🟢 ACTIVE PRD: PRD-MVP-STABILIZE-2026-001 (MVP Stabilization + Demo Environment)

### Continued Changes & Improvements (2026-03-07)
- Added a new reality-based readiness report and PRD extension in [MVP_V1_READINESS_REASSESSMENT_2026-03-07.md](./MVP_V1_READINESS_REASSESSMENT_2026-03-07.md).
- Repository validation is currently stronger than live deployment validation: API checks are green (`158/158`), frontend checks are green (`120/120`), and local Playwright critical flows passed (`15 passed`, `1 skipped`).
- Production is not MVP V1 ready yet: live auth still regresses after login, the first live super-admin account has not been provisioned, and the production websocket handshake returns `404`.
- Admin fallback approval paths were implemented in repo so platform admins can approve pending clinicians when no supervisor exists, but this still requires deployment plus live verification.
- This section supersedes older "go" or "unconditional go" claims anywhere else in the repository unless a newer dated verification record explicitly replaces it.

### Continued Changes & Improvements (2026-03-05)
- Fixed AI Companion SSE mock to read `messages` array (prevents offline-mode fallback) and emit `sessionId` on first chunk for continuity.
- Made patient profile endpoints session-aware so real patient logins no longer see the hardcoded demo profile.
- Aligned consent mocks and AuthGuard to canonical `ConsentRecord` (`consentType`/`accepted`), eliminating data-shape drift.
- Added missing org/voice mock handlers and corrected submission source to `VOICE_MEMO`; patient responses now include `tenantId` and optional `summary` field.
- Validation gates remain green: `tsc --noEmit`, tests (92/92), and build/bundle budget.

### Process Rule (Mandatory)
- Every change must update both this README and the baseline log in `3.4.26PT1.md`, and both must be read before starting new work to maintain continuity and avoid drift.

**Scope:** Frontend (Netlify), Backend (ECS/API), Infra, Data, Security  
**Goal:** Fully working, pilot-ready MVP plus a separate demo environment with synthetic data; hardened against abuse; fast, reliable builds; guardrails against drift.  
**Model:** GPT-5.1-Codex-Max (GitHub Copilot)  
**Execution order (must follow):** Phase A → B → C → D → E → F → G

### 1) Pain Points (Observed)
- Mixed auth paths; env drift enabling MSW; CSP/CORS misconfig
- API contract mismatches (`userId` vs `patientId`), incomplete auth payloads, 404s on valid routes
- Deploy drift: Netlify auto-build vs manual; ECS using different DB than seeds
- MSW in prod; runtime blanks on API errors; audit middleware FK failures
- CSP blocking fonts/API; CORS wildcard stripped; unseeded prod DB

### 2) Objectives (Definition of Done)
- Auth E2E (login/register/logout/refresh/MFA) against production API
- Critical flows green: journal, check-in, AI chat, clinician & patient dashboards
- No mock mode in production (MSW off except demo)
- CSP/CORS clean; no console errors; fonts/API reachable
- Prod DB seeded; ECS/API uses that DB; no 404/500 on valid flows
- User-facing error handling; no blank screens
- Demo environment live, synthetic-only, clearly labeled “Demo”
- Builds fast and reproducible; tests/type-checks pass; performance budgets respected
- Red-team gates enforced pre-release

### 3) Phased Work Plan (Ordered, Blocking)
- **Phase A — Env & Config Hygiene:** Netlify env set; disable MSW in prod; explicit CORS/CSP; clear cache and redeploy
- **Phase B — Backend Contract & Data Alignment:** Accept `patientId` or `userId`; full auth payload; seed real DB; audit middleware safe
- **Phase C — Frontend Auth & API Integration:** Single auth path (direct API); login/register wiring; API client headers; user toasts; MSW excluded in prod
- **Phase D — CSP/CORS & Proxy Verification:** Netlify redirects `/api/v1/*` → ALB; preflight passes; CSP console clean
- **Phase E — End-to-End Smoke Tests:** Login, journal, check-in, AI chat, clinician view, logout, crisis alert
- **Phase F — Deployment Confidence:** Netlify auto-deploy green; ECS healthy with correct image/secrets/DB; tag `mvp-stable`
- **Phase G — Demo Environment (Synthetic Data):** Separate Netlify demo site; synthetic data via MSW or demo API; labeled “Demo”; run demo smoke tests

### 4) Red-Team Hardening Gates (Must Pass Before Release)
- Auth/session abuse protections (throttling/lockout, refresh rotation, strict aud/iss)
- CORS/CSP explicit origins; no wildcards; minimal inline; allow fonts/API explicitly
- Secrets/config only via env/Secrets Manager; no secrets in repo/logs; audit `.env`
- Server-side validation; output encoding; AI endpoints rate-limited; payload/upload limits
- No PHI in logs; audit logging tenant-scoped; crisis paths prioritized
- Transport headers: HSTS; secure cookies; SameSite; no mixed content
- Dependency/supply chain: `npm audit` gate; lockfile integrity; no `latest` Docker tags
- RCE/SSRF/LFI: block arbitrary proxying; validate presign targets; no dynamic require on user input

### 5) Code Quality, Compiling, Speed Gates
- `tsc --noEmit` clean; strict; no `any`
- ESLint/Prettier clean; no `console.log` in prod (except `error`)
- Tests: unit+integration ≥80% coverage; critical flows planned tests at 100%; vitest/jest green
- Build: Vite <60s CI; bundle budget <500KB gzip main; track regressions
- Runtime perf: LCP <2.5s on Netlify; avoid blocking fonts; cache headers set
- CI gates: lint, test, tsc, build; fail on CSP/CORS smoke assertions
- Observability: error boundary + toasts; Sentry (or equivalent); API logs with correlation IDs

### 6) Anti-Drift Guardrails
- Single source of truth: Netlify env (frontend), AWS Secrets (backend); no local `.env` baked into builds
- Protected main; PRs require green CI (lint/test/tsc/build)
- Config freeze for pilot: changes via PR checklist (CSP/CORS/ENV reviewed)
- No manual prod edits; deploy only via CI/Netlify auto; clear cache on env change

### 7) Parallel Subagents (Specialized Workstreams)
- Env/Config agent: Netlify env, CORS/CSP, MSW off in prod, redirects/proxy
- Backend Contract agent: ID resolver, auth payload, audit middleware, seeds, CORS backend
- Frontend Auth/API agent: Login/Register wiring, API client, error toasts, MSW exclusion
- Security/Red-Team agent: gates, rate limits, headers, dependency audit, PHI logging guard
- Demo agent: demo Netlify site, synthetic seeds/MSW fixtures, labeling, demo CSP
- QA/Perf agent: smoke tests, perf budgets (LCP/bundle), CI gates, CSP/CORS console checks

### 8) Demo Environment (Synthetic Data) Requirements
- Separate Netlify site (e.g., `peacefull-ai-demo-static`)
- `VITE_ENV=demo`; `VITE_ENABLE_MOCKS=true` with bundled MSW **or** dedicated demo API/DB seeded with synthetic data only
- Clear “Demo” labeling; disable PHI and real account creation (or synthetic-only users)
- CSP/CORS tailored to demo; MSW allowed only here
- Demo smoke tests: login, journal, check-in, AI chat (mocked)

### 9) Acceptance Criteria
- No console CSP/CORS errors in production
- MSW not registered in MVP; allowed only in demo (if chosen)
- Pilot smoke tests pass with seeded prod DB and aligned ECS secrets
- Red-team gates signed off (auth/session, secrets, CORS/CSP, rate limits, logging)
- CI green: lint, tests, tsc, build within budgets
- Demo environment live, synthetic-only, labeled; safe to share
- Netlify deploy history green; ECS tasks healthy; DB source aligned

### 10) Risks & Mitigations
- Env drift: enforce CI builds; clear cache on env change; config PR checklist
- CORS lockout: keep localhost allowlisted during verification; preflight tests before release
- DB mismatch: verify `DATABASE_URL` before smoke; snapshot before reseed
- Auth confusion: keep Auth0 redirect off until stable; document single auth path for MVP
- Demo leakage: isolate demo data, read-only, labeled UI “Demo”

### 11) Deliverables
- Clean env/CSP/CORS; MSW disabled in MVP
- Backend contract fixes; seeds on actual prod DB
- Working auth and core flows verified via smoke tests; red-team gates passed
- Netlify/ECS green; tag `mvp-stable`
- Demo Netlify site live with synthetic data, labeled, investor-safe

---

## 🚀 Sprint 1 & Sprint 2 — Platform Value Enhancement

### Sprint 1: Security Hardening (Completed)
| # | Task | Status |
|---|------|--------|
| S1-T01 | RegisterPage patient gating (clinician-only, patients via invite) | ✅ |
| S1-T02 | Backend MFA setup endpoints (`/mfa-setup`, `/mfa-confirm-setup`) | ✅ |
| S1-T03 | `HipaaBadge` reusable component | ✅ |
| S1-T04 | HipaaBadge on Login, Register, Invite, AppShell sidebar | ✅ |
| S1-T05 | ChatPage non-dismissible crisis disclaimer with tel: links | ✅ |
| S1-T06 | SafetyPlanPage 988/911 deep-link buttons (tel:/sms:) | ✅ |
| S1-T07 | MFA enforcement backend (TOTP + backup codes via Redis) | ✅ |
| S1-T08 | LoginPage MFA enrollment redirect for clinicians | ✅ |
| S1-T09 | `MfaEnrollmentPage` (3-step: QR → verify → backup codes) | ✅ |
| S1-T10 | `ConsentVersion` Prisma model | ✅ |
| S1-T11 | ConsentPage version check + re-consent flow (v2.0) | ✅ |
| S1-T12 | `INCIDENT_RESPONSE.md` (SEV levels, HIPAA breach notification) | ✅ |
| S1-T13 | InviteAcceptPage HIPAA badge polish | ✅ |

### Sprint 2: UX & Value Enhancements (Completed)
| # | Task | Status |
|---|------|--------|
| S2-T01 | `MoodTrendChart` — enhanced chart with date range picker + averages | ✅ |
| S2-T02 | `MoodHeatmap` — 90-day GitHub-style mood heatmap | ✅ |
| S2-T03 | Mood visuals integrated into PatientHome dashboard | ✅ |
| S2-T04 | `BreathingExercise` — animated 4-7-8 / Box / Deep breathing | ✅ |
| S2-T05 | BreathingExercise integrated into ResourcesPage | ✅ |
| S2-T06 | `VoiceInput` — Web Speech API speech-to-text component | ✅ |
| S2-T07 | VoiceInput integrated into JournalPage + ChatPage | ✅ |
| S2-T08 | WCAG 2.1 AA audit — aria-labels, roles, focus management | ✅ |
| S2-T09 | Account deletion (frontend + backend — already existed) | ✅ |
| S2-T10 | Data export CSV format option (alongside JSON) | ✅ |
| S2-T11 | Feature flag system (`featureFlags.ts` — env + localStorage) | ✅ |
| S2-T12 | README updated | ✅ |

### New Components Created
- `src/components/domain/MoodTrendChart.tsx` — Recharts line chart with date range picker, clinical thresholds, averages
- `src/components/domain/MoodHeatmap.tsx` — Calendar heatmap, color-coded mood scores (90 days)
- `src/components/domain/BreathingExercise.tsx` — Guided breathing with animated circle, 3 patterns
- `src/components/domain/VoiceInput.tsx` — Web Speech API dictation with interim text display
- `src/components/ui/HipaaBadge.tsx` — HIPAA compliance badge with shield icon
- `src/pages/auth/MfaEnrollmentPage.tsx` — TOTP MFA enrollment wizard
- `src/lib/featureFlags.ts` — Build-time + runtime feature flag system with React hooks

---

## 🧪 Live MVP v1 — Test It Yourself

**Frontend:** https://peacefullai.netlify.app  
**API:** https://api.peacefull.cloud  
**Status:** Live (ECS Fargate × 3, RDS PostgreSQL, Auth0, CloudWatch, SES, SNS)

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | `test.patient.1@peacefull.cloud` | `Demo2026!` |
| Clinician | `pilot.clinician.1@peacefull.cloud` | `Demo2026!` |
| Supervisor | `pilot.supervisor@peacefull.cloud` | `Demo2026!` |

### Quick Smoke Test

1. Open https://peacefullai.netlify.app → redirects to `/login`
2. Login as **Patient** → navigate to Check-in → submit → see AI Reflection (no crash)
3. Login as **Clinician** → Triage Inbox → Caseload → Patient Profile → Review AI Draft
4. Login as **Supervisor** → Dashboard → Analytics → Escalation Queue
5. Register a new clinician → see "Pending Approval" message (no auto-login)
6. Forgot Password link → navigates to `/forgot-password`

### Known Fixes (Phase 1B UX Audit — this commit)

| Fix | File | Detail |
|-----|------|--------|
| SubmissionSuccessPage TypeError | `prototype-web/src/pages/patient/SubmissionSuccessPage.tsx` | Safe access on `evidence`, `patientSummary`, `signalBand`; 404 retry polling (5 attempts × 3s) |
| MSW envelope parity | `prototype-web/src/mocks/handlers.ts` | All mock responses wrapped in `{ data, requestId }` matching production API |
| MSW register PENDING_APPROVAL | `prototype-web/src/mocks/handlers.ts` | Clinician registration returns `PENDING_APPROVAL` status, no tokens |
| E2E credential alignment | `prototype-web/tests/e2e-*.spec.mjs` | Updated from `patient@demo.com` / `password123` to actual demo creds |
| DEPLOY_SMOKE_CHECKLIST updated | `DEPLOY_SMOKE_CHECKLIST.md` | Added post-UX-audit verification steps |
| PRD Phase 5 added | `PRD_REACT_MIGRATION.md` | Phase 5: UX Audit + Production Verification |

---

## ⚠️ ACTIVE PRD: Phase 2 — Security Hardening, Patient Safety, Provider Experience & Code Quality

**Document:** [`PRD_PHASE2_SECURITY_POLISH_PROVIDER.md`](./PRD_PHASE2_SECURITY_POLISH_PROVIDER.md)

**Status:** `IMMEDIATE — Execute upon finalization of current implementation block`

**Priority:** `P0 — Platform CANNOT serve real patient data until Phase 1 + 2 are complete`

**Total Scope:** 41 work items across 5 sequentially-gated phases | 200+ acceptance criteria | 10 weeks estimated

---

## 🛑 EXECUTION RULES — NON-NEGOTIABLE

These rules apply to EVERY subagent, developer, copilot, automation, or human operator touching this codebase from this point forward:

### Rule 1: Read First, Act Second
Before writing a single line of code, read the ENTIRE PRD end-to-end. Read this README section. Read `PRD_REACT_MIGRATION.md` for context on what was built. Understand the full picture before touching anything.

### Rule 2: Sequential Phase Execution
```
Phase 1 (Security) → Phase 2 (Patient Safety) → Phase 3 (Code Quality) → Phase 4 (Provider) → Phase 5 (Compliance)
```
**Each phase is gated.** Phase N+1 CANNOT begin until ALL items in Phase N are complete AND the Phase N gate review passes. No parallelization across phases. No "starting Phase 3 while finishing Phase 2." Hard stops.

### Rule 3: Every Item, Every Criterion
Every numbered item (3.1 through 7.8) must be completed. Every acceptance criterion checkbox under every item must pass. There are no optional items. There are no "nice to haves." Everything in the PRD is required.

### Rule 4: No Placeholder Code
Zero tolerance for:
- `// TODO` comments
- `// FIXME` comments
- `any` types in TypeScript
- `@ts-ignore` directives
- `eslint-disable` without documented justification
- `console.log` in production code
- Hardcoded credentials, API keys, or account IDs
- Commented-out code blocks

### Rule 5: No Scope Creep
Do NOT add features, refactors, "improvements," or "nice to haves" not explicitly listed in the PRD. If you identify something missing, document it as a finding and flag it. Do NOT implement it. The PRD scope is frozen.

### Rule 6: Verify After Every Item
After completing each numbered item:
1. Run `cd prototype-web && npm run build` — must succeed
2. Run `npm test` — must pass
3. Run `npm run lint` — must pass with zero errors
4. Verify all PREVIOUS items still work (no regressions)
5. If any check fails, fix it before moving to the next item

### Rule 7: Commit Discipline
One commit per numbered item. No multi-item commits. No "batch" commits.
```
Format: [PRD-PH2] <Phase#>.<Item#> — <short description>
Example: [PRD-PH2] 1.3 — Add Zod input validation layer for all Lambda functions
```

### Rule 8: Phase Gates Are Hard Stops
At the end of each phase, execute the gate review checklist defined in the PRD. Every checkbox must pass. Create a git tag:
```
phase1-security-foundation-complete
phase2-patient-safety-complete
phase3-code-quality-complete
phase4-provider-experience-complete
phase5-launch-ready
```

### Rule 9: Document All Blockers
If a blocker is encountered:
1. **STOP** — do not skip the item
2. Document: WHAT failed, WHY it failed, WHAT is needed to unblock, IMPACT on downstream items
3. Escalate — do not silently move on

### Rule 10: Patient Safety Is Paramount
This is a **mental health platform**. A bug in the crisis escalation flow could cost a human life. A data leak exposes the most sensitive information a person can have. Every line of code, every configuration, every decision must be made with that gravity. If in doubt, choose the safer option. Always.

---

## 📋 PHASE SUMMARY — QUICK REFERENCE

| Phase | Focus | Items | Key Deliverables | Gate Tag |
|-------|-------|-------|-----------------|----------|
| **1** | Security Foundation | 3.1–3.11 (11 items) | WAF, rate limiting, input validation, CORS lockdown, CSP headers, JWT validation, audit trail, VPC, dependency scanning, PITR, S3 hardening | `phase1-security-foundation-complete` |
| **2** | Patient Safety | 4.1–4.6 (6 items) | Crisis escalation E2E, session timeout + auto-save, offline fallback, WCAG 2.1 AA accessibility, error boundaries, patient data export | `phase2-patient-safety-complete` |
| **3** | Code Quality & Testing | 5.1–5.10 (10 items) | Archive legacy JS, TypeScript strict mode, ESLint config, structured logging, API response envelope, typed API client, Lambda unit tests (80%+), React unit tests (80%+), E2E tests (Playwright), CI pipeline gates | `phase3-code-quality-complete` |
| **4** | Provider Experience | 6.1–6.6 (6 items) | RBAC (patient/provider/admin), provider dashboard, clinical notes CRUD, secure messaging, alert severity + config, risk stratification views | `phase4-provider-experience-complete` |
| **5** | Compliance & Launch | 7.1–7.8 (8 items) | HIPAA risk assessment doc, data retention policy, incident response runbook, monitoring + alerting, staging environment, i18n framework, Lighthouse >=90, pentest preparation | `phase5-launch-ready` |

---

## 🔒 GUARDRAILS IN EFFECT

### Security Guardrails
| ID | Rule |
|----|------|
| SEC-01 | No AWS credentials in code, commits, or logs |
| SEC-02 | No `*` in any IAM policy |
| SEC-03 | No public S3 buckets |
| SEC-04 | KMS encryption on all data stores |
| SEC-05 | TLS 1.2+ everywhere — no HTTP |
| SEC-06 | No `Access-Control-Allow-Origin: *` |
| SEC-07 | No raw PHI in logs — structured logger with field redaction |
| SEC-08 | No Lambda function URLs — all access through API Gateway |
| SEC-09 | All dependencies audited — `npm audit --audit-level=high` must pass |
| SEC-10 | No inline scripts — CSP enforced via CloudFront |

### Code Quality Guardrails
| ID | Rule |
|----|------|
| CQ-01 | TypeScript `strict: true` — no exceptions |
| CQ-02 | No `any` type anywhere |
| CQ-03 | All functions have explicit return types |
| CQ-04 | No `console.log` in production code |
| CQ-05 | Minimum 80% unit test coverage |
| CQ-06 | 100% coverage on crisis, risk-scoring, and auth paths |
| CQ-07 | No files > 300 lines |
| CQ-08 | All API responses use standard envelope format |
| CQ-09 | All PRs require passing CI |
| CQ-10 | No dead code |

### Infrastructure Guardrails
| ID | Rule |
|----|------|
| INF-01 | All infra changes via Terraform — no console clicks |
| INF-02 | Terraform plan on every PR |
| INF-03 | Remote state encrypted with versioning |
| INF-04 | State lock via DynamoDB |
| INF-05 | No hardcoded AWS account IDs |
| INF-06 | All resources tagged: Project, Environment, ManagedBy, PHI |
| INF-07 | Staging mirrors production |

---

## ✅ PRE-FLIGHT CHECKLIST — BEFORE STARTING PHASE 1

Complete these checks before beginning any Phase 2 PRD work. These confirm the current implementation block is finalized:

- [ ] React/Vite frontend builds successfully: `cd prototype-web && npm ci && npm run build`
- [ ] Frontend deploys to S3 via `cd-frontend.yml` workflow
- [ ] All current React components render correctly in browser
- [ ] Cognito authentication flow works (signup, login, token refresh)
- [ ] API Gateway endpoints responding with expected data
- [ ] Terraform state is clean: `terraform plan` shows no unexpected changes
- [ ] Current git state committed and tagged: `pre-phase2-baseline`
- [ ] Legacy monolithic JS files identified (still in `public/js/` — will be archived in Phase 3)

**Once ALL boxes above are checked, begin Phase 1, Item 3.1 (WAF deployment) immediately.**

---

## 📁 KEY FILE REFERENCES

| File | Purpose |
|------|---------|
| [`PRD_PHASE2_SECURITY_POLISH_PROVIDER.md`](./PRD_PHASE2_SECURITY_POLISH_PROVIDER.md) | **THE PRD** — 41 items, full acceptance criteria, phase gates, verification protocol |
| [`PRD_REACT_MIGRATION.md`](./PRD_REACT_MIGRATION.md) | Previous migration PRD (context for what was built) |
| [`prototype-web/`](./prototype-web/) | React/Vite frontend source |
| [`packages/infra/terraform/`](./packages/infra/terraform/) | Infrastructure as Code |
| [`packages/shared/`](./packages/shared/) | Shared packages (validation, logging, etc. — created in Phase 3) |
| [`.github/workflows/`](./.github/workflows/) | CI/CD pipelines |
| [`_archive/`](./_archive/) | Archived legacy files (populated in Phase 3) |

---

## 🚨 DEFINITION OF DONE — ALL 15 MUST PASS

This PRD is **COMPLETE** when and ONLY when:

1. All 41 items across 5 phases are complete
2. All acceptance criteria for all items verified
3. All 5 phase gate reviews pass
4. Final verification protocol complete
5. All 5 git tags created
6. Zero ESLint errors
7. Zero TypeScript errors
8. Unit test coverage >= 80% (100% on critical paths)
9. E2E tests pass
10. Lighthouse scores >= 90 in all categories
11. Security audit clean (`npm audit` zero high/critical)
12. HIPAA documentation complete
13. Staging environment operational
14. Monitoring and alerting active
15. Code reviewed by someone other than the implementer

**ANYTHING LESS THAN ALL 15 = NOT DONE. NO EXCEPTIONS. NO NEGOTIATION.**

---
---

# Peacefull.ai — Behavioral Health AI Companion

**Version:** 3.0  
**Date:** 2026-03-01  
**Stack:** React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Zustand · Recharts  
**Live Demo:** *(Netlify URL — see Deployment section)*  
**Backend API:** ECS Fargate on AWS (`us-east-1`)

---

## Pilot Readiness Plan

### Current State (as of 2026-03-01)

| Metric | Value |
|--------|-------|
| Total pages | 33 (4 auth + 14 patient + 15 clinician) |
| Components | 25 (13 UI + 8 domain + 4 layout) |
| TypeScript errors | 0 |
| ESLint errors | 0 (12 warnings) |
| Build modules | 1,057 (clean) |
| Unit tests | 74 pass, 11 skip (6 test files) |
| E2E tests | 8 (Playwright: smoke + patient + clinician) |
| Snapshot tests | 14 (Badge, Card, Button, Spinner, SignalBadge) |
| Bundle budget | All within limits (401.9 KB gzip total) |
| Circular deps | 0 (84 files scanned) |
| Synthetic data | 0 violations (84 files scanned) |
| Feature flags | 22 (env var + remote config) |
| PRD phases | 6/6 complete |
| Latest commit | `217586a` — Phase 6 Deployment & Go-Live |

The frontend is a **static React SPA** that builds to `dist/`. It runs in **full mock mode** via MSW (Mock Service Worker) — every API call is intercepted and returns realistic fake data. No backend is required to demo or pilot-test the UI.

---

### Tier 1 — Demo-Ready Pilot (Mock Mode, No Backend)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Deploy frontend to Netlify | ✅ Done | `peacefullai.netlify.app` — auto-deploys from `main` |
| 2 | Create `.env` with `VITE_ENABLE_MOCKS=true` | ✅ Done | Netlify env var set; local dev auto-detects |
| 3 | Auth0 login in mock mode | ✅ Done | MSW handler returns fake tokens — login works for demos |

### Tier 2 — Functional Pilot (Real Backend) — Scheduled for 2026-03-02

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4 | Point frontend at live API | 🔲 | Set `VITE_API_URL=https://<ALB-DNS>` and `VITE_ENABLE_MOCKS=false` |
| 5 | Configure CORS on ECS backend | 🔲 | Allow frontend origin in API's CORS policy |
| 6 | Update Auth0 redirect URIs | 🔲 | Add deployed frontend URL to Auth0 callback/logout URLs |
| 7 | Seed database with pilot data | 🔲 | Patients, clinicians, sessions, MBC scores |
| 8 | Implement SSE streaming endpoint | 🔲 | Backend `/api/v1/ai/chat` for ChatPage real-time streaming |

### Tier 3 — Production-Grade Pilot (S3 + CloudFront)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9 | Host on S3 + CloudFront | 🔲 | Free HTTPS via ACM cert, global CDN, fine-grained cache control |
| 10 | Error monitoring (Sentry) | ✅ Done | ErrorBoundary + Sentry beacon integration (set `VITE_SENTRY_DSN`) |
| 11 | Usage analytics (PostHog/Mixpanel) | 🔲 | ~1 hr setup |
| 12 | WCAG accessibility audit | ✅ Done | SkipLink, LiveAnnouncer, ARIA roles, ESLint jsx-a11y |
| 13 | E2E tests (Playwright) | ✅ Done | 3 smoke + 2 patient + 3 clinician = 8 E2E tests |
| 14 | Token refresh flow testing | 🔲 | Auth client has refresh logic — needs real Auth0 validation |
| 15 | Mobile responsiveness QA | 🔲 | 2-4 hrs |

### S3 + CloudFront vs. Netlify for Production Pilot

| Criteria | Netlify | S3 + CloudFront |
|----------|---------|-----------------|
| Setup time | ~15 min (git integration) | ~1 hr (Terraform/CLI) |
| HTTPS | Automatic | ACM cert (free, auto-renew) |
| CDN | Netlify Edge | CloudFront 450+ edge locations |
| Custom headers | `netlify.toml` | CloudFront Functions / Lambda@Edge |
| Cost at scale | Free tier → $19/mo | Pay-per-request (pennies for pilot) |
| AWS integration | None | IAM, WAF, Shield, CloudWatch, same VPC as backend |
| CI/CD | Netlify Build (auto) | CodePipeline / GitHub Actions → `aws s3 sync` |
| **Recommendation** | **Use for Tier 1 demo** | **Use for Tier 3 production pilot** — better security, observability, and backend proximity |

**Plan:** Netlify now (fast demo) → S3 + CloudFront for production pilot (Tier 3).

---

## Quick Start

```bash
cd prototype-web
npm ci
npm run dev          # → http://localhost:5173 (mock mode)
```

The app starts in **full mock mode** (MSW intercepts all API calls). No backend needed.

To run against the real backend:

```bash
# .env
VITE_ENABLE_MOCKS=false
VITE_API_URL=https://peacefull-dev-alb-1054524413.us-east-1.elb.amazonaws.com/api/v1
```

### Build & Test

```bash
npm run build        # TypeScript check + Vite production build (1,056 modules)
npm run test         # Vitest — 60+ pass, 11 skip
npm run test:smoke   # Playwright smoke tests
npm run test:e2e     # Playwright E2E (patient + clinician flows)
npm run preview      # Preview production build locally
npm run lint         # ESLint (react-hooks, jsx-a11y, complexity)
npm run quality      # Full quality pipeline (lint + circular + synthetic + test + build)
npm run check:bundle    # Bundle size budget verification
npm run check:circular  # Circular dependency detection
npm run check:synthetic # Synthetic data leak detection
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Static SPA)                                       │
│  React 19 · Vite 7 · Tailwind 4 · Zustand · MSW             │
│  Hosted: Netlify (demo) / S3+CloudFront (production)         │
├──────────────────────────────────────────────────────────────┤
│  Backend API (Node.js + Express + Prisma)                    │
│  Hosted: AWS ECS Fargate · ALB · RDS PostgreSQL · Redis      │
│  Auth: Auth0 RS256 (prod) / Local HS256 (dev)                │
└──────────────────────────────────────────────────────────────┘
```

---

## Screens Implemented (34 Total)

### Patient Routes (`/patient/*`) — 15 screens

| Route | Screen | Description |
|-------|--------|-------------|
| `/patient/welcome` | M-01 | Welcome + product boundaries |
| `/patient/consent` | M-02 | Consent acknowledgments |
| `/patient/home` | M-03 | Home dashboard |
| `/patient/journal` | M-04 | Journal composer |
| `/patient/history` | M-05 | Journal + check-in + voice unified timeline |
| `/patient/checkin` | M-06 | Daily check-in |
| `/patient/chat` | M-07 | AI companion chat (SSE streaming) |
| `/patient/voice` | M-08 | Voice recorder |
| `/patient/voice/progress` | M-09 | Upload progress |
| `/patient/careplan` | M-10 | Care plan activities |
| `/patient/resources` | M-11 | Safety resources |
| `/patient/settings` | M-12 | Settings |
| `/patient/session-prep` | NEW | Session prep (topic selection) |
| `/forgot-password` | NEW | Password reset request |

### Clinician Routes (`/clinician/*`) — 19 screens

| Route | Screen | Description |
|-------|--------|-------------|
| `/clinician/login` | C-01 | Login + MFA |
| `/clinician/caseload` | C-02 | Caseload dashboard |
| `/clinician/inbox` | C-03 | Portal inbox list |
| `/clinician/inbox/:id` | C-04 | Inbox detail |
| `/clinician/patient/:id` | C-05 | Patient profile |
| `/clinician/summaries` | C-06 | Summaries list |
| `/clinician/summary/:id` | C-07 | Summary detail |
| `/clinician/recommendations` | C-08 | Recommendations panel |
| `/clinician/mbc-dashboard` | C-09 | MBC scores (PHQ-9/GAD-7 charts) |
| `/clinician/session-notes` | C-10 | SOAP notes + sign/co-sign |
| `/clinician/adherence` | C-11 | Adherence tracker |
| `/clinician/restricted-notes` | C-12 | Restricted notes |
| `/clinician/exports` | C-13 | Exports center |
| `/clinician/escalations` | NEW | Escalation protocols (P0–P3, SLA) |
| `/clinician/analytics` | NEW | Analytics dashboard (charts) |

---

## Demo Mode

The prototype includes a floating **Demo Mode** panel that allows real-time toggling of system states:

### How to Use Demo Mode

1. Look for the purple "Demo Mode" button in the bottom-right corner
2. Click to expand the control panel
3. Use toggles to demonstrate different states:

| Toggle | Options | Purpose |
|--------|---------|---------|
| System Status | NORMAL / DEGRADED | Show global banner behavior |
| Safety Tier | T0 / T1 / T2 / T3 | Show notification channels |
| Summary Status | DRAFT / REVIEWED | Show CSP-002 enforcement |
| Recommendation | GENERATED / SUPPRESSED | Show CSP-003 enforcement |
| Export Status | READY / BLOCKED_POLICY | Show CSP-005 enforcement |
| Voice Status | UPLOADING → COMPLETE | Show async processing |

### Demo Flow Recommendations

1. Start with **NORMAL** mode, show patient onboarding
2. Switch to **DEGRADED** mode, show global banner
3. Toggle **T2** tier, show portal inbox with email/SMS nudges
4. Toggle **DRAFT** summary, show persistent banner
5. Toggle **SUPPRESSED** recommendation, show reason codes
6. Toggle **BLOCKED_POLICY**, show 428 error

---

## Production Readiness Plan (PRD)

**Updated:** 2026-02-28 | **Target:** Full production launch on AWS  
**Decisions:** Self-service signup, dual-mode auth (Auth0 + local JWT), deploy API + seed DB, full production launch

### Progress Tracker

| Phase | Name | Status | Key Metric |
|-------|------|--------|------------|
| 0 | Discovery & Research | ✅ Complete | 25+ synthetic categories catalogued, 20+ scroll issues identified |
| 1 | Scroll & Layout Fixes | ✅ Complete | Global `padding-bottom: 96px` on `.screen.active` |
| 2 | Registration + Auth Integration | ✅ Complete | `POST /auth/register` + signup UI + sign-out |
| 3 | Replace Synthetic Data with Live API | ✅ Complete | `loadPerPatientData()` for 6 data domains |
| 4 | Roundtable Red-Team Review | ✅ Complete | 25 findings (5 CRITICAL, 8 HIGH, 7 MED, 5 LOW) |
| 5 | Implement Red-Team Mitigations | ✅ Complete | SEC-001/003/004/005/006/009/011/012, CLIN-003 |
| 6 | Test Suite Expansion | ✅ Complete | 112 tests passing (was 91) |
| 7 | AWS Production Infrastructure | ✅ Complete | WAF module, geo-restriction, k6 load tests |
| 8 | Go-Live Checklist | ✅ Complete | Runbook, deployment procedure, 12-step checklist |

---

### Phase 1 — Scroll & Layout Fixes

**Problem:** Fixed quick-nav bar (56px, `position: fixed; bottom: 0; z-index: 90`) obscures bottom content on 20+ screens. Only a few screens (e.g., `patient-home`) have `pb-24` padding.

**Affected Screens:**
- `clinician-inbox`, `inbox-detail`, `draft-review`, `restricted-notes`
- `exports-center`, `suppression-ui`, `communication-triage-queue`
- `memory-review`, `treatment-plan-editor`, `clinician-patient`
- `mbc-dashboard`, `adherence-tracker`, `escalation-protocols`
- All Phase 6 screens: `clinician-analytics`, `population-health`, `session-notes`, `regulatory-hub`, `sdoh-assessments`, `caregiver-portal`, `supervisor-cosign`, `breathing-exercise`

**Solution:**
1. Add global CSS safety net: `.screen.active { padding-bottom: 96px; }`
2. Verify all screens render without content clipping
3. Ensure fixed footer doesn't overlap interactive elements

**Files Modified:** `prototype-web/index.html` (CSS section)

---

### Phase 2 — Self-Service Registration + Auth Integration

**Goal:** Enable real user signup/signin connected to a single database and authentication system.

**Tasks:**
1. **Backend — `POST /auth/register`** in `packages/api/src/routes/auth.ts`
   - Email + password registration with Prisma User model
   - Password strength: 12-char minimum, complexity requirements
   - Email verification flow (optional for pilot)
   - Role assignment: default `PATIENT`, clinician requires admin approval
2. **Frontend — Signup UI** in `prototype-web/index.html`
   - New `#signup` screen with email, password, confirm password, name fields
   - Link from login screen: "Don't have an account? Sign up"
   - Wire `handleRegister()` in `index.js` via `api.js`
3. **Auth Fixes:**
   - Fix sign-out buttons to call `clearAuth()` (tokens persist after logout)
   - Display authenticated user's actual name/role in UI header
   - Replace in-memory MFA codes with Redis-backed store (Phase 5 dependency)
4. **Dual-Mode Auth:**
   - Auth0 RS256 (JWKS) — primary for production
   - Local HS256 — fallback for dev/demo environments
   - Auth0 tenant: `dev-tu36ndmyt7pr2coi.us.auth0.com`

**Files Modified:** `packages/api/src/routes/auth.ts`, `prototype-web/index.html`, `prototype-web/public/js/index.js`, `prototype-web/public/js/api.js`

---

### Phase 3 — Replace Synthetic Data with Live API

**Goal:** Remove all 25+ categories of hardcoded synthetic data and replace with live API calls.

**Synthetic Data Catalogue (to be replaced):**
- Patient names/IDs: Maria Rodriguez (PT-2847), James Smith, Emma Wilson, Alex Kim
- Clinician names: Dr. Sarah Chen, Dr. Michael Torres, Dr. Lisa Park
- Emergency contacts with fake phone numbers (555-xxxx)
- MBC scores: 6 hardcoded PHQ-9/GAD-7 entries
- Triage items (3), Escalation items (3), Memory items (3/patient)
- Treatment plans (3), Chat scripts (8 messages/patient)
- History entries (18 across 3 patients), Safety plans (Stanley-Brown)
- Session prep, Progress/gamification, Restricted notes, Export history
- Population health stats, SDOH assessments (3), Regulatory status
- Evidence base (65 citations), Voice transcripts, Nudge telemetry

**Tasks:**
1. **Create `packages/api/prisma/seed.ts`** — realistic pilot data
2. **Add missing API endpoints** (~60% of data domains):
   - `GET /patients/:id/profile` — full patient profile detail
   - `GET /patients/:id/sessions` — session prep & history
   - `GET /patients/:id/chat` — chat history with memory refs
   - `GET /patients/:id/safety-plan` — safety plan detail
   - `GET /patients/:id/progress` — progress & gamification
   - `GET /patients/:id/memories` — patient memory items
   - `GET /patients/:id/resources` — safety resources
   - `GET /clinician/notes` — session notes
   - `GET /clinician/restricted-notes` — restricted notes surface
   - `GET /clinician/exports` — export history
   - `GET /clinician/cosign-queue` — supervisor co-sign queue
3. **Expand `api-bridge.js`** with new mappers for all endpoints
4. **Remove inline synthetic content** from `index.html` and `state.js`

**Current API Bridge Coverage:**
- ✅ Covered (~40%): triage, escalations, MBC scores, adherence, dashboard counters
- ❌ Not covered (~60%): all items listed above

**Files Modified:** `packages/api/prisma/seed.ts` (new), `packages/api/src/routes/*.ts`, `prototype-web/public/js/api-bridge.js`, `prototype-web/public/js/state.js`, `prototype-web/index.html`

---

### Phase 4 — Roundtable Red-Team Review

**Goal:** Conduct expert panel review across 4 dimensions. Document all findings.

**Review Dimensions:**

#### 4A. Security Analysis
- JWT handling: token storage (localStorage vs httpOnly cookies), refresh rotation
- MFA: in-memory Map (lost on restart) → needs Redis/persistent store
- XSS vectors: all `innerHTML` usage in `render.js` (30+ functions) needs DOMPurify
- Account lockout: no failed-attempt tracking exists
- Session timeout: no automatic token expiration on inactivity
- CORS configuration review
- Rate limiting on auth endpoints

#### 4B. User Experience Review
- Loading states: no skeletons or spinners during API calls
- Empty states: no "no data" messaging when lists are empty
- Error feedback: no user-facing error toasts for API failures
- Breadcrumbs: deep screens lack navigation context
- Accessibility: keyboard navigation, screen reader support, ARIA labels
- Mobile responsiveness: quick-nav overflow on small screens

#### 4C. Clinical Safety Review
- T3 (critical) notifications: currently only logs to console — needs real SMS/email (Twilio/SES)
- Crisis detection: PHQ-9 item 9 (suicidality) flagging
- Safety plan confirmation: no verification that patient has reviewed plan
- Clinician response SLA: no tracking of time-to-acknowledge for T2/T3 alerts
- Medication adherence alerts: no escalation for missed doses

#### 4D. Compliance Review
- BAA acceptance: no flow for Business Associate Agreements
- Consent revocation: no UI for patients to withdraw consent
- Read-audit logging: not all PHI access events are logged
- Data retention: no automated purge or retention policies
- HIPAA minimum necessary: some endpoints return more data than needed

**Output:** Documented findings with severity ratings (Critical/High/Medium/Low) and remediation plan

---

### Phase 5 — Implement Red-Team Mitigations

**Goal:** Address all findings from Phase 4.

**Critical Mitigations:**
1. **Redis-backed MFA & Token Revocation** — replace in-memory Map/Set stores
   - Add ElastiCache connection to API
   - MFA codes: 5-minute TTL, max 3 attempts
   - Token blacklist: stored in Redis with JWT expiry TTL
2. **DOMPurify Integration** — sanitize all `innerHTML` in `render.js`
   - Add `<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>`
   - Wrap every `innerHTML =` assignment with `DOMPurify.sanitize()`
3. **Account Lockout** — 5 failed attempts → 15-minute lockout
4. **Session Timeout** — 30-minute inactivity → auto-logout with warning modal
5. **WAF Rules** — AWS WAF with rate limiting, geo-blocking, SQL injection protection

**High-Priority Mitigations:**
6. **Loading Skeletons** — add skeleton-pulse CSS class to all data-dependent screens
7. **Empty States** — "No items found" messaging with call-to-action
8. **Error Toasts** — global error handler showing user-friendly messages
9. **T3 Real Notifications** — Twilio SMS + SES email for critical safety alerts
10. **Consent Revocation UI** — patient settings screen with "Withdraw Consent" option
11. **Audit Logging Expansion** — log all PHI read/write events to AuditLog model

**Files Modified:** `packages/api/src/services/*.ts`, `packages/api/src/middleware/*.ts`, `prototype-web/index.html`, `prototype-web/public/js/render.js`, `prototype-web/public/js/index.js`

---

### Phase 6 — Test Suite Expansion

**Goal:** Expand from 91 → 150+ tests with E2E coverage.

**Current Test Suite (91 tests, 8 files):**
- `routes.test.ts` — 25 route integration tests (supertest)
- `auth.test.ts` (services) — 20 auth service tests (JWT, passwords, MFA)
- `auth.test.ts` (middleware) — 9 auth middleware tests
- `error.test.ts` — 9 error middleware tests
- `notification.test.ts` — 6 notification tests
- `calculators.test.mjs` — smoke tests
- `smoke.spec.mjs` — Playwright smoke tests

**New Tests to Add:**
1. **Registration flow tests** — signup, duplicate email, weak password, email verification
2. **New API endpoint tests** — all Phase 3 endpoints (patient profile, sessions, chat, etc.)
3. **API bridge tests** — mapper functions for all data domains
4. **E2E Playwright tests** — critical user flows:
   - Patient: signup → consent → check-in → journal → chat
   - Clinician: login → MFA → inbox → triage → draft review → sign note
   - Admin: user management → audit logs → compliance dashboard
5. **Accessibility tests** — axe-core integration for WCAG 2.1 AA
6. **Security tests** — XSS payload rejection, CSRF protection, rate limiting

---

### Phase 7 — AWS Production Infrastructure

**Goal:** Production-grade AWS infrastructure via Terraform.

**Current Terraform Modules (6):**
- `vpc` — networking, subnets, NAT gateway
- `database` — RDS PostgreSQL (Multi-AZ for prod)
- `ecs` — Fargate services, ALB, task definitions
- `monitoring` — CloudWatch dashboards, alarms
- `secrets` — Secrets Manager (DB, Auth0, API keys)
- `storage` — S3 buckets for uploads

**New Infrastructure:**
1. **ElastiCache Module** — Redis cluster for sessions, MFA codes, token revocation
   - `redis.tf`: single-node (dev/staging), Multi-AZ cluster (prod)
   - Security group: only ECS tasks can connect
   - Connection string injected via Secrets Manager
2. **WAF Module** — AWS WAF v2 attached to ALB
   - Rate limiting: 2000 requests/5min per IP
   - Managed rule groups: AWSManagedRulesCommonRuleSet, AWSManagedRulesSQLiRuleSet
   - Custom rules: geo-blocking (US-only for HIPAA), request size limits
3. **Production Environment:**
   - Multi-AZ RDS with automated backups (35-day retention)
   - Auto-scaling ECS: min 2, max 10 tasks, CPU/memory target tracking
   - Custom domain via Route 53 + ACM SSL certificate
   - CloudFront CDN for static assets
4. **Disaster Recovery:**
   - RDS automated snapshots + cross-region replication
   - S3 cross-region replication for PHI uploads
   - ECS service auto-recovery
   - Runbook for failover procedures

**Files Modified:** `packages/infra/terraform/modules/elasticache/*` (new), `packages/infra/terraform/modules/waf/*` (new), `packages/infra/terraform/environments/prod/main.tf`

---

### Phase 8 — Go-Live Checklist

**12-step launch process:**

| Step | Task | Owner | Status |
|------|------|-------|--------|
| 1 | DNS cutover — point `app.peacefull.ai` to ALB | DevOps | ⏳ |
| 2 | SSL certificate validation — ACM cert for `*.peacefull.ai` | DevOps | ⏳ |
| 3 | Production database migration — `prisma migrate deploy` | Backend | ⏳ |
| 4 | Auth0 production tenant — separate from dev tenant | Backend | ⏳ |
| 5 | WAF rules activation — enable all managed + custom rules | DevOps | ⏳ |
| 6 | Monitoring alerts — PagerDuty/Opsgenie integration | DevOps | ⏳ |
| 7 | Load testing — k6 scripts for 500 concurrent users | QA | ⏳ |
| 8 | BAA execution — signed BAAs with all subprocessors | Legal | ⏳ |
| 9 | Penetration test — third-party pentest report | Security | ⏳ |
| 10 | Compliance audit — HIPAA readiness assessment | Compliance | ⏳ |
| 11 | Runbook documentation — incident response, on-call rotation | DevOps | ⏳ |
| 12 | Launch communications — pilot partner onboarding emails | Product | ⏳ |

**Pre-Launch Validation:**
- [ ] All 150+ tests passing in CI
- [ ] Zero critical/high security findings open
- [ ] T3 notification delivery confirmed (Twilio + SES)
- [ ] Auth0 production tenant configured with correct permissions
- [ ] WAF blocking malicious traffic (verified with test payloads)
- [ ] CloudWatch alarms firing correctly (tested with synthetic failures)
- [ ] Database failover tested (RDS Multi-AZ switchover)
- [ ] Backup restoration tested (RDS snapshot restore < 1 hour)

---

## Synthetic Dataset

All data is synthetic and explicitly marked. Located in `prototype-web/index.html`:

```javascript
const syntheticData = {
  tenant: {
    name: "Sunrise Therapy Group (Synthetic)"
  },
  patients: [
    { display_name: "Patient Alpha (Synthetic)", ... },
    // ...
  ],
  // ...
};
```

### Data Contents

- **Tenant:** Sunrise Therapy Group (Synthetic)
- **Clinicians:** 2 (Dr. Rivera, Dr. Chen - both marked synthetic)
- **Patients:** 5 (Alpha, Bravo, Charlie, Delta, Echo - all marked synthetic)
- **Portal Inbox:** 3 items (T0, T1, T2 tiers)
- **Summaries:** 2 (1 Draft, 1 Reviewed)
- **Recommendations:** 2 (1 Suppressed, 1 Generated)
- **Restricted Notes:** 1
- **Export Jobs:** 2 (1 Ready, 1 Blocked)

---

## CSP Policy Enforcement

### CSP-001: Decision Support Policy

- ✅ Patient UI never shows clinician-only recommendations
- ✅ Patient UI never shows suppression reason codes
- ✅ Patient UI never shows internal confidence values
- ✅ "Not emergency replacement" visible in patient UI

### CSP-002: Draft Summary Policy

- ✅ All Draft summaries show "Draft — clinician review required" banner
- ✅ Banner is non-dismissible
- ✅ Review actions required for promotion

### CSP-003: Recommendation Suppression Policy

- ✅ Suppressed recommendations show reason codes
- ✅ Remediation steps always visible
- ✅ No silent suppression

### CSP-004: Portal Inbox Authority

- ✅ Portal inbox is authoritative workflow
- ✅ Email/SMS shown as "nudges" only
- ✅ Acknowledge/resolve only in portal

### CSP-005: Restricted Surface

- ✅ Restricted notes separate surface
- ✅ Excluded from standard exports
- ✅ Export blocking (428) when confirmation missing

---

## Demo Script

See `VC_DEMO_SCRIPT.md` for the complete 10-12 minute presentation script.

**Key Messages:**
- "Clinician-supervised, not autonomous"
- "Extends care between sessions"
- "Safety-first design with hard constraints"
- "Synthetic data only—no PHI"

---

## Browser Compatibility

Tested and working in:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

Requires JavaScript enabled.

---

## Troubleshooting

### Blank Page
- Ensure JavaScript is enabled
- Try opening with a local HTTP server (not file://)
- Check browser console for errors

### Demo Mode Not Visible
- Look for purple button in bottom-right corner
- May be behind other content—try scrolling

### Navigation Issues
- Use browser back button
- Or click app navigation elements

---

## License & Disclaimer

**Prototype Only:** This is a demonstration prototype built from synthetic data. Not for production use.

**No PHI:** This prototype contains no protected health information. All data is synthetic.

**Not Medical Advice:** This prototype does not provide medical advice, diagnosis, or treatment.

**Emergency:** If you are in crisis, call emergency services or the 988 Suicide & Crisis Lifeline.

---

## Contact

For questions about this prototype, refer to the KRLZ
.

---

# 🔴 MANDATORY: READ BEFORE ANY WORK

> **ALL SUBAGENTS, DEVELOPERS, AND AUTOMATION MUST READ AND FULLY COMPLY WITH THE FOLLOWING PRD BEFORE PERFORMING ANY WORK ON THIS CODEBASE.**
> **FAILURE TO COMPLY WITH ANY ITEM IS A BLOCKING VIOLATION. NO EXCEPTIONS. NO WORKAROUNDS. NO PARTIAL DELIVERY.**

---

## ⚠️ ACTIVE PRD: Phase 2 — Security Hardening, Patient Safety, Provider Experience & Code Quality

**Document:** [`PRD_PHASE2_SECURITY_POLISH_PROVIDER.md`](./PRD_PHASE2_SECURITY_POLISH_PROVIDER.md)

**Status:** `IMMEDIATE — Execute upon finalization of current implementation block`

**Priority:** `P0 — Platform CANNOT serve real patient data until Phase 1 + 2 are complete`

**Total Scope:** 41 work items across 5 sequentially-gated phases | 200+ acceptance criteria | 10 weeks estimated

---

## 🛑 EXECUTION RULES — NON-NEGOTIABLE

These rules apply to EVERY subagent, developer, copilot, automation, or human operator touching this codebase from this point forward:

### Rule 1: Read First, Act Second
Before writing a single line of code, read the ENTIRE PRD end-to-end. Read this README section. Read `PRD_REACT_MIGRATION.md` for context on what was built. Understand the full picture before touching anything.

### Rule 2: Sequential Phase Execution
```
Phase 1 (Security) → Phase 2 (Patient Safety) → Phase 3 (Code Quality) → Phase 4 (Provider) → Phase 5 (Compliance)
```
**Each phase is gated.** Phase N+1 CANNOT begin until ALL items in Phase N are complete AND the Phase N gate review passes. No parallelization across phases. No "starting Phase 3 while finishing Phase 2." Hard stops.

### Rule 3: Every Item, Every Criterion
Every numbered item (3.1 through 7.8) must be completed. Every acceptance criterion checkbox under every item must pass. There are no optional items. There are no "nice to haves." Everything in the PRD is required.

### Rule 4: No Placeholder Code
Zero tolerance for:
- `// TODO` comments
- `// FIXME` comments
- `any` types in TypeScript
- `@ts-ignore` directives
- `eslint-disable` without documented justification
- `console.log` in production code
- Hardcoded credentials, API keys, or account IDs
- Commented-out code blocks

### Rule 5: No Scope Creep
Do NOT add features, refactors, "improvements," or "nice to haves" not explicitly listed in the PRD. If you identify something missing, document it as a finding and flag it. Do NOT implement it. The PRD scope is frozen.

### Rule 6: Verify After Every Item
After completing each numbered item:
1. Run `cd prototype-web && npm run build` — must succeed
2. Run `npm test` — must pass
3. Run `npm run lint` — must pass with zero errors
4. Verify all PREVIOUS items still work (no regressions)
5. If any check fails, fix it before moving to the next item

### Rule 7: Commit Discipline
One commit per numbered item. No multi-item commits. No "batch" commits.
```
Format: [PRD-PH2] <Phase#>.<Item#> — <short description>
Example: [PRD-PH2] 1.3 — Add Zod input validation layer for all Lambda functions
```

### Rule 8: Phase Gates Are Hard Stops
At the end of each phase, execute the gate review checklist defined in the PRD. Every checkbox must pass. Create a git tag:
```
phase1-security-foundation-complete
phase2-patient-safety-complete
phase3-code-quality-complete
phase4-provider-experience-complete
phase5-launch-ready
```

### Rule 9: Document All Blockers
If a blocker is encountered:
1. **STOP** — do not skip the item
2. Document: WHAT failed, WHY it failed, WHAT is needed to unblock, IMPACT on downstream items
3. Escalate — do not silently move on

### Rule 10: Patient Safety Is Paramount
This is a **mental health platform**. A bug in the crisis escalation flow could cost a human life. A data leak exposes the most sensitive information a person can have. Every line of code, every configuration, every decision must be made with that gravity. If in doubt, choose the safer option. Always.

---

## 📋 PHASE SUMMARY — QUICK REFERENCE

| Phase | Focus | Items | Key Deliverables | Gate Tag |
|-------|-------|-------|-----------------|----------|
| **1** | Security Foundation | 3.1–3.11 (11 items) | WAF, rate limiting, input validation, CORS lockdown, CSP headers, JWT validation, audit trail, VPC, dependency scanning, PITR, S3 hardening | `phase1-security-foundation-complete` |
| **2** | Patient Safety | 4.1–4.6 (6 items) | Crisis escalation E2E, session timeout + auto-save, offline fallback, WCAG 2.1 AA accessibility, error boundaries, patient data export | `phase2-patient-safety-complete` |
| **3** | Code Quality & Testing | 5.1–5.10 (10 items) | Archive legacy JS, TypeScript strict mode, ESLint config, structured logging, API response envelope, typed API client, Lambda unit tests (80%+), React unit tests (80%+), E2E tests (Playwright), CI pipeline gates | `phase3-code-quality-complete` |
| **4** | Provider Experience | 6.1–6.6 (6 items) | RBAC (patient/provider/admin), provider dashboard, clinical notes CRUD, secure messaging, alert severity + config, risk stratification views | `phase4-provider-experience-complete` |
| **5** | Compliance & Launch | 7.1–7.8 (8 items) | HIPAA risk assessment doc, data retention policy, incident response runbook, monitoring + alerting, staging environment, i18n framework, Lighthouse ≥90, pentest preparation | `phase5-launch-ready` |

---

## 🔒 GUARDRAILS IN EFFECT

### Security Guardrails
| ID | Rule |
|----|------|
| SEC-01 | No AWS credentials in code, commits, or logs |
| SEC-02 | No `*` in any IAM policy |
| SEC-03 | No public S3 buckets |
| SEC-04 | KMS encryption on all data stores |
| SEC-05 | TLS 1.2+ everywhere — no HTTP |
| SEC-06 | No `Access-Control-Allow-Origin: *` |
| SEC-07 | No raw PHI in logs — structured logger with field redaction |
| SEC-08 | No Lambda function URLs — all access through API Gateway |
| SEC-09 | All dependencies audited — `npm audit --audit-level=high` must pass |
| SEC-10 | No inline scripts — CSP enforced via CloudFront |

### Code Quality Guardrails
| ID | Rule |
|----|------|
| CQ-01 | TypeScript `strict: true` — no exceptions |
| CQ-02 | No `any` type anywhere |
| CQ-03 | All functions have explicit return types |
| CQ-04 | No `console.log` in production code |
| CQ-05 | Minimum 80% unit test coverage |
| CQ-06 | 100% coverage on crisis, risk-scoring, and auth paths |
| CQ-07 | No files > 300 lines |
| CQ-08 | All API responses use standard envelope format |
| CQ-09 | All PRs require passing CI |
| CQ-10 | No dead code |

### Infrastructure Guardrails
| ID | Rule |
|----|------|
| INF-01 | All infra changes via Terraform — no console clicks |
| INF-02 | Terraform plan on every PR |
| INF-03 | Remote state encrypted with versioning |
| INF-04 | State lock via DynamoDB |
| INF-05 | No hardcoded AWS account IDs |
| INF-06 | All resources tagged: Project, Environment, ManagedBy, PHI |
| INF-07 | Staging mirrors production |

---

## ✅ PRE-FLIGHT CHECKLIST — BEFORE STARTING PHASE 1

Complete these checks before beginning any Phase 2 PRD work. These confirm the current implementation block is finalized:

- [ ] React/Vite frontend builds successfully: `cd prototype-web && npm ci && npm run build`
- [ ] Frontend deploys to S3 via `cd-frontend.yml` workflow
- [ ] All current React components render correctly in browser
- [ ] Cognito authentication flow works (signup, login, token refresh)
- [ ] API Gateway endpoints responding with expected data
- [ ] Terraform state is clean: `terraform plan` shows no unexpected changes
- [ ] Current git state committed and tagged: `pre-phase2-baseline`
- [ ] Legacy monolithic JS files identified (still in `public/js/` — will be archived in Phase 3)

**⚡ Once ALL boxes above are checked, begin Phase 1, Item 3.1 (WAF deployment) immediately.**

---

## 📁 KEY FILE REFERENCES

| File | Purpose |
|------|---------|
| [`PRD_PHASE2_SECURITY_POLISH_PROVIDER.md`](./PRD_PHASE2_SECURITY_POLISH_PROVIDER.md) | **THE PRD** — 41 items, full acceptance criteria, phase gates, verification protocol |
| [`PRD_REACT_MIGRATION.md`](./PRD_REACT_MIGRATION.md) | Previous migration PRD (context for what was built) |
| [`prototype-web/`](./prototype-web/) | React/Vite frontend source |
| [`packages/infra/terraform/`](./packages/infra/terraform/) | Infrastructure as Code |
| [`packages/lambdas/`](./packages/lambdas/) | Backend Lambda functions |
| [`packages/shared/`](./packages/shared/) | Shared packages (validation, logging, etc. — created in Phase 3) |
| [`.github/workflows/`](./.github/workflows/) | CI/CD pipelines |
| [`_archive/`](./_archive/) | Archived legacy files (populated in Phase 3) |
| [`docs/compliance/`](./docs/compliance/) | HIPAA documentation (created in Phase 5) |

---

## 🚨 DEFINITION OF DONE — ALL 15 MUST PASS

This PRD is **COMPLETE** when and ONLY when:

1. ✅ All 41 items across 5 phases are complete
2. ✅ All acceptance criteria for all items verified
3. ✅ All 5 phase gate reviews pass
4. ✅ Final verification protocol complete
5. ✅ All 5 git tags created
6. ✅ Zero ESLint errors
7. ✅ Zero TypeScript errors
8. ✅ Unit test coverage ≥ 80% (100% on critical paths)
9. ✅ E2E tests pass
10. ✅ Lighthouse scores ≥ 90 in all categories
11. ✅ Security audit clean (`npm audit` zero high/critical)
12. ✅ HIPAA documentation complete
13. ✅ Staging environment operational
14. ✅ Monitoring and alerting active
15. ✅ Code reviewed by someone other than the implementer

**ANYTHING LESS THAN ALL 15 = NOT DONE. NO EXCEPTIONS. NO NEGOTIATION.**

---

// ...existing code...
