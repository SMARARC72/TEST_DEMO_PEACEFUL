# PRD: Monolithic HTML → Production React App + AWS Deployment

## Context

Peacefull.ai has a working backend API (Express 5, Prisma, Neon PostgreSQL, 7 Claude AI agents), complete AWS infrastructure-as-code (Terraform: VPC, ECS, RDS, S3, CloudFront, WAF), and a CI/CD pipeline — but the frontend is a single 2,467-line HTML file with vanilla JS. This PRD converts that prototype into a production React application and deploys the full stack to AWS so real clinicians can start piloting.

**Goal:** Ship a pilotable product with 8-10 core screens (not all 37) that connects to the real backend, deploys to AWS, and enables 5-10 clinicians + their patients to use the platform.

---

## Phase 1: Pilot MVP (Screens + API Client + Deploy)

**Outcome:** A deployable React app with the minimum screens needed for a clinical pilot — patients can submit check-ins/journals, clinicians can review triage + AI drafts.

### 1.1 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 19 + TypeScript | Already in package.json |
| Build | Vite 7.3 | Already configured |
| Routing | React Router v7 | File-based routes, lazy loading |
| State | Zustand | Lightweight, no boilerplate, TS-native |
| Styling | Tailwind CSS v4 (PostCSS) | Replace CDN with build-time; reuse existing design tokens |
| Charts | Recharts | React-native, tree-shakeable (replace Chart.js CDN) |
| Forms | React Hook Form + Zod | Match backend Zod schemas |
| HTTP | ky (tiny fetch wrapper) | Typed, interceptors for auth |
| Testing | Vitest + React Testing Library + Playwright | Already partially configured |

### 1.2 Phase 1 Screens (10 screens — the pilot-critical set)

**Auth (3):**
1. `LoginPage` — email/password + MFA flow → `POST /auth/login`, `POST /auth/mfa-verify`
2. `RegisterPage` — patient self-registration → `POST /auth/register`
3. `AuthCallback` — token storage, redirect by role

**Patient (4):**
4. `PatientHome` — session card, streak, quick-action buttons (journal/checkin/voice)
5. `CheckinPage` — mood/stress/sleep/focus sliders + submit → `POST /patients/:id/checkin`
6. `JournalPage` — text entry + submit → `POST /patients/:id/journal`
7. `SubmissionSuccessPage` — AI reflection (patient tone, summary, next step)

**Clinician (3):**
8. `CaseloadPage` — patient list with signal bands, last contact → `GET /clinician/caseload`
9. `TriageInboxPage` — signal-sorted queue + detail panel → `GET /clinician/triage`, `PATCH /clinician/triage/:id`
10. `DraftReviewPage` — AI summary review/approve/reject → `GET+PATCH /clinician/patients/:id/drafts/:draftId`

### 1.3 Architecture

```
prototype-web/
├── index.html                          # Vite entry (minimal shell)
├── vite.config.ts                      # React plugin + proxy to API
├── tailwind.config.ts                  # Design tokens from prototype
├── postcss.config.ts                   # Tailwind PostCSS plugin
├── tsconfig.json / tsconfig.app.json
│
├── src/
│   ├── main.tsx                        # React root + router mount
│   ├── App.tsx                         # <RouterProvider> + auth guard
│   ├── router.tsx                      # Route definitions (lazy-loaded)
│   │
│   ├── api/                            # API integration layer
│   │   ├── client.ts                   # ky instance + auth interceptor + refresh logic
│   │   ├── auth.ts                     # login(), register(), mfaVerify(), refresh(), logout()
│   │   ├── patients.ts                 # getPatient(), submitCheckin(), submitJournal(), etc.
│   │   ├── clinician.ts               # getCaseload(), getTriage(), patchTriage(), getDrafts(), patchDraft()
│   │   └── types.ts                    # Re-export from @peacefull/shared or inline
│   │
│   ├── stores/                         # Zustand stores
│   │   ├── auth.ts                     # user, tokens, login/logout actions, role
│   │   └── ui.ts                       # sidebar open, toast queue, theme
│   │
│   ├── components/                     # Shared UI components
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            # Sidebar + header + main content area
│   │   │   ├── PatientNav.tsx          # Bottom tab bar (mobile) / sidebar (desktop)
│   │   │   └── ClinicianNav.tsx        # Sidebar navigation for clinician portal
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx              # Signal band badges (LOW/GUARDED/MODERATE/ELEVATED)
│   │   │   ├── Slider.tsx             # Mood/stress/sleep sliders
│   │   │   ├── Toast.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Input.tsx
│   │   └── domain/
│   │       ├── SignalBadge.tsx         # Color-coded signal band indicator
│   │       ├── PatientCard.tsx         # Caseload row with signal + last contact
│   │       ├── TriageCard.tsx          # Triage queue item
│   │       ├── DraftViewer.tsx         # AI summary display with approve/reject
│   │       └── SubmissionReflection.tsx # Patient-facing AI reflection card
│   │
│   ├── pages/                          # Route-level page components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── patient/
│   │   │   ├── PatientHome.tsx
│   │   │   ├── CheckinPage.tsx
│   │   │   ├── JournalPage.tsx
│   │   │   └── SubmissionSuccessPage.tsx
│   │   └── clinician/
│   │       ├── CaseloadPage.tsx
│   │       ├── TriageInboxPage.tsx
│   │       └── DraftReviewPage.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                  # Auth state + redirect if unauthenticated
│   │   ├── useApi.ts                   # Generic data fetching with loading/error
│   │   └── usePatientId.ts            # Resolve patient ID from auth context
│   │
│   └── styles/
│       ├── globals.css                 # Tailwind directives + CSS custom properties
│       └── tokens.css                  # Design tokens migrated from prototype
│
├── public/
│   └── favicon.svg
│
└── tests/
    ├── unit/                           # Vitest component tests
    └── e2e/                            # Playwright smoke tests
```

