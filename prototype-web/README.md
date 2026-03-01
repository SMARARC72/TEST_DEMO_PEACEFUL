# Peacefull.ai — React Frontend

**Stack:** React 19.2 · TypeScript 5.9 · Vite 7.3 · Tailwind CSS 4.2 · Zustand 5 · Recharts 3  
**Live Demo:** [peacefullai.netlify.app](https://peacefullai.netlify.app) (mock mode)  
**Latest Commit:** `217586a` — Phase 6 Deployment & Go-Live  
**Last Updated:** 2026-03-02

---

## Quick Start

```bash
npm ci
npm run dev          # → http://localhost:5173 (mock mode via MSW)
```

No backend required — MSW intercepts all API calls with realistic mock data.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Vite HMR) |
| `npm run build` | TypeScript check + Vite production build |
| `npm test` | Vitest — 74 pass, 11 skip (14 snapshots) |
| `npm run test:smoke` | Playwright smoke tests |
| `npm run test:e2e` | Playwright E2E (patient + clinician flows) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint (react-hooks, jsx-a11y, complexity) |
| `npm run check:bundle` | Bundle size budget verification |
| `npm run check:circular` | Circular dependency detection |
| `npm run check:synthetic` | Verify no synthetic data leaks into src/ |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_MOCKS` | `true` | Enable MSW mock service worker |
| `VITE_API_URL` | `http://localhost:3001/api/v1` | Backend API base URL |
| `VITE_AUTH_MODE` | `bearer` | Auth mode: `cookie` (httpOnly) or `bearer` |
| `VITE_ANALYTICS_URL` | — | Web Vitals beacon endpoint |
| `VITE_SENTRY_DSN` | — | Sentry error monitoring DSN |
| `VITE_ENV` | `development` | Environment: dev / staging / production |
| `VITE_FEATURE_FLAGS_URL` | — | Remote feature flag config endpoint |
| `VITE_FF_<FLAG>` | `true` | Per-feature toggle (e.g., `VITE_FF_PATIENT_CHAT=false`) |

---

## Architecture

```
src/
├── main.tsx                    # React root, MSW init, WebSocket wiring
├── router.tsx                  # All routes (lazy-loaded via React.lazy)
├── api/                        # ky-based HTTP client + typed API methods
│   ├── client.ts               # Dual-mode auth (cookie/bearer), tenant headers, refresh
│   ├── auth.ts                 # login, register, mfa, step-up, tenants
│   ├── patients.ts             # check-in, journal, voice, history, safety plan
│   ├── clinician.ts            # caseload, triage, drafts, MBC, notes, exports
│   └── types.ts                # Shared API types
├── stores/                     # Zustand state management
│   ├── auth.ts                 # User, tokens, login/logout, role
│   ├── ui.ts                   # Sidebar, toasts, theme
│   ├── ws.ts                   # WebSocket notifications (auto-reconnect)
│   ├── tenant.ts               # Multi-tenant store (slug extraction, persistence)
│   ├── patient.ts              # Patient-specific state
│   └── clinician.ts            # Clinician-specific state
├── hooks/                      # Custom React hooks
│   ├── useApi.ts               # Generic data fetching + loading/error
│   ├── useTheme.ts             # Dark mode store + system preference sync
│   ├── useWebVitals.ts         # Core Web Vitals (LCP, CLS, FID, INP, TTFB, FCP)
│   ├── useIdleTimeout.ts       # Inactivity logout timer
│   ├── useDebounce.ts          # Debounced values
│   ├── usePagination.ts        # Pagination logic
│   ├── usePatientId.ts         # Patient ID from context
│   └── useMediaQuery.ts        # Media query hook
├── components/
│   ├── layout/                 # App shell, nav, guards, error handling
│   │   ├── AppShell.tsx        # Sidebar + header + NotificationBell + ThemeToggle
│   │   ├── AuthGuard.tsx       # Route protection + role gating
│   │   ├── ErrorBoundary.tsx   # React error boundary + Sentry reporting
│   │   ├── SkipLink.tsx        # WCAG "Skip to content" link
│   │   └── LiveAnnouncer.tsx   # ARIA live region for screen readers
│   ├── ui/                     # Generic UI primitives (13 components)
│   │   ├── Button, Card, Badge, Input, Textarea, Slider
│   │   ├── Modal, Toast, Spinner, Pagination
│   │   └── ThemeToggle.tsx     # Light/dark/system mode selector
│   └── domain/                 # Business-specific components
│       ├── SignalBadge.tsx      # Color-coded triage signal bands
│       ├── PatientCard.tsx     # Caseload row with signal + last contact
│       ├── TriageCard.tsx      # Triage queue item
│       ├── DraftViewer.tsx     # AI summary display with approve/reject
│       ├── NotificationBell.tsx # Real-time notification dropdown
│       ├── TenantSelector.tsx  # Organization picker
│       ├── StepUpAuth.tsx      # Step-up re-authentication modal
│       └── SubmissionReflection.tsx # Patient-facing AI reflection
├── pages/                      # Route-level page components (33 pages)
│   ├── auth/                   # Login, Register, ForgotPassword, TenantSelect
│   ├── patient/                # 14 patient screens
│   └── clinician/              # 15 clinician screens
├── mocks/                      # MSW handlers (~910 lines, 25+ endpoints)
│   ├── browser.ts              # MSW browser worker setup
│   └── handlers.ts             # All mock API handlers
└── styles/
    ├── globals.css             # Tailwind directives + base styles
    └── tokens.css              # Design tokens (colors, fonts, spacing)
```

