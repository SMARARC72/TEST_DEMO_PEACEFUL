# CLAUDE.md — Peacefull.ai

## Project Overview

Behavioral health AI companion platform. Monorepo with React frontend + Express API.

### Stack
- **Frontend**: React 19 + Vite 7 → Netlify (`peacefullai.netlify.app`)
- **Backend**: Express 5 + Prisma 6 → ECS Fargate (`api.peacefull.cloud`)
- **DB**: Neon Postgres (prod) via `DATABASE_URL`
- **Auth**: Auth0 Universal Login (sole IdP) + local JWT issuance post-sync
- **AI**: Claude Sonnet 4 via Anthropic SDK
- **Real-time**: WebSocket at `/ws` (proxied by Netlify → ECS)

### Key Paths
- Frontend source: `prototype-web/src/`
- API routes: `packages/api/src/routes/`
- Prisma schema: `packages/api/prisma/schema.prisma`
- Shared types: `packages/shared/src/types/`
- Baseline PRD: `3.4.26PT1.md` (mandatory reference)

## Development Commands

```bash
# API — type-check and test
cd packages/api && npx tsc --noEmit && npm test

# Frontend — type-check and test
cd prototype-web && npx tsc --noEmit -p tsconfig.app.json && npm test -- --run

# Frontend build (bundle must be ≤ 400 KB gzip)
cd prototype-web && npm run build

# E2E prod smoke tests
cd prototype-web && npx playwright test tests/e2e-prod-smoke.spec.mjs
```

## Architecture Rules

### Auth Flow (Option A: Auth0 as sole IdP)
- Auth0 Universal Login handles all authentication + MFA (Auth0 Guardian)
- `/auth0-sync` endpoint links Auth0 identity via `auth0Sub` field (persistent)
- Local JWT (HS256) issued post-sync for API/WS compatibility
- `amr` claim checked for MFA completion on privileged roles
- Local email/password login preserved as dev/testing fallback only
- `authMethod` field on User: `AUTH0` or `LOCAL`

### Tenant Isolation
- All DB queries scope to `req.user.tid` (tenantId from JWT)
- Single tenant in pilot: slug `peacefull-health`

### API Conventions
- All response types defined in `prototype-web/src/api/types.ts`
- API responses wrapped via `sendSuccess()` helper
- Zod validation on all request bodies

### Route Guards
- `AuthGuard` and `PublicRoute` live in `prototype-web/src/components/layout/`
- No separate `guards/` directory

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess: true`
- All new code must include proper null/undefined guards
- No force-push to main
- Every change must pass `tsc --noEmit` with 0 errors
- Prefer editing existing files over creating new ones

## What NOT to Do

- Do not commit `.env`, credentials, `.tfstate`, or log files
- Do not store secrets in code — use environment variables
- Do not bypass CSRF protection or skip MFA enforcement
- Do not create new top-level markdown files — use `docs/` or `_archive/`
- Do not add mock handlers that don't match real API response shapes
- Do not introduce OWASP top-10 vulnerabilities