### 1.4 Key Implementation Details

**API Client (`src/api/client.ts`):**
- Base URL from `import.meta.env.VITE_API_URL` (default: `http://localhost:3001/api/v1`)
- Bearer token from Zustand auth store
- 401 interceptor → attempt token refresh → retry original request → redirect to login on failure
- Response typing via generics: `client.get<Caseload>('/clinician/caseload')`

**Auth Store (`src/stores/auth.ts`):**
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean }>;
  verifyMfa: (userId: string, code: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<boolean>;
}
```
- Tokens persisted to `localStorage` (acceptable for pilot; move to httpOnly cookies for production)
- Role derived from JWT payload for route guards

**Route Guards:**
- `<AuthGuard>` wrapper — redirects to `/login` if no token
- `<RoleGuard role="CLINICIAN">` — redirects patient to `/home` if wrong role
- Lazy-loaded pages via `React.lazy()` + `<Suspense>` for code splitting

**Design Tokens Migration:**
- Extract all CSS custom properties from prototype `index.html` `<style>` block
- Place in `src/styles/tokens.css`
- Map to `tailwind.config.ts` `extend.colors`, `extend.fontFamily`, `extend.borderRadius`
- Key colors: `sage-800: #6C5CE7`, `gold-600: #00B4D8`, semantic (success/warning/danger)
- Fonts: Plus Jakarta Sans (display), DM Sans (body)

**Vite Proxy (development):**
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```

### 1.5 Deployment Pipeline (AWS)

The infrastructure already exists in Terraform. The React app deploys to **S3 + CloudFront** (already provisioned in `modules/storage/`).

**CD Addition to `.github/workflows/cd.yml`:**
1. `npm ci && npm run build` in `prototype-web/`
2. `aws s3 sync dist/ s3://peacefull-{env}-web-{account}/` with `--delete`
3. `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`
4. CloudFront already handles SPA routing (403/404 → index.html)

**Environment variables injected at build time:**
- `VITE_API_URL` → ALB DNS or custom domain (e.g., `https://api.peacefull.ai/api/v1`)
- `VITE_ENV` → `dev` | `staging` | `production`

### 1.6 Files to Modify/Create

**New files (~30):**
- `src/main.tsx`, `src/App.tsx`, `src/router.tsx`
- `src/api/client.ts`, `src/api/auth.ts`, `src/api/patients.ts`, `src/api/clinician.ts`, `src/api/types.ts`
- `src/stores/auth.ts`, `src/stores/ui.ts`
- `src/components/layout/AppShell.tsx`, `PatientNav.tsx`, `ClinicianNav.tsx`
- `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Slider.tsx`, `Toast.tsx`, `Input.tsx`, `Spinner.tsx`, `Modal.tsx`
- `src/components/domain/SignalBadge.tsx`, `PatientCard.tsx`, `TriageCard.tsx`, `DraftViewer.tsx`, `SubmissionReflection.tsx`
- `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`
- `src/pages/patient/PatientHome.tsx`, `CheckinPage.tsx`, `JournalPage.tsx`, `SubmissionSuccessPage.tsx`
- `src/pages/clinician/CaseloadPage.tsx`, `TriageInboxPage.tsx`, `DraftReviewPage.tsx`
- `src/hooks/useAuth.ts`, `useApi.ts`, `usePatientId.ts`
- `src/styles/globals.css`, `src/styles/tokens.css`
- `tailwind.config.ts`, `postcss.config.ts`

