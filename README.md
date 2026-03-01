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
| Total pages | 34 (23 Phase 1 + 9 Phase 2-3 + 2 auth) |
| TypeScript errors | 0 |
| Build modules | 1,046 (clean) |
| Unit tests | 60 pass, 11 skip |
| Latest commit | `6ecca2c` on `main` |

The frontend is a **static React SPA** that builds to `dist/`. It runs in **full mock mode** via MSW (Mock Service Worker) — every API call is intercepted and returns realistic fake data. No backend is required to demo or pilot-test the UI.

---

### Tier 1 — Demo-Ready Pilot (Mock Mode, No Backend)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Deploy frontend to Netlify | 🔲 In progress | `netlify.toml` pre-configured; set `VITE_ENABLE_MOCKS=true` |
| 2 | Create `.env` with `VITE_ENABLE_MOCKS=true` | 🔲 | Needed for local dev; Netlify uses env var dashboard |
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
| 10 | Error monitoring (Sentry) | 🔲 | ~1 hr setup |
| 11 | Usage analytics (PostHog/Mixpanel) | 🔲 | ~1 hr setup |
| 12 | WCAG accessibility audit | 🔲 | 2-4 hrs |
| 13 | E2E tests (Playwright) | 🔲 | 4-8 hrs; 1 smoke test exists |
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
npm run build        # TypeScript check + Vite production build (1,046 modules)
npm run test         # Vitest — 60 pass, 11 skip
npm run test:smoke   # Playwright smoke tests
npm run preview      # Preview production build locally
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
