# PRD Addendum: Phase 3 — Production Readiness & React Migration Completion

## Document Metadata

| Field | Value |
|-------|-------|
| **Document ID** | `PRD-PH3-2026-002` |
| **Version** | `2.0.0` |
| **Status** | `IN PROGRESS — Phases 1/3/5 partially complete, UX audit added` |
| **Created** | 2026-03-03 |
| **Depends On** | `PRD_REACT_MIGRATION.md`, `PRD_PHASE2_SECURITY_POLISH_PROVIDER.md` |
| **Priority** | P0 — Required before pilot clinicians can use the live system |

---

## Purpose

This addendum addresses **28 validated blockers** discovered during production launch validation on 2026-03-03. It does NOT replace existing PRDs but extends them with concrete execution phases that close the gap between "deployed" and "usable in production."

### Relationship to Existing PRDs

| Existing PRD | Status | This Addendum |
|---|---|---|
| `PRD_REACT_MIGRATION.md` | ~70% complete (UI built, API wiring partial) | Phases 2, 4 complete the remaining 30% |
| `PRD_PHASE2_SECURITY_POLISH_PROVIDER.md` | Queued | Phases 3, 5 execute security items; Phase 6 covers compliance |

---

## Current State Assessment (2026-03-03)

### What Works
- **Backend API:** Express 5 + Prisma + PostgreSQL on ECS Fargate (3 tasks), health 200
- **Auth:** JWT login + MFA flow functional at API level
- **MFA delivery:** SES email codes with Redis-backed TTL (C1/C7 RESOLVED 2026-03-04)
- **Cross-tenant isolation:** Login query scoped to tenantId (C4 RESOLVED 2026-03-04)
- **Token revocation:** Redis-backed revocation list (C6 RESOLVED 2026-03-04)
- **AI:** Claude claude-sonnet-4-20250514 responding from inside ECS container
- **Frontend:** 33+ React pages built, deployed to Netlify at `peacefullai.netlify.app`
- **Proxy:** Netlify rewrites `/api/*` → `https://api.peacefull.cloud/api/:splat` (TLS)
- **CORS:** `CORS_ORIGIN` includes `https://peacefullai.netlify.app`
- **MSW:** Correctly disabled in production builds (`import.meta.env.PROD` guard + `VITE_ENABLE_MOCKS=false`)
- **AWS BAA:** Signed. Anthropic BAA confirmed.
- **New pages:** SettingsPage, AuditLogPage, ForgotPasswordPage, ResetPasswordPage, ChatTranscriptPage, CrisisFooter
- **WCAG basics:** focus-visible, prefers-reduced-motion, skip-to-content, min touch targets

### What Doesn't Work
- ~~Clinician login blocked by MFA~~ → RESOLVED (C1/C7: SES email delivery)
- **Patient signup:** Frontend password validation min(8) mismatches backend min(12) → form passes but backend rejects
- **Clinician registration:** PENDING_APPROVAL status not surfaced in UI (user sees blank)
- **Login page:** Missing "Forgot Password?" link
- **MFA prompt text:** Says "authenticator app" but codes are email-based
- **API integration:** Many React pages still show hardcoded/mock data instead of live API responses
- ~~Cross-tenant isolation~~ → RESOLVED (C4)
- ~~Session management: token revocation in-memory~~ → RESOLVED (C6: Redis-backed)

---

## Validated Blocker Registry

### Critical (C1–C8)

