# PRD – MVP v1 Final Sprint

> **Status:** EXECUTED  
> **Date:** 2025-01-27  
> **Scope:** All remaining issues blocking go-live readiness

---

## Issue Inventory

### Sprint 1 — Critical (CR)

| ID | Issue | Status |
|----|-------|--------|
| CR-1 | API v1 prefix consistency | ✅ Already correct — `VITE_API_URL="/api/v1"` + ky `prefixUrl` |
| CR-2 | `usePatientId` hook | ✅ Already exists — returns `user?.id` |
| CR-3 | Consent gate | ✅ `AuthGuard` checks consent, `ConsentPage` exists |
| CR-4 | Toast store | ✅ `useUIStore.addToast({title,description?,variant})` |

### Sprint 2 — High (HI)

| ID | Issue | Status |
|----|-------|--------|
| HI-1 | Empty states on all pages | ✅ All 29 pages have empty states (PatientHome, Journal, History, Caseload, etc.) |
| HI-2 | Loading spinners on all pages | ✅ All data-fetching pages show `<Spinner>` while loading |
| HI-3 | Error handling on data load | ✅ **Fixed:** 12 clinician + 5 patient pages now destructure `[data, err]` and toast on error |
| HI-4 | Graceful 404 handling | ✅ Catch-all route → `/login` redirect |
| HI-5 | Network error fallback | ✅ `toApiError()` in client.ts normalises to `NETWORK_ERROR` |
| HI-6 | Token refresh on 401 | ✅ Already in `client.ts` afterResponse hook — auto-refresh + retry |
| HI-7 | Form validation feedback | ✅ RegisterPage (zod), CheckinPage (sliders), ConsentPage (checkboxes) |
| HI-8 | Accessibility | ✅ SkipLink, LiveAnnouncer, ARIA attributes, focus management |

### Sprint 3 — Medium (MD)

| ID | Issue | Status |
|----|-------|--------|
| MD-1 | ErrorBoundary double-path bug | ✅ **Fixed:** `${apiUrl}/errors/report` (was `${apiUrl}/api/v1/errors/report`) |
| MD-2 | AnalyticsDashboard infinite spinner | ✅ **Fixed:** Separated `loading` vs `error` state, added `<PageError>` fallback |
| MD-3 | Settings fallback on API failure | ✅ Patient + Clinician settings use defaults with info toast |
| MD-4 | SafetyPlan / Resources API fallback | ✅ Default steps / crisis contacts always show, info toast on API fail |
| MD-5 | CSP connect-src for api.peacefull.cloud | ✅ **Fixed:** Added `https://*.peacefull.cloud` to index.html CSP |
| MD-6 | Mobile responsive audit | ✅ Viewport meta, responsive AppShell sidebar, Tailwind grid breakpoints |

### Sprint 4 — Low (LO)

| ID | Issue | Status |
|----|-------|--------|
| LO-1 | Reusable `<PageError>` component | ✅ Created `components/ui/PageError.tsx` |
| LO-2 | sessionStorage for auth tokens (not localStorage) | ✅ Already correct in ErrorBoundary fix |
| LO-3 | MSW unregister in production | ✅ Already in main.tsx |
| LO-4 | CORS verified | ✅ api.peacefull.cloud returns 204 on preflight |
| LO-5 | Build passes clean | ✅ `vite build` — 0 errors, all 29 pages compiled |

---

## Go-Live Checklist

| ID | Criterion | Status |
|----|-----------|--------|
| GL-1 | Register patient flow | ✅ `/register` → `authApi.register()` → PENDING_APPROVAL or auto-login |
| GL-2 | Register clinician flow | ✅ Role selector, SUSPENDED status for clinicians |
| GL-3 | Demo login works | ✅ `test.patient.1@peacefull.cloud` / `Demo2026!` → 200 |
| GL-4 | Check-in → submission → reflection | ✅ `/patient/checkin` → `/patient/submission/:id` with polling |
| GL-5 | History page loads | ✅ Unified timeline with filters, error toast on failure |
| GL-6 | Journal submission | ✅ Post + toast + prepend to list |
| GL-7 | Safety plan displays | ✅ Stanley-Brown 6-step with API fallback to defaults |
| GL-8 | Clinician caseload | ✅ Search, stats cards, PatientCard grid with error toast |
| GL-9 | No blank screens | ✅ All routes have content — 404 → login redirect |
| GL-10 | No runtime JS errors | ✅ ErrorBoundary catches + reports, no known crashes |
| GL-11 | No MSW in production | ✅ `VITE_ENABLE_MOCKS !== 'true'` guard + stale worker unregister |
| GL-12 | CORS working | ✅ Preflight 204, Netlify proxy `/api/*` → `api.peacefull.cloud` |
| GL-13 | 401 → redirect to login | ✅ client.ts afterResponse: refresh or `window.location.href = '/login'` |
| GL-14 | Loading states on all data pages | ✅ All 29 pages show `<Spinner>` during fetch |
| GL-15 | Error states on all data pages | ✅ All pages now surface errors via toast or `<PageError>` |

---

## Files Modified in This Sprint

- `prototype-web/index.html` — CSP connect-src fix
- `prototype-web/src/components/layout/ErrorBoundary.tsx` — Double-path bug fix
- `prototype-web/src/components/ui/PageError.tsx` — **New** reusable component
- `prototype-web/src/pages/clinician/AnalyticsDashboard.tsx` — Infinite spinner fix + PageError
- `prototype-web/src/pages/clinician/CaseloadPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/ClinicianSettingsPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/DraftReviewPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/ExportsCenterPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/InboxDetailPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/MemoryReviewPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/PatientProfilePage.tsx` — Load error toast + import
- `prototype-web/src/pages/clinician/RecommendationsPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/RestrictedNotesPage.tsx` — Load error toast + import
- `prototype-web/src/pages/clinician/TreatmentPlanPage.tsx` — Load error toast
- `prototype-web/src/pages/clinician/TriageInboxPage.tsx` — Load error toast
- `prototype-web/src/pages/patient/JournalPage.tsx` — Load error toast
- `prototype-web/src/pages/patient/ResourcesPage.tsx` — Load error toast + import
- `prototype-web/src/pages/patient/SafetyPlanPage.tsx` — Load error toast + import
- `prototype-web/src/pages/patient/SettingsPage.tsx` — Load error toast
- `prototype-web/src/pages/patient/VoiceMemoPage.tsx` — Load error toast
