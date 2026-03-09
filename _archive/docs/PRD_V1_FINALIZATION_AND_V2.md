# PRD — V1 Finalization, Testing & V2 Roadmap

> **Document ID:** `PRD-V1F-2026-001`  
> **Version:** `1.0.0`  
> **Status:** `IN PROGRESS`  
> **Created:** 2026-03-03  
> **Priority:** P0 — Required before pilot launch  

---

## Table of Contents

1. [Part A — V1 Audit Findings](#part-a--v1-audit-findings)
2. [Part B — Test Plan (Manual + Automated)](#part-b--test-plan-manual--automated)
3. [Part C — Organization / Practice Model](#part-c--organization--practice-model)
4. [Part D — V2 Feature Roadmap](#part-d--v2-feature-roadmap) *(deferred to next session)*
5. [Part E — V1 Remaining Fixes & Sign-Off Checklist](#part-e--v1-remaining-fixes--sign-off-checklist)

---

## Part A — V1 Audit Findings

### A.1 — Registration Flow Does Not Show Success Confirmation

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | FIX REQUIRED |
| **Root Cause** | After successful registration, `RegisterPage.onSubmit()` fires a toast and immediately navigates to `/patient/welcome`. The toast unmounts with the page before the user sees it. There is no dedicated success screen. |
| **Impact** | Users don't know their account was created; creates uncertainty and potential re-registration attempts. |
| **Fix** | Create a `/register/success` route with a dedicated `RegistrationSuccessPage` component showing: checkmark animation, "Account Created Successfully!", user name/email, and a "Continue" button. |

### A.2 — No Welcome/Confirmation Email Sent on Registration

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | FIX REQUIRED |
| **Root Cause** | The backend `POST /auth/register` handler creates the user record and returns tokens but never calls `sendEmail()` to send a welcome confirmation. The `sendEmail` function and SES infrastructure exist (used for MFA codes, password resets, and escalation alerts) but are not invoked during registration. |
| **Impact** | Users receive no email proof of account creation. In regulated (HIPAA) environments, email confirmation is expected as an audit trail. Clinicians pending approval receive no email notification either. |
| **Fix** | (1) Add a `welcome` email template to `notification.ts`. (2) Call `sendEmail()` in the registration handler after user creation. (3) For clinicians (PENDING_APPROVAL), send a separate "pending approval" email + notify the tenant supervisor. |

### A.3 — Clinician Pages May Still Crash on Empty/Null API Data

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | PARTIALLY FIXED |
| **Root Cause** | Previous null-guard commit (`76a0e74`) added `?? []` guards to 8 clinician pages, but some pages still render data without null checks on nested properties like `profile.patient.signalBand`, `item.patient.user.firstName`, etc. |
| **Impact** | TypeErrors on clinician pages when API returns null/empty nested fields. |
| **Fix** | Audit all 16 clinician pages and add defensive rendering for every property access chain. |

### A.4 — CaseloadPage Filters/Stats May Not Match Flat API Shape

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | FIXED (commit `a84e674`) |
| **Root Cause** | The `CaseloadPatient` type was updated to flat shape `{id, name, lastContact, signalBand, adherenceRate}` but some filter logic still referenced `p.patient?.user?.firstName`. |
| **Impact** | Search filter may fail to match patient names. |
| **Fix** | Already fixed — filter uses `p.name ?? p.patient?.user?.firstName`. |

### A.5 — Root URL Shows 404 Before Login

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | FIXED (commit `a84e674`) |
| **Root Cause** | No route defined for `/` — visitors hit the catch-all `*` → NotFoundPage. |
| **Fix** | Already fixed — added `<Navigate to="/login" replace />` at `/`. |

### A.6 — Email Confirmation Testing Not In Place

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | TEST REQUIRED |
| **Root Cause** | There are no automated tests verifying that account creation triggers a welcome/confirmation email. The `sendEmail` function is mocked in tests but there is no registration-specific email test. |
| **Impact** | Cannot validate email delivery as part of CI/CD pipeline; email failures would go undetected. |
| **Fix** | (1) Add a unit test in `notification.test.ts` for the `welcome` template. (2) Add an integration test in `auth.test.ts` that verifies `sendEmail` is called during registration. (3) Add an E2E smoke test that verifies a registration confirmation is received (via mailbox API or SES delivery log). |

---

## Part B — Test Plan (Manual + Automated)

### B.1 — Automated Unit Tests (Vitest)

| ID | Test | File | Description |
|----|------|------|-------------|
| UT-01 | Auth store login flow | `stores.test.ts` | Verify login sets user/tokens/isAuthenticated |
| UT-02 | Auth store register flow | `stores.test.ts` | Verify register sets user for PATIENT, leaves null for CLINICIAN |
| UT-03 | Auth store MFA flow | `stores.test.ts` | Verify mfaVerify sets user/tokens after code |
| UT-04 | Auth store logout | `stores.test.ts` | Verify logout clears all state |
| UT-05 | UI store toasts | `stores.test.ts` | Verify addToast/removeToast (existing) |
| UT-06 | Password validation schema | `register-validation.test.ts` | Verify 12+ chars, complexity, confirm match |
| UT-07 | Welcome email template | `notification.test.ts` | Verify renderTemplate('welcome') produces valid HTML |
| UT-08 | Pending approval email template | `notification.test.ts` | Verify renderTemplate('pending-approval') produces valid HTML |
| UT-09 | Registration triggers welcome email | `auth-register.test.ts` | Mock sendEmail, verify called after user creation |
| UT-10 | Registration triggers pending email for clinicians | `auth-register.test.ts` | Mock sendEmail, verify called with 'pending-approval' template |
| UT-11 | Envelope unwrapping | `client.test.ts` | Verify `unwrapEnvelope` extracts nested data |
| UT-12 | CaseloadPatient type guards | `types.test.ts` | Verify flat + legacy shape both render without crash |

### B.2 — Automated E2E Tests (Playwright)

| ID | Test | Description |
|----|------|-------------|
| E2E-01 | Site loads → login page | Existing: confirms redirect from `/` to `/login` |
| E2E-02 | Demo credentials visible | Existing: confirms demo emails/password shown |
| E2E-03 | Patient login → home | Existing: confirms patient can login and reach `/patient` |
| E2E-04 | Patient core navigation | Existing: navigates checkin, history, journal, chat, resources, settings |
| E2E-05 | Clinician login → caseload | Existing: confirms clinician login reaches `/clinician` |
| E2E-06 | Clinician core navigation | Existing: navigates triage, analytics, settings |
| E2E-07 | Registration page loads | Existing: confirms Create Account heading |
| E2E-08 | Registration success flow | **NEW**: Register test patient → see success page → continue to welcome |
| E2E-09 | Registration sends confirmation email | **NEW**: Register → verify email delivery (check API logs or SES delivery) |
| E2E-10 | Clinician registration pending approval | **NEW**: Register as clinician → see pending approval message |
| E2E-11 | Password validation real-time | **NEW**: Type weak password → verify strength indicator shows red |
| E2E-12 | Duplicate registration error | **NEW**: Try registering existing email → see "already exists" error |
| E2E-13 | 404 handling | Existing: unknown route shows 404 or redirects |
| E2E-14 | No console errors on any page | **NEW**: Listen for `console.error` events across all routes |
| E2E-15 | Clinician caseload renders patient cards | **NEW**: Login as clinician → caseload shows patient names |
| E2E-16 | Logout clears session | **NEW**: Login → logout → confirm redirect to login page |

### B.3 — Manual Test Scripts

| ID | Scenario | Steps | Expected | Priority |
|----|----------|-------|----------|----------|
| MT-01 | Patient registration | 1. Visit /register 2. Select Patient role 3. Fill form with valid data 4. Submit | Success page shown, email received, redirect to welcome | HIGH |
| MT-02 | Clinician registration | 1. Visit /register 2. Select Clinician role 3. Fill form 4. Submit | Pending approval message shown, email sent to user + supervisor | HIGH |
| MT-03 | Patient login | 1. Visit /login 2. Enter demo patient credentials 3. Submit | Redirect to /patient, dashboard renders | HIGH |
| MT-04 | Clinician login | 1. Visit /login 2. Enter demo clinician credentials 3. Submit | Redirect to /clinician, caseload renders with patient cards | HIGH |
| MT-05 | Check-in flow | 1. Login as patient 2. Go to /patient/checkin 3. Adjust sliders 4. Submit | Submission success page with AI reflection | HIGH |
| MT-06 | Journal submission | 1. Login as patient 2. Go to /patient/journal 3. Write entry 4. Submit | Entry appears in journal list | MEDIUM |
| MT-07 | Clinician triage | 1. Login as clinician 2. Go to /clinician/triage 3. View items (may be empty) | Page renders without errors | MEDIUM |
| MT-08 | Analytics dashboard | 1. Login as clinician 2. Go to /clinician/analytics | Charts render (may show empty/default data) | MEDIUM |
| MT-09 | Patient settings | 1. Login as patient 2. Go to /patient/settings 3. Verify profile renders | Settings page shows user info | LOW |
| MT-10 | Clinician settings | 1. Login as clinician 2. Go to /clinician/settings 3. Verify renders | Settings page shows clinician info | LOW |
| MT-11 | Password reset flow | 1. Go to /login 2. Click "Forgot password?" 3. Enter email 4. Submit | Confirmation message shown | MEDIUM |
| MT-12 | Session timeout | 1. Login 2. Wait for token expiry 3. Make API call | Auto-refresh or redirect to login | LOW |
| MT-13 | Mobile responsiveness | 1. Open site on mobile browser 2. Navigate key pages | Layout adapts, no horizontal scroll | MEDIUM |
| MT-14 | Email confirmation received | 1. Register new patient account 2. Check email inbox | Welcome email received with user name and next steps | HIGH |
| MT-15 | Clinician pending approval email | 1. Register as clinician 2. Check email inbox | "Account pending approval" email received | HIGH |

---

## Part C — Organization / Practice Model

### C.1 — Business Logic

Clinicians create an **Organization** (practice). Each organization has a unique invite code or link. Patients can only join by:
1. Clinician sends invite email with unique invite token
2. Patient registers using the invite link (pre-fills tenant and links to clinician)
3. Admin manually adds patients via dashboard

Self-registration without invitation is disallowed for patients in production (the current open registration is acceptable for pilot/demo only).

### C.2 — Data Model (Prisma Schema Extension)

```prisma
model Organization {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  slug        String   @unique
  npi         String?  @unique   // Practice NPI
  address     String?
  phone       String?
  createdBy   String              // userId of the founding clinician
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  memberships OrgMembership[]
  invitations OrgInvitation[]

  @@map("organizations")
}

model OrgMembership {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  role           OrgRole
  joinedAt       DateTime @default(now())
  active         Boolean  @default(true)

  organization Organization @relation(fields: [organizationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
  @@map("org_memberships")
}

model OrgInvitation {
  id             String            @id @default(uuid())
  organizationId String
  email          String
  role           OrgRole
  token          String            @unique @default(uuid())
  status         InvitationStatus  @default(PENDING)
  invitedBy      String            // userId of inviter
  expiresAt      DateTime
  createdAt      DateTime          @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  inviter      User         @relation(fields: [invitedBy], references: [id])

  @@index([token])
  @@index([email])
  @@map("org_invitations")
}

enum OrgRole {
  OWNER       // founding clinician
  CLINICIAN   // additional clinicians
  ADMIN       // practice admin (non-clinical)
  PATIENT     // patient joined via invite
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

### C.3 — API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/organizations` | Create a new practice/org | CLINICIAN+ |
| GET | `/organizations/:id` | Get org details | ORG_MEMBER |
| PATCH | `/organizations/:id` | Update org details | OWNER/ADMIN |
| POST | `/organizations/:id/invite` | Send invitation email | CLINICIAN/ADMIN |
| GET | `/organizations/:id/members` | List org members | ORG_MEMBER |
| DELETE | `/organizations/:id/members/:userId` | Remove member | OWNER/ADMIN |
| GET | `/invitations/:token` | Validate invite token (public) | NONE |
| POST | `/invitations/:token/accept` | Accept invite + register | NONE |
| DELETE | `/organizations/:id/invitations/:inviteId` | Revoke invite | CLINICIAN/ADMIN |

### C.4 — Invitation Flow

```
  Clinician                           Backend                           Patient
  ─────────                           ───────                           ───────
  POST /organizations/:id/invite ──→ Create OrgInvitation row
                                      Generate unique token
                                      Send email via SES:
                                        "You've been invited to join
                                         [Practice Name] on Peacefull.ai"
                                        Link: /register?invite=<token>  ──→ Opens invite link

                                                                          GET /invitations/<token>
                                                                        ←── Returns org name, clinician,
                                                                            pre-filled email

                                                                          POST /invitations/<token>/accept
                                                                            { password, firstName, lastName }
                                      Create User (PATIENT, ACTIVE)
                                      Create Patient record
                                      Create OrgMembership (PATIENT)
                                      Create CareTeamAssignment
                                      Send welcome email              ──→ Welcome email received
                                      Return tokens
                                                                        ←── Auto-login → /patient/welcome
```

### C.5 — Frontend Changes Required

| Component | Change |
|-----------|--------|
| `RegisterPage` | Detect `?invite=<token>` query param; fetch invite details; pre-fill email; hide role selector; show org name |
| `ClinicianSettingsPage` | Add "My Practice" section with org management |
| New: `OrgManagementPage` | Invite patients, view members, manage org settings |
| New: `InviteAcceptPage` | Landing page for invite links — shows org info, registration form |
| `AppShell` sidebar | Add "Practice" menu item for clinicians |

---

## Part D — V2 Feature Roadmap

> *(Deferred to next session — see separate V2 planning document)*

### Summary of V2 Themes (for reference)

1. **Organization & Practice Management** — Implement Part C above
2. **AI Communication Review** — Clinician reviews AI-generated patient communications before delivery
3. **Enterprise Governance** — SSO/SCIM, audit log viewer, compliance dashboard
4. **Decision Room** — Multi-model AI consensus panel for complex cases
5. **Advanced Analytics** — Population health, outcome prediction, benchmark comparisons
6. **Mobile App** — React Native companion app (iOS + Android)
7. **Interoperability** — FHIR R4, HL7v2, CDA export for EHR integration

---

## Part E — V1 Remaining Fixes & Sign-Off Checklist

### E.1 — Fixes to Execute

| ID | Fix | Priority | Status |
|----|-----|----------|--------|
| E-01 | **Registration Success Page** — Create `/register/success` route with checkmark, user name, "Continue" CTA | HIGH | TODO |
| E-02 | **Welcome Email on Registration** — Add `welcome` and `pending-approval` email templates; call `sendEmail()` in register handler | HIGH | TODO |
| E-03 | **Email Confirmation Tests** — Add unit test for welcome template + integration test for sendEmail call during registration | HIGH | TODO |
| E-04 | **Clinician Page Null Guard Audit** — Re-verify all 16 clinician pages handle null nested fields | MEDIUM | TODO |
| E-05 | **LoginPage "Forgot password?" link** — Verify it exists and navigates to `/forgot-password` | LOW | VERIFY ONLY (already done in Phase 1A) |
| E-06 | **ConsentPage error handling** — Verify no redirect loop when consent API fails | MEDIUM | TODO |
| E-07 | **Session storage security** — Verify auth tokens use sessionStorage not localStorage | LOW | VERIFY ONLY |
| E-08 | **Build validation** — Run `vite build` and verify 0 errors, 0 warnings | HIGH | TODO |

### E.2 — Sign-Off Checklist

| ID | Criterion | Verified |
|----|-----------|----------|
| SO-01 | Root URL `/` redirects to `/login` | ✅ |
| SO-02 | Patient registration → success page → welcome → consent → home | ⬜ |
| SO-03 | Clinician registration → pending approval message | ✅ |
| SO-04 | Patient login → `/patient` dashboard | ✅ |
| SO-05 | Clinician login → `/clinician` caseload renders flat API data | ✅ |
| SO-06 | Registration sends welcome confirmation email | ⬜ |
| SO-07 | No TypeError crashes on any clinician page | ⬜ |
| SO-08 | All automated tests pass (unit + E2E) | ⬜ |
| SO-09 | `vite build` passes with 0 errors | ⬜ |
| SO-10 | Security headers present (CSP, HSTS, X-Frame-Options) | ✅ |
| SO-11 | CORS configured for Netlify origin | ✅ |
| SO-12 | 401 responses trigger token refresh or redirect to login | ✅ |
| SO-13 | Forgot password link visible on login page | ✅ |
| SO-14 | Password validation aligned frontend ↔ backend (min 12) | ✅ |
| SO-15 | No MSW mocks in production build | ✅ |

---

*End of PRD*