**Files to modify:**
- `prototype-web/package.json` — add: `react-router`, `zustand`, `ky`, `react-hook-form`, `@hookform/resolvers`, `zod`, `tailwindcss`, `postcss`, `autoprefixer`, `recharts`
- `prototype-web/vite.config.ts` — add proxy + env config
- `prototype-web/index.html` — strip all inline content, keep only Vite `<script type="module" src="/src/main.tsx">`
- `prototype-web/tsconfig.json` — add path aliases (`@/` → `src/`)
- `.github/workflows/cd.yml` — add S3/CloudFront deploy step

**Files to keep (untouched):**
- `public/js/*` — keep for fallback/reference but not imported by React app
- All backend code in `packages/api/`, `packages/ml-pipeline/`, `packages/shared/`, `packages/infra/`

### 1.7 Definition of Done — Phase 1

- [ ] Patient can register, log in, complete a check-in, and see AI reflection
- [ ] Clinician can log in, view caseload, review triage queue, approve/reject AI drafts
- [ ] App builds with `npm run build` (zero errors)
- [ ] `npm run test` passes (unit tests for auth store, API client, key components)
- [ ] Playwright smoke test: login → submit checkin → see reflection
- [ ] Deployed to AWS: CloudFront serves React app, API runs on ECS, DB on RDS
- [ ] CI/CD pipeline: push to main → auto-deploy frontend to S3 + backend to ECS

---

## Phase 2: Complete Patient Experience (6 additional screens)

**Outcome:** Patients have a full between-session experience.

11. `VoicePage` — voice recording UI + upload to S3 presigned URL → `POST /patients/:id/voice`, `POST /uploads/presign`
12. `HistoryPage` — unified timeline of submissions → `GET /patients/:id/history`
13. `ProgressPage` — streak, XP, badges, weekly mood chart (Recharts) → `GET /patients/:id/progress`
14. `SafetyPlanPage` — view/edit safety plan → `GET/PUT /patients/:id/safety-plan`
15. `ChatPage` — AI companion with SSE streaming → `POST /ai/chat`
16. `SessionPrepPage` — pre-session topic selection → `GET /patients/:id/session-prep`

**Also in Phase 2:**
- Patient settings (theme, notifications, language)
- Patient onboarding flow (consent + profile completion)
- Mobile-responsive refinements (bottom tab bar, touch targets)

### Definition of Done — Phase 2
- [ ] All 16 screens functional with live API data
- [ ] Voice recording works with real S3 upload
- [ ] AI chat streams responses via SSE
- [ ] Onboarding flow captures consent + patient profile
- [ ] Mobile viewport fully usable (375px+)

---

## Phase 3: Complete Clinician Experience (8 additional screens)

**Outcome:** Clinicians have the full workflow — MBC tracking, session notes, escalation management, analytics.

17. `ClinicianPatientDetail` — full patient profile view → `GET /clinician/patients/:id`
18. `MBCDashboardPage` — PHQ-9/GAD-7 score entry + trend charts → `GET/POST /clinician/patients/:id/mbc`
19. `SessionNotesPage` — SOAP note creation + signing → `GET/POST /clinician/patients/:id/session-notes`
20. `MemoryReviewPage` — approve/reject AI memory proposals → `GET/PATCH /clinician/patients/:id/memories`
21. `TreatmentPlanPage` — create/manage treatment plans → `GET/POST/PATCH /clinician/patients/:id/plans`
22. `AdherenceTrackerPage` — view + log adherence → `GET/PATCH /clinician/patients/:id/adherence`
23. `EscalationPage` — escalation queue + ACK/resolve → `GET/PATCH /clinician/escalations`
24. `AnalyticsDashboard` — KPIs, population health, ROI → `GET /analytics/*`

### Definition of Done — Phase 3
- [ ] All 24 screens functional
- [ ] MBC charts show real trend data
- [ ] Session notes can be authored, signed, co-signed
- [ ] Escalation SLA timers visible
- [ ] Analytics dashboard shows real computed metrics

---

## Phase 4: Production Hardening