---

## Pages (33 Total)

### Auth (4)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Email/password + MFA |
| `/register` | RegisterPage | Patient self-registration |
| `/forgot-password` | ForgotPasswordPage | Password reset request |
| `/select-tenant` | TenantSelectPage | Multi-tenant org selector |

### Patient (14)

| Route | Page | Description |
|-------|------|-------------|
| `/patient` | PatientHome | Dashboard + streak + quick actions |
| `/patient/welcome` | WelcomePage | Product boundaries |
| `/patient/consent` | ConsentPage | Consent acknowledgments |
| `/patient/checkin` | CheckinPage | Daily mood/stress/sleep sliders |
| `/patient/journal` | JournalPage | Text journal entry |
| `/patient/submission/:id` | SubmissionSuccessPage | AI reflection card |
| `/patient/voice` | VoiceMemoPage | Voice recorder + upload |
| `/patient/chat` | ChatPage | AI companion (SSE streaming) |
| `/patient/history` | HistoryPage | Unified submission timeline |
| `/patient/session-prep` | SessionPrepPage | Pre-session topic selection |
| `/patient/safety-plan` | SafetyPlanPage | Safety plan view/edit |
| `/patient/resources` | ResourcesPage | Safety resources |
| `/patient/settings` | SettingsPage | Patient preferences |

### Clinician (15)

| Route | Page | Description |
|-------|------|-------------|
| `/clinician` | CaseloadPage | Patient list + signal bands |
| `/clinician/caseload` | CaseloadPage | Same as above |
| `/clinician/triage` | TriageInboxPage | Signal-sorted queue |
| `/clinician/triage/:id` | InboxDetailPage | Triage item detail |
| `/clinician/patients/:id` | PatientProfilePage | Full patient profile |
| `/clinician/patients/:id/drafts` | DraftReviewPage | AI draft approve/reject |
| `/clinician/patients/:id/recommendations` | RecommendationsPage | Recommendations panel |
| `/clinician/patients/:id/plans` | TreatmentPlanPage | Treatment plan editor |
| `/clinician/patients/:id/memories` | MemoryReviewPage | AI memory proposals |
| `/clinician/patients/:id/restricted-notes` | RestrictedNotesPage | Restricted note access |
| `/clinician/patients/:id/exports` | ExportsCenterPage | Export center + step-up auth |
| `/clinician/patients/:id/mbc` | MBCDashboardPage | PHQ-9/GAD-7 charts |
| `/clinician/patients/:id/session-notes` | SessionNotesPage | SOAP notes + sign |
| `/clinician/patients/:id/adherence` | AdherenceTrackerPage | Adherence tracker |
| `/clinician/escalations` | EscalationPage | Escalation queue (P0–P3, SLA) |
| `/clinician/analytics` | AnalyticsDashboard | Population analytics + charts |
| `/clinician/settings` | ClinicianSettingsPage | Clinician preferences |

