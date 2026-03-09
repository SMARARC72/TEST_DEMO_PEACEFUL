# Next Feature Pass — C-10 Treatment Plan Editor

## Hosted Demo Review + Code Quality Analysis
- Hosted link access from this environment returned `403` (CONNECT tunnel), so remote runtime inspection was blocked.
- Local review was completed against `prototype-web/index.html` and existing synthetic workflow shell.
- Quality observations before implementation:
  1. Single-file architecture (`index.html`) combines layout, style, and behavior (maintainability risk, deferred).
  2. Global state + inline `onclick` patterns increase coupling but provide deterministic demo behavior (accepted for current scope).
  3. Existing C-11 memory governance was implemented, but downstream clinician planning workflow (C-10) remained a high-value gap.

## Why C-10 Was Selected Next
- Highest follow-on value after C-11 for investor narrative:
  - demonstrates continuity from memory moderation -> actionable clinician planning
  - strengthens operational moat via clinician-governed planning readiness signal
  - reuses existing shell without introducing parallel stores/components

## What Was Implemented
- Added **Treatment Plan (C-10)** nav entry in demo controls.
- Added **Treatment Plan Editor** screen with:
  - clinician-only safety framing
  - plan table (patient, goal, intervention, owner, target, status)
  - detail panel with evidence links, known unknowns, and audit line
  - status actions: `DRAFT`, `REVIEWED`, `HOLD`
- Added deterministic synthetic state:
  - `baselinePlanItems`, `renderTreatmentPlan`, `selectPlan`, `updatePlanStatus`, `resetTreatmentPlan`
  - wired into `resetDemo`
- Added lightweight ROI/moat linkage (simulated):
  - ROI dashboard "Treatment Plan Operational Signal"
  - clinician profile treatment plan snapshot (reviewed-only)

## Safety / Boundary Checks
- Treatment planning controls are clinician-surface only.
- Copy explicitly labels synthetic/demo status and avoids autonomous care claims.
- Metrics are labeled simulated pilot signals (not clinical efficacy claims).

## Validation
- `npm run build` ✅
- `npm run lint` ✅
- Playwright smoke/assertions ✅:
  - treatment-plan route renders
  - status transition to `REVIEWED` updates reviewed count
  - `resetDemo` restores baseline count
  - patient experience does not expose clinician plan moderation controls
- Screenshot captured for C-10 screen.
