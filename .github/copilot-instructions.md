# Copilot Instructions — Peacefull Project

## MANDATORY BASELINE REFERENCE

**Before ANY code generation, modification, or review:**

1. **READ `3.4.26PT1.md`** at the project root — this is the mandatory baseline checkpoint.
2. **Validate** that proposed changes do not regress any passing gate review criteria.
3. **Update** the Change Log in `3.4.26PT1.md` after every significant change.

## Rules

- Always reference `3.4.26PT1.md` FIRST as the authoritative baseline.
- No code changes that introduce new TypeScript errors (`tsc --noEmit` must stay at 0 errors).
- No changes that increase bundle size beyond 400 KB gzip.
- All new code must include proper null/undefined guards (project uses `noUncheckedIndexedAccess: true`).
- All API response types must be defined in `src/api/types.ts`.
- All mock handlers must match the shape of real API responses.
- Every PR/commit must pass Gate 1 (Content Completeness) from `3.4.26PT1.md`.
- Deployments require Gate 2 (Quality & Accuracy).
- VC demos require Gate 3 (Investor-Readiness).

## Reference Hierarchy

1. `3.4.26PT1.md` — Baseline checkpoint (MANDATORY FIRST READ)
2. `VC_PACKAGE_ROADMAP.md` — VC package requirements
3. `QA_CHECKLIST.md` — Testing requirements
4. `RED_TEAM_REPORT.md` — Security requirements

## Testing Commands

```bash
cd prototype-web
npx tsc --noEmit -p tsconfig.app.json   # Must exit 0
npm run test -- --run                     # All tests pass
npm run build                             # Bundle ≤ 400 KB
npx playwright test                       # E2E smoke tests
```