---

## Testing

| Layer | Files | Tests | Tool |
|-------|-------|-------|------|
| Unit — stores | stores.test.ts | 4 | Vitest |
| Unit — hooks | hooks.test.ts | 2 | Vitest |
| Unit — calculators | calculators.test.mjs | 27 (11 skip) | Vitest |
| Snapshot — UI | snapshots.test.tsx | 14 | Vitest |
| Component — UI | ui-components.test.tsx | 22 | Vitest + RTL |
| Component — domain | domain-components.test.tsx | 16 | Vitest + RTL |
| Smoke — E2E | smoke.spec.mjs | 3 | Playwright |
| E2E — patient flow | e2e-patient-checkin.spec.mjs | 2 | Playwright |
| E2E — clinician flow | e2e-clinician-review.spec.mjs | 3 | Playwright |
| **Total** | **9 files** | **93** (74 unit + 8 E2E + 11 skip) | |

### Coverage Thresholds (vitest.config.mjs)

```
src/api/**     → 80% lines, 70% branches
src/stores/**  → 80% lines, 70% branches
src/hooks/**   → 80% lines, 70% branches
src/pages/**   → 60% lines, 50% branches
```

---

## PRD Phase Progress

| Phase | Name | Status | Key Deliverable |
|-------|------|--------|-----------------|
| 1 | Pilot MVP (10 screens) | ✅ Complete | Login, checkin, journal, caseload, triage, drafts |
| 2 | Patient Experience (+6) | ✅ Complete | Voice, chat, history, safety plan, session prep |
| 3 | Clinician Experience (+8) | ✅ Complete | MBC, notes, memory, treatment, escalation, analytics |
| 4 | Production Hardening | ✅ Complete | Cookie auth, WS, WCAG, dark mode, CSP, Web Vitals, tenants, step-up auth |
| 5 | Quality Gates | ✅ Complete | Bundle guards, circular dep checks, synthetic data CI, ESLint a11y, 14 snapshots |
| 6 | Deployment & Go-Live | ✅ Complete | S3+CF CD pipeline, feature flags, Lighthouse CI, runtime guards, rollback plan |

### Phase 4 Deliverables (Complete)

| Item | Implementation |
|------|---------------|
| httpOnly cookie auth | Dual-mode API client (`cookie`/`bearer`) in `api/client.ts` |
| WebSocket notifications | `stores/ws.ts` + `NotificationBell.tsx` (auto-reconnect, priority badges) |
| WCAG 2.1 accessibility | `SkipLink.tsx`, `LiveAnnouncer.tsx`, ARIA roles, focus management |
| Dark mode | `useTheme.ts` store + `ThemeToggle.tsx` (light/dark/system with OS sync) |
| CSP headers | `netlify.toml` — removed CDN allowances, added frame-ancestors, WSS |
| Web Vitals monitoring | `useWebVitals.ts` — LCP, CLS, FID, INP, TTFB, FCP with beacon |
| Multi-tenant login | `stores/tenant.ts` + `TenantSelector.tsx` + `/select-tenant` route |
| Step-up auth | `StepUpAuth.tsx` — re-auth modal for sensitive exports |
| Error boundary | `ErrorBoundary.tsx` — catch-all with Sentry integration |
| E2E tests | Patient checkin flow + clinician review flow (Playwright) |