**Outcome:** The app is production-grade for broader rollout.

- [ ] Replace localStorage tokens with httpOnly cookies (requires API cookie support)
- [ ] Add real-time WebSocket notifications (triage alerts, escalations)
- [ ] Error boundary + Sentry integration
- [ ] WCAG AA accessibility audit (keyboard nav, screen reader, ARIA)
- [ ] Performance budget: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] CSP headers tightened (remove CDN allowances)
- [ ] E2E test coverage for all critical workflows
- [ ] Dark mode toggle (tokens already exist)
- [ ] Multi-tenant login (tenant slug in URL or selector)
- [ ] Export center (PDF/CSV with step-up auth)

---

## Phase 5: UX Audit + Production Verification

**Outcome:** All user-facing flows are crash-free, credentials are aligned, and dev/prod parity is established.

**Phase 5A (commit `6cfdb58`):**
- [x] RegisterPage: password min(12) with full complexity regex
- [x] RegisterPage: PENDING_APPROVAL handling for clinician registration
- [x] LoginPage: "Forgot your password?" link
- [x] LoginPage: MFA prompt text updated to "email verification code"

**Phase 5B (current):**
- [x] SubmissionSuccessPage: safe access on `evidence`, `patientSummary`, `signalBand` (crash fix)
- [x] SubmissionSuccessPage: 404 retry polling (5 attempts × 3s backoff)
- [x] MSW handlers: all responses wrapped in `{ data, requestId }` envelope (dev/prod parity)
- [x] MSW register handler: clinician returns `PENDING_APPROVAL` status without tokens
- [x] E2E test credentials aligned to actual demo seed data
- [x] DEPLOY_SMOKE_CHECKLIST: post-UX-audit verification steps added
- [x] README: Live MVP v1 testing section with demo accounts + smoke test steps

---

## Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Vitest + RTL | Auth store, API client interceptors, form validation, component rendering |
| Integration | Vitest + MSW | API calls with mocked responses, auth flow, role guards |
| E2E | Playwright | Login → checkin → reflection, Login → triage → approve draft |
| Smoke | Playwright | Build + serve + navigate all routes (no 500s, no blank screens) |

**MSW (Mock Service Worker)** for API mocking in tests — prevents test dependency on live backend.

---

## Quality Gates: QA/QC + DevOps Review Pipeline

Every phase must pass through a multi-stage quality pipeline before deployment. No code reaches production without clearing all gates.

### Gate 1: Compilation & Build Integrity

**Trigger:** Every commit / PR

| Check | Tool | Fail Criteria |
|-------|------|---------------|
| TypeScript strict compilation | `tsc --noEmit --strict` | Any type error |
| Vite production build | `npm run build` | Non-zero exit, warnings treated as errors (`--strictWarnings`) |
| Bundle size budget | `vite-plugin-bundle-analyzer` + CI check | Main chunk > 250KB gzipped, any lazy chunk > 100KB |
| Import cycle detection | `madge --circular --extensions ts,tsx src/` | Any circular dependency |
| Dead code detection | `ts-prune` | Unused exports in production code (not test files) |

**CI enforcement:** GitHub Actions job `build-check` — blocks PR merge on failure.

### Gate 2: Code Quality & Static Analysis

**Trigger:** Every commit / PR

| Check | Tool | Threshold |
|-------|------|-----------|
| Linting | ESLint (react, typescript-eslint, import, jsx-a11y plugins) | Zero errors, zero warnings |
| Formatting | Prettier (check mode) | All files formatted |
| Type coverage | `type-coverage --at-least 95` | 95% of expressions typed |
| Complexity | ESLint `complexity` rule | Max cyclomatic complexity: 15 per function |
| Security scan | `npm audit --audit-level=high` | Zero high/critical vulnerabilities |
| Secrets scan | `gitleaks detect` | Zero secrets in source |
| License compliance | `license-checker --failOn 'GPL;AGPL'` | No copyleft licenses in production deps |
| Dependency freshness | `npm outdated` (report only) | Advisory — not blocking, but flagged |

**CI enforcement:** GitHub Actions job `quality-check` — blocks PR merge on failure.

### Gate 3: Test Quality & Coverage

**Trigger:** Every commit / PR