| ID | Blocker | Root Cause | Fix Phase |
|---|---|---|---|
| C1 | ~~Clinician login blocked by MFA~~ | ~~No code delivery mechanism~~ | ~~Phase 1~~ ✅ **RESOLVED** (2026-03-04 commit `6534803` — SES email delivery + Redis TTL) |
| C2 | Wrong test credentials in docs | Docs reference `dr.chen@peacefull.ai`; seed uses `pilot.clinician.1@peacefull.cloud` | Phase 1 |
| C3 | Patient login untested E2E through Netlify | No automated or manual verification | Phase 1 |
| C4 | ~~Cross-tenant login bug~~ | ~~No `tenantId` filter~~ | ~~Phase 3~~ ✅ **RESOLVED** (2026-03-04 commit `6534803` — login scoped to tenantId) |
| C5 | AI routes lack patient-scoped access checks | `/ai/*` endpoints don't verify requesting user owns the patient record | Phase 3 |
| C6 | ~~Token revocation in-memory only~~ | ~~`Set<string>` lost on ECS restart~~ | ~~Phase 5~~ ✅ **RESOLVED** (2026-03-04 — Redis-backed via ElastiCache) |
| C7 | ~~No real MFA delivery (email/SMS)~~ | ~~`generateMFACode()` returns random int~~ | ~~Phase 5~~ ✅ **RESOLVED** (2026-03-04 — SES `mfa-code` template) |
| C8 | ENCRYPTION_KEY not set for PHI at rest | `env.ts` marks it optional; production should require it | Phase 3 |
| **C9** | **Password validation mismatch** | Frontend min(8) vs backend min(12) — signup silently fails | **Phase 1A (UX Audit)** |
| **C10** | **Clinician PENDING_APPROVAL not surfaced** | Auth store returns silently, no UI feedback | **Phase 1A (UX Audit)** |
| **C11** | **Missing forgot-password link** | LoginPage has no link to `/forgot-password` | **Phase 1A (UX Audit)** |

### High (H1–H10)

| ID | Blocker | Root Cause | Fix Phase |
|---|---|---|---|
| H1 | API response envelope mismatch | Backend wraps in `{ data, requestId }`; some frontend consumers don't unwrap | Phase 2 |
| H2 | Caseload/triage pages show mock data | Pages use hardcoded arrays instead of API calls | Phase 2 |
| H3 | Patient dashboard not API-wired | `PatientHome` renders static cards | Phase 2 |
| H4 | Check-in form not submitting to API | Form logic exists but not connected to `POST /patients/:id/checkin` | Phase 2 |
| H5 | Journal page offline-only | Text entry works but `POST /patients/:id/journal` not called | Phase 2 |
| H6 | Role-based route guards incomplete | Some clinician-only routes accessible to patients via direct URL | Phase 3 |
| H7 | WebSocket reconnection fragile | `useWsStore` doesn't handle token expiry gracefully | Phase 4 |
| H8 | No offline fallback | Service worker registered but no cache strategy | Phase 4 |
| H9 | Error boundaries don't report | `ErrorBoundary` catches but doesn't send to any error tracking service | Phase 4 |
| H10 | Rate limit headers not forwarded | Netlify proxy strips `RateLimit-*` headers from backend | Phase 4 |

### Medium (M1–M10)

| ID | Blocker | Root Cause | Fix Phase |
|---|---|---|---|
| M1 | Missing loading skeletons | Pages flash blank before data loads | Phase 4 |
| M2 | No pagination on patient lists | All records fetched at once | Phase 2 |
| M3 | Chart.js CDN references remain | Some pages still reference CDN scripts instead of Recharts | Phase 4 |
| M4 | i18n coverage incomplete | Only en locale; some strings hardcoded | Phase 6 |
| M5 | Accessibility audit pending | WCAG 2.1 AA compliance not verified | Phase 6 |
| M6 | PDF/CSV export stubs | Export buttons exist but don't generate real files | Phase 6 |
| M7 | Decision Room not API-wired | Complex UI built but uses mock data | Phase 2 |
| M8 | Session notes signing flow | SOAP notes UI exists but `POST /clinician/sessions/:id/sign` not connected | Phase 2 |
| M9 | Analytics dashboard static | Charts render demo data | Phase 2 |
| M10 | Compliance/consent forms stub | UI built but `POST /compliance/consent` not wired | Phase 2 |

---

## Execution Phases

### Phase 1A — UX Audit & Auth Flow Fixes (Day 1 — NEW) ← CURRENT

**Goal:** Fix all auth flow bugs discovered during live testing on 2026-03-05.