### Phase 5 Deliverables (Complete)

| Item | Status | Detail |
|------|--------|--------|
| Bundle size CI guard | ✅ | `scripts/check-bundle-size.mjs` — 250KB main, 100KB lazy, 150KB vendor, 25KB CSS gzip budgets |
| Circular dependency detection | ✅ | `scripts/check-circular-deps.mjs` — DFS on static imports, 84 files scanned, 0 cycles |
| Synthetic data CI guard | ✅ | `scripts/check-synthetic-data.mjs` — blocks demo names/IDs/flags in src/ |
| ESLint jsx-a11y + complexity rules | ✅ | 18 a11y rules + complexity ≤25 + max-depth ≤5 + max-lines ≤300 |
| Snapshot tests for key UI components | ✅ | 14 snapshots: Badge(3), Card(1), Button(4), Spinner(2), SignalBadge(4) |
| Enhanced CI pipeline | ✅ | lint + circular + synthetic in CI; bundle check as postbuild |

### Phase 6 Deliverables (Complete)

| Item | Status | Detail |
|------|--------|--------|
| S3+CloudFront CD pipeline | ✅ | `.github/workflows/cd-frontend.yml` — build → S3 sync → CF invalidation |
| Feature flag system | ✅ | `useFeatureFlags.ts` + `FeatureGate.tsx` — env vars + remote config, 22 flags |
| Lighthouse CI | ✅ | `lighthouserc.js` — performance >0.9, a11y >0.9, CWV thresholds |
| Production runtime guard | ✅ | `main.tsx` — throws if VITE_API_URL missing in production |
| Rollback plan | ✅ | `packages/infra/runbook/ROLLBACK_PLAN.md` — S3/ECS/DB/feature-flag rollback |
| Security scanning | ✅ | Gitleaks + license-checker added to CI security-scan job |
| Env type declarations | ✅ | `src/env.d.ts` — typed ImportMetaEnv for all VITE_ vars |

---

## Deployment

### Netlify (Staging/Demo)

- **URL:** [peacefullai.netlify.app](https://peacefullai.netlify.app)
- **Auto-deploy:** Push to `main` → Netlify builds and deploys
- **Build:** `npm ci && npm run check:artifacts && npm run build` (in `prototype-web/`)
- **Env vars:** `VITE_ENABLE_MOCKS=true` (set in Netlify dashboard)
- **Node:** v22 (`.nvmrc`)

### AWS (Production)

- **Frontend:** S3 + CloudFront (Terraform provisioned, CD via `cd-frontend.yml`)
- **Backend:** ECS Fargate + ALB (`us-east-1`, CD via `cd.yml`)
- **Database:** Neon PostgreSQL (Prisma ORM)
- **Auth:** Auth0 RS256 (production) / Local HS256 (dev)
- **Rollback:** See `packages/infra/runbook/ROLLBACK_PLAN.md`

---

## Git History (Recent)

| Commit | Description |
|--------|-------------|
| `217586a` | Phase 6: Deployment & Go-Live (S3+CF CD, feature flags, Lighthouse CI, rollback plan) |
| `f7d48ff` | Phase 5: Quality Gates (bundle/circular/synthetic CI guards, jsx-a11y, 14 snapshots) |
| `54ce9d7` | Phase 4: Production Hardening (cookie auth, WS, WCAG, dark mode, CSP, tenants, E2E) |
| `84ef86e` | Pin Node 22 via .nvmrc + engines field |
| `9aab8ff` | Add missing MSW handlers (MFA, voice, chat SSE) |
| `444624f` | Pilot readiness plan in README, .gitignore .env |
| `6ecca2c` | Fix all 42 TypeScript problems → zero errors |
| `ff9aac5` | Security Agent hardening |
| `70a3165` | PRD phases 2-4: 9 new pages, API wiring, CI/CD |
| `fed86bd` | Production hooks, stores, MSW mocks, component tests |