| Layer | Tool | Coverage Floor | Pass Criteria |
|-------|------|---------------|---------------|
| Unit tests | Vitest + RTL | 80% lines, 70% branches for `src/api/`, `src/stores/`, `src/hooks/` | All pass |
| Integration tests | Vitest + MSW | 60% for `src/pages/` | All pass |
| Snapshot tests | Vitest inline snapshots | Key UI components (Badge, Card, SignalBadge) | No unexpected changes |
| E2E critical paths | Playwright | N/A (scenario-based) | 2 workflows pass: patient submit + clinician review |
| Accessibility | `axe-core` via Playwright | N/A | Zero critical/serious WCAG violations |
| Visual regression | Playwright screenshot comparison | N/A | No unreviewed visual diffs |

**Coverage enforcement:** `vitest --coverage` with `c8` provider, thresholds in `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    'src/api/**': { lines: 80, branches: 70 },
    'src/stores/**': { lines: 80, branches: 70 },
    'src/hooks/**': { lines: 80, branches: 70 },
    'src/pages/**': { lines: 60, branches: 50 },
  }
}
```

**CI enforcement:** GitHub Actions job `test-suite` — blocks PR merge on failure.

### Gate 4: DevOps & Infrastructure Review

**Trigger:** Before each phase deployment

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Dockerfile builds | `docker build --target production` | Builds in < 5 min, image < 500MB |
| Health check passes | `curl /health` + `curl /ready` on container | Both return 200 within 30s of start |
| Terraform plan | `terraform plan -var-file=env/{stage}.tfvars` | No unexpected destroys, only additive changes |
| Environment parity | Compare dev/staging/prod env var lists | All required vars present in all environments |
| TLS verification | `curl -v https://` against CloudFront | Valid cert, TLS 1.2+ only, correct HSTS headers |
| WAF rules active | AWS WAF console / `aws wafv2 get-web-acl` | Rate limiting + SQL injection + XSS rules enabled |
| CloudFront cache behavior | Check SPA routing config | 403/404 → index.html, correct cache headers for assets |
| Database migrations | `npx prisma migrate status` | No pending migrations, no drift from schema |
| Secrets rotation | AWS Secrets Manager last-rotated check | All secrets rotated within last 90 days |
| Backup verification | RDS automated backup status | Daily backups enabled, 7-day retention minimum |

**Deployment gate:** Manual approval required from designated reviewer before `terraform apply` or ECS deploy.

### Gate 5: AI Agent Drift Detection

The ML pipeline has 7 Claude agents that generate clinical content. Agent drift — where model outputs deviate from expected clinical standards — is a patient safety risk.

**Automated drift monitoring:**

| Check | Frequency | Method | Alert Threshold |
|-------|-----------|--------|-----------------|
| Triage signal band distribution | Per 100 submissions | Compare ELEVATED/MODERATE/GUARDED/LOW ratios against baseline | >15% shift from baseline distribution |
| Triage default-to-MODERATE rate | Daily | Count submissions where triage agent errored and fell back to MODERATE | >5% fallback rate |
| Summary length consistency | Per 100 drafts | Measure mean/stddev of AI summary character count | >2 stddev from 30-day rolling mean |
| Sentiment polarity drift | Weekly | Run sentiment analysis on patient-facing reflections | Mean polarity shifts >0.3 from baseline |
| Token usage anomalies | Daily | Monitor `tokenUsage` field in AIDraft records | >50% increase in mean token usage |
| Hallucination spot-check | Weekly (manual) | Clinician reviews 5 random AI drafts against source submissions | Any fabricated clinical content = P0 |
| Model version tracking | Every API call | Log `modelVersion` field on every AIDraft | Any unexpected model version change |
| Response latency | Per request | Monitor Claude API p50/p95/p99 latency | p95 > 10s |

**Implementation:**
- Add `drift_monitor` table to Prisma schema: `id, metric, value, baseline, deviation, timestamp`
- CloudWatch custom metrics for automated checks
- SNS alerting to on-call clinician + engineering when thresholds breached
- Weekly drift report auto-generated and emailed to clinical advisor

**Agent version pinning:**
- All agents MUST specify exact Claude model version (e.g., `claude-sonnet-4-20250514`, NOT `claude-sonnet-4-latest`)
- Model version changes require: (1) run against 50-case validation set, (2) clinician review of 10 outputs, (3) explicit approval before production deploy

### Gate 6: Pre-Production Deployment Checklist

**Per-phase deployment gate — requires sign-off from both engineering and clinical review:**