| Step | Action | Status |
|---|---|---|
| 1A.1 | Align RegisterPage password validation to backend (min 12, uppercase, lowercase, digit, special char) | ✅ DONE |
| 1A.2 | Handle clinician PENDING_APPROVAL in RegisterPage — show success message instead of blank | ✅ DONE |
| 1A.3 | Add "Forgot your password?" link to LoginPage | ✅ DONE |
| 1A.4 | Fix MFA prompt text: "authenticator app" → "email verification code" | ✅ DONE |
| 1A.5 | Build, push to GitHub, verify Netlify redeploy | ⏳ IN PROGRESS |

**Gate:** Patient can register + log in on live site. Clinician sees PENDING_APPROVAL message. Forgot password link visible.

### Phase 1 — Unblock Production Login (Day 1)

**Goal:** Any seeded account can log in on `peacefullai.netlify.app` and reach their dashboard.

| Step | Action | Details |
|---|---|---|
| 1.1 | Disable clinician MFA in DB | Run SQL `UPDATE "User" SET "mfaEnabled" = false WHERE role IN ('CLINICIAN','SUPERVISOR')` via ECS Exec |
| 1.2 | Update `seed-prod.ts` | Set `mfaEnabled: false` for all clinician users (aligns canonical seed with DB state) |
| 1.3 | Update `PILOT_ONBOARDING_GUIDE.md` | Correct emails to `@peacefull.cloud` addresses |
| 1.4 | Verify patient login via Netlify | Manual test: `test.patient.1@peacefull.cloud` / `Pilot2026!Change` on live site |
| 1.5 | Verify clinician login via Netlify | Manual test: `pilot.clinician.1@peacefull.cloud` / `Pilot2026!Change` on live site |
| 1.6 | Verify API calls proxied correctly | Confirm browser network tab shows `/api/v1/*` requests succeeding |

**Gate:** Both patient and clinician can log in on `peacefullai.netlify.app` and see their respective dashboards.

### Phase 2 — API Contract Wiring (Days 2–4)

**Goal:** All 33 React pages that have API endpoints consume real data instead of mocks/stubs.

| Screen Group | Endpoints | Work Required |
|---|---|---|
| Patient Dashboard | `GET /patients/:id`, `GET /patients/:id/checkins` | Wire `PatientHome` to live API |
| Check-in Flow | `POST /patients/:id/checkin` | Connect form submission, handle response |
| Journal | `POST /patients/:id/journal`, `GET /patients/:id/journals` | Wire text entry + history |
| Clinician Caseload | `GET /clinician/caseload` | Replace mock array with API call |
| Triage Inbox | `GET /clinician/triage`, `PATCH /clinician/triage/:id` | Wire list + action buttons |
| Draft Review | `GET /clinician/patients/:id/drafts`, `PATCH .../drafts/:id` | Wire approve/reject flow |
| Session Notes | `POST /clinician/sessions`, `POST .../sign` | Wire SOAP note creation + signing |
| Decision Room | `POST /ai/decision`, `GET /ai/decision/:id` | Wire AI panel requests |
| Analytics | `GET /analytics/dashboard` | Wire chart data |
| Compliance | `GET /compliance/consents`, `POST /compliance/consent` | Wire consent CRUD |

**Gate:** Every page that has a corresponding backend endpoint makes real API calls and renders real data.

### Phase 3 — Security & Data Integrity (Days 3–5)

**Goal:** Close critical security gaps (C4, C5, C8, H6).

| Step | Action |
|---|---|
| 3.1 | Add `tenantId` filter to login query: `findFirst({ where: { email, tenantId } })` |
| 3.2 | Add patient ownership checks to AI routes (`/ai/*`) |
| 3.3 | Set `ENCRYPTION_KEY` in ECS Secrets Manager; make it required in production env validation |
| 3.4 | Audit all route guards; ensure role-based access is enforced on every protected route |
| 3.5 | Add tenant isolation middleware that extracts `tenantId` from JWT and scopes all Prisma queries |

**Gate:** Security test suite passes; no cross-tenant data leakage possible.

### Phase 4 — UX Polish & Resilience (Days 4–6)

**Goal:** Production-quality user experience (H7–H10, M1, M3).

