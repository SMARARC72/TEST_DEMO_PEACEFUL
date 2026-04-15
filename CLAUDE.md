# CLAUDE.md — Legacy Peacefull MVP (Read-Only Retention)

> **This is the legacy Peacefull MVP repo** (React 19 + Vite 7 + Express 5 + Prisma + Neon + Auth0 + ECS Fargate).
>
> Per **ADR-0001** and **ADR-0002** in the production repo, the rebuild has moved to **[smararc72/peacefull_ai_prod_vercel](https://github.com/smararc72/peacefull_ai_prod_vercel)** on Next.js 15 + Supabase + Vercel, with **no ETL** from this repo.
>
> **Status:** Retained read-only for reference. No new patient features. Security-only hot-fixes permitted with CGC ticket.

## Source of truth (governance)

**All governance — CLAUDE contract, ADRs, ORG-01 taxonomy, ORG-02 clinical safety, HIPAA, rules, plan — lives in `peacefull_ai_prod_vercel`.** Do not duplicate here. Reference it:

| Topic | Authoritative location |
|---|---|
| Operating contract | [`peacefull_ai_prod_vercel/CLAUDE.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/CLAUDE.md) |
| ORG-01 Taxonomy | [`docs/TAXONOMY.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/TAXONOMY.md) |
| Clinical Safety (ORG-02) | [`docs/ORG-02_CLINICAL_SAFETY.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/ORG-02_CLINICAL_SAFETY.md) |
| HIPAA | [`docs/HIPAA.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/HIPAA.md) |
| ADRs (14) | [`docs/ADR/`](https://github.com/smararc72/peacefull_ai_prod_vercel/tree/claude/review-peaceful-project-WaqOG/docs/ADR) |
| Governance (GOV-01..07) | [`docs/GOV/`](https://github.com/smararc72/peacefull_ai_prod_vercel/tree/claude/review-peaceful-project-WaqOG/docs/GOV) |
| Master plan | [`docs/PLAN.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/PLAN.md) |

## Legacy operating reference (for security hot-fixes only)

### Stack (legacy)
- **Frontend:** React 19 + Vite 7 → Netlify (`peacefullai.netlify.app`)
- **Backend:** Express 5 + Prisma 6 → ECS Fargate (`api.peacefull.cloud`)
- **DB:** Neon Postgres (prod) via `DATABASE_URL`
- **Auth:** Auth0 Universal Login + local JWT issuance post-sync
- **AI:** Claude Sonnet via Anthropic SDK
- **Real-time:** WebSocket at `/ws` — **known broken (404);** fixed by Supabase Realtime in the new repo

### Key paths
- Frontend: `prototype-web/src/`
- API routes: `packages/api/src/routes/`
- Prisma schema: `packages/api/prisma/schema.prisma`
- Shared types: `packages/shared/src/types/`

### Sanity commands

```bash
# API — type-check and test
cd packages/api && npx tsc --noEmit && npm test

# Frontend — type-check and test
cd prototype-web && npx tsc --noEmit -p tsconfig.app.json && npm test -- --run

# Frontend build (bundle must be ≤ 400 KB gzip)
cd prototype-web && npm run build

# E2E prod smoke
cd prototype-web && npx playwright test tests/e2e-prod-smoke.spec.mjs
```

## Retention rules (binding)

1. **No new features.** Security + critical bug fixes only.
2. **Security-critical hot-fix path:** open a `CGC-YYYY-NNN` ticket (per ORG-01) in the production repo's Notion + reference its ADR if architectural + Security Lead review required.
3. **No real PHI.** Confirm synthetic-only before any change.
4. **Sunset trigger:** once the production rebuild reaches Phase 9 go-live, this repo is archived per a new ADR: CI disabled, branch protection locked, snapshot tagged `legacy-final-YYYYMMDD`.

## Known blockers (documented; do not fix here)

- WebSocket 404 on the ECS-hosted real-time endpoint (fixed by Supabase Realtime in the new repo).
- Auth0 regression on silent refresh (resolved by Supabase Auth + MFA in the new repo).

## Branch + commit policy (reduced surface)

- Integration branch: `claude/review-peaceful-project-WaqOG`.
- Commits reference `WI-LEGACY-NNN` + the central-repo ADR that authorizes the change.
- No direct pushes to `main`.
- Never merge without Security Lead approval.

## Dual-logging rule (binding)

Every PR here also files a Notion row (Work Item + Build Log entry) — even for read-only retention fixes. This keeps Notion at 100% parity across all three repos.

## What NOT to do

- Do not commit `.env`, credentials, `.tfstate`, or log files.
- Do not store secrets in code — use environment variables.
- Do not bypass CSRF protection or skip MFA enforcement.
- Do not introduce OWASP top-10 vulnerabilities.
- Do not add new features — redirect them to `peacefull_ai_prod_vercel`.

## References

- [`peacefull_ai_prod_vercel/docs/PLAN.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/PLAN.md) — full rebuild plan (§4: no ETL).
- [`peacefull_ai_prod_vercel/docs/ADR/ADR-0002-greenfield.md`](https://github.com/smararc72/peacefull_ai_prod_vercel/blob/claude/review-peaceful-project-WaqOG/docs/ADR/ADR-0002-greenfield.md) — authorizes this repo's retention posture.