- [ ] All Gate 1-5 checks pass (CI green)
- [ ] Staging environment smoke test passes (manual walkthrough of all new screens)
- [ ] Performance budget met: Lighthouse CI score > 90 (performance), > 90 (accessibility)
- [ ] No console errors in staging (check browser devtools)
- [ ] API error rate < 1% in staging under simulated load
- [ ] OWASP ZAP scan (or equivalent DAST) returns zero high-severity findings
- [ ] Rollback plan documented and tested (ECS task definition revert, CloudFront cache invalidation)
- [ ] Feature flags configured for new screens (can disable without redeploy)
- [ ] Monitoring dashboards updated with new screen/endpoint metrics
- [ ] On-call runbook updated for new failure modes

---

## Synthetic Data Elimination Plan

The prototype contains hardcoded demo data that MUST NOT exist in production. This is both a data integrity requirement and a HIPAA concern (synthetic data patterns could be confused with real PHI).

### Where Synthetic Data Lives Today

| Location | What | Action |
|----------|------|--------|
| `prototype-web/public/js/state.js` | 3 demo patients (Maria Santos, James Mitchell, Emma Chen) with full clinical profiles, submissions, scores, memories, treatment plans | **DELETE** — do not import into React app |
| `prototype-web/public/js/state.js` | Demo clinician profile (Dr. Sarah Chen) | **DELETE** — do not import |
| `prototype-web/public/js/state.js` | Fake MBC scores, triage items, adherence data, safety plans | **DELETE** — do not import |
| `prototype-web/public/js/api-bridge.js` | Fallback demo mode that returns state.js data when API is unavailable | **DELETE** — React app must ONLY use live API |
| `packages/api/prisma/seed.ts` (if exists) | Seed data for development database | **ISOLATE** — keep for dev only, never run in staging/prod |
| Any `*.test.ts` files | Test fixtures with synthetic patient data | **OK** — keep in test files, never imported by production code |

### Enforcement Mechanisms

1. **Build-time guard:** Add ESLint rule to ban imports from `public/js/` in `src/` directory:
   ```json
   "no-restricted-imports": ["error", {
     "patterns": ["**/public/js/*", "**/state.js", "**/api-bridge.js"]
   }]
   ```

2. **No demo mode in React app:** The React app has NO offline/demo fallback. If the API is unreachable:
   - Show a connection error screen with retry button
   - Do NOT render fake data
   - Log the error to monitoring

3. **Database isolation:**
   - Dev/staging databases may contain seed data — clearly labeled with `[SEED]` prefix in names
   - Production database: `prisma migrate deploy` ONLY — no seed script runs
   - CI check: verify `prisma/seed.ts` is NOT referenced in production Dockerfile or deploy scripts

4. **Content audit before each phase deployment:**
   - `grep -r "Maria Santos\|James Mitchell\|Emma Chen\|Dr. Sarah Chen\|demo_\|DEMO_\|mock_\|MOCK_\|fake_\|FAKE_\|seed_\|SEED_" src/` must return zero matches
   - `grep -r "isDemo\|isDemoMode\|demoMode\|useDemoData\|fallbackToDemo" src/` must return zero matches
   - Added as CI job: `synthetic-data-check`

5. **Runtime guard (belt + suspenders):**
   - API client MUST fail loudly if `VITE_API_URL` is not set (no silent fallback to localhost or demo)
   - Add startup assertion in `main.tsx`:
     ```typescript
     if (!import.meta.env.VITE_API_URL) {
       throw new Error('VITE_API_URL is required — demo mode is not supported');
     }
     ```

6. **Old prototype files:**
   - `public/js/state.js`, `public/js/api-bridge.js`, `public/js/render.js`, `public/js/actions.js`, `public/js/helpers.js`, `public/js/events.js`, `public/js/index.js`, `public/js/api.js` — **move to `_archive/prototype/`** directory (not deleted — useful for reference) but excluded from build via `.gitignore` pattern or Vite config
   - Original `index.html` (2,467-line version) — archived alongside

---

## Migration Verification Checklist

For each screen converted from prototype:
- [ ] Visual parity: screenshot comparison with prototype
- [ ] All interactive elements functional (buttons, forms, sliders)
- [ ] API calls match prototype's api-bridge.js endpoints
- [ ] Design tokens match (colors, fonts, spacing, shadows)
- [ ] Accessibility: ARIA labels, keyboard navigation, focus management
- [ ] Loading states shown during API calls
- [ ] Error states shown on API failure
- [ ] Responsive: works at 375px (mobile) and 1440px (desktop)
- [ ] No synthetic data references in component code
- [ ] No hardcoded patient names, IDs, or clinical content
- [ ] All data fetched from live API (network tab verification)