| Step | Action |
|---|---|
| 4.1 | Add loading skeletons to all data-fetching pages |
| 4.2 | Implement WebSocket reconnection with exponential backoff |
| 4.3 | Replace remaining Chart.js CDN with Recharts components |
| 4.4 | Add error reporting hook (Sentry or CloudWatch RUM) |
| 4.5 | Configure offline cache strategy in service worker |
| 4.6 | Forward rate-limit headers through Netlify proxy |

**Gate:** Lighthouse performance score ≥ 80; no console errors in production.

### Phase 5 — Auth Hardening (Days 5–7) — PARTIALLY COMPLETE

**Goal:** Production-grade auth (C6, C7).

| Step | Action | Status |
|---|---|---|
| 5.1 | Move token revocation from in-memory `Set` to Redis (ElastiCache) | ✅ DONE (2026-03-04) |
| 5.2 | ~~Implement real TOTP-based MFA~~ → Implemented SES email-based MFA codes | ✅ DONE (2026-03-04) |
| 5.3 | Move MFA pending challenges from in-memory map to Redis with TTL | ✅ DONE (2026-03-04) |
| 5.4 | Add session invalidation on password change | ⏳ NOT STARTED |

**Gate:** MFA works end-to-end with Google Authenticator; revoked tokens are rejected across all ECS tasks.

### Phase 6 — Compliance & Exports (Days 6–8)

**Goal:** HIPAA compliance evidence and real export functionality (M4–M6).

| Step | Action |
|---|---|
| 6.1 | Wire PDF export using server-side generation (`/compliance/export/pdf`) |
| 6.2 | Wire CSV export for analytics data |
| 6.3 | Complete i18n string extraction (minimum viable en locale) |
| 6.4 | Run WCAG 2.1 AA audit; fix critical violations |
| 6.5 | Create compliance documentation package |

**Gate:** All export buttons produce real files; no accessibility critical violations.

### Phase 7 — Infrastructure & Observability (Days 7–10)

**Goal:** Production-ready infrastructure (monitoring, alerting, backup verification).

| Step | Action |
|---|---|
| 7.1 | Configure CloudWatch alarms (CPU > 80%, 5xx rate > 1%, latency P99 > 2s) |
| 7.2 | Set up RDS automated backups verification |
| 7.3 | Configure ECS auto-scaling policies |
| 7.4 | Set up log aggregation and structured logging |
| 7.5 | Create runbook for common operational scenarios |

**Gate:** All alarms active; backup restoration verified; auto-scaling tested.

---

## Dependency Graph

```
Phase 1 (Login) ──→ Phase 2 (API Wiring) ──→ Phase 4 (UX Polish)
                ──→ Phase 3 (Security)    ──→ Phase 5 (Auth Hardening)
                                          ──→ Phase 6 (Compliance)
                                          ──→ Phase 7 (Infrastructure)
```

Phases 2 & 3 can run in parallel after Phase 1.
Phases 4, 5, 6, 7 can run in parallel after Phases 2 & 3.

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| ECS Exec fails mid-SQL update | DB in inconsistent state | Use transactions; verify with SELECT after |
| Netlify build cache stale | Old MSW-enabled bundle served | Clear Netlify cache before deploy |
| Redis not connected | Token revocation falls back to in-memory | Phase 5 adds Redis; until then document limitation |
| Rate limiting too aggressive for pilot | Clinicians locked out | Increase auth rate limit to 30/5min for pilot |

---

## Acceptance Criteria

- [x] Security blockers C1, C4, C6, C7 resolved (commit `6534803`, deployed 2026-03-04)
- [x] Password validation aligned frontend ↔ backend (min 12, complexity regex match)
- [x] Clinician PENDING_APPROVAL shown in RegisterPage
- [x] Forgot-password link on LoginPage
- [x] MFA prompt text references email (not authenticator app)
- [ ] All pilot users can log in on `peacefullai.netlify.app`
- [ ] Patient can complete check-in → submission → see AI reflection
- [ ] Clinician can view caseload → triage → review AI draft → sign note
- [ ] No cross-tenant data visible
- [x] All security headers present (HSTS, CSP, X-Frame-Options)
- [x] MFA works via email (SES) — Phase 5 scope adjusted from TOTP
- [ ] Exports produce real PDF/CSV files (Phase 6)
- [ ] CloudWatch alarms active (Phase 7)
