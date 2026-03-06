# Red-Team Hardening PRD v1

**Status:** In execution  
**Baseline:** `3.4.26PT1.md`  
**Scope:** Production auth, onboarding, data contract integrity, clinician visibility, tenant safety, and launch blockers  
**Last Updated:** 2026-03-06

---

## 1. Objective

This document turns the live-site audit into an execution plan for a production-safe MVP. The focus is not feature breadth. The focus is eliminating the failure modes that can make the live product appear healthy while the real user flow still breaks.

Primary goals:

1. Eliminate auth and onboarding false-success states.
2. Enforce account-state and tenant-safety rules at the API boundary.
3. Restore clinician visibility into patient activity and AI interactions.
4. Remove stubs and mismatched contracts that hide live failures.
5. Ship only against the real production API and real data paths.

---

## 2. Launch-Critical Findings

### P0: Live Flow Integrity

1. Patient consent acceptance could succeed visually while route gating still failed because frontend and backend used different consent field names.
2. Consent policy definitions were duplicated across the route guard and consent page, creating drift risk.
3. Suspended clinician accounts could still receive tokens through local auth flows.
4. Patient self-registration remained possible outside the invite path, creating orphaned users with no clinician ownership.

### P0: Clinical Visibility

1. Clinicians do not have first-class transcript review and summary workflows for AI chat sessions.
2. Patient profile and analytics responses are still at risk of frontend-backend shape drift in high-value views.
3. Real-time infrastructure exists, but meaningful server-side event broadcasting is still minimal.

### P0: Security and Compliance

1. Auth0 JIT sync can create patient-shaped accounts too permissively if tenant and invite constraints are not enforced.
2. CSP still requires review to ensure no unsafe production settings remain in the active deploy path.
3. Patient-facing write flows need consistent user-based rate limiting, not only coarse perimeter controls.

---

## 3. Batch 1 Completed

### Implemented

1. Added a canonical frontend consent normalization layer in `prototype-web/src/lib/consent.ts`.
2. Updated frontend patient consent API reads and writes to normalize both canonical and legacy consent payloads.
3. Switched the patient route guard to shared consent policy evaluation instead of duplicated inline logic.
4. Updated API consent serializers to emit canonical `consentType` and `accepted` fields while preserving legacy aliases for compatibility.
5. Blocked token issuance for non-active users during login, MFA verify, and refresh, with an explicit suspended-clinician denial path.
6. Added frontend and backend regression coverage for the consent contract and suspended clinician login behavior.

### Validation

1. Frontend consent contract tests: pass.
2. API route regression suite: pass.
3. Frontend TypeScript check: required.
4. API TypeScript check: required.

### Batch 2 Completed

1. Exposed the existing supervisor approval and rejection endpoints through the frontend organization API client.
2. Added permission helpers so approval actions only appear for platform supervisors/admins who also hold organization owner/admin access.
3. Added pending clinician approval and rejection controls to `OrgManagementPage`, including member status visibility.
4. Added targeted frontend regression coverage for the approval visibility helper.

### Batch 3 Completed

1. Upgraded the clinician analytics route to return the nested dashboard payload already expected by `AnalyticsDashboard`.
2. Replaced the prior flat KPI-only response with overview metrics, signal distribution, engagement trend, outcomes trend, adherence categories, and top-metric cards.
3. Added a clinician analytics route regression that asserts the dashboard-ready contract shape.
4. Extended the shared API Prisma test mock to include `chatSessionSummary`, which is required by both analytics and chat-summary route coverage.

### Batch 4 Completed

1. Wired the existing clinician chat-session and chat-summary endpoints into the frontend clinician workflow.
2. Added typed frontend API methods for transcript retrieval, summary generation, summary listing, and clinician review actions.
3. Added a dedicated clinician chat review page and linked it from the patient profile so transcripts and summaries are reachable in the live product.
4. Added targeted frontend regression coverage for transcript loading and summary approval.

---

## 4. Remaining Execution Phases

### Phase 2: Invite-Only Registration Integrity

Deliverables:

1. Block patient self-registration at the API level.
2. Require invite-backed patient creation with organization and care-team linkage.
3. Create clinician profile and approval-state handling as part of clinician onboarding.
4. Align all password policies across registration, invite acceptance, and password reset.

Definition of done:

1. No patient account can be created without an invite.
2. Every new patient resolves to a clinician-accessible caseload entry.
3. Suspended clinicians receive a deterministic UI and API state, never tokens.

### Phase 3: Clinician Visibility and Data Parity

Deliverables:

1. Enrich patient profile responses with the sections already expected by the clinician UI.
2. Add clinician transcript access for patient AI chat sessions.
3. Add draft-only clinical AI chat summaries with explicit review status.
4. Align analytics response shapes to the existing dashboard contract or narrow the frontend contract to the real API.

Definition of done:

1. Clinician patient detail pages render from live API data with no empty contract gaps.
2. AI chat activity is reviewable without direct database access.
3. Summary artifacts remain clinician-only and review-gated.

### Phase 4: Real-Time and Operational Readiness

Deliverables:

1. Implement server-side event broadcasting for relevant patient, triage, and escalation events.
2. Ensure websocket reconnect and token-expiry handling are deterministic.
3. Remove or clearly gate any patient-visible offline/demo fallbacks that can mask production outages.

Definition of done:

1. Clinician-side operational pages receive live updates for supported events.
2. Production outages are surfaced as errors, not masked by canned content.

### Phase 5: Security Closure

Deliverables:

1. Tighten Auth0 JIT sync so only allowed roles and tenants can be created.
2. Re-verify tenant isolation checks across AI, patient, clinician, and organization flows.
3. Finalize CSP and production header posture.
4. Extend user-based write throttles for patient submission endpoints.

Definition of done:

1. Cross-tenant or uninvited patient creation is rejected at the API boundary.
2. AI and transcript access require explicit tenant and care-team checks.
3. Security headers are validated in the production deploy path.

---

## 5. Test Gates

### Gate A: Contract Integrity

1. `prototype-web` TypeScript passes.
2. `packages/api` TypeScript passes.
3. Frontend consent/auth regression tests pass.
4. API auth/patient regression tests pass.

### Gate B: Live Flow Verification

1. Patient invite acceptance completes.
2. Patient login reaches consent flow and then patient home after required acceptance.
3. Suspended clinician login is denied cleanly.
4. Approved clinician login reaches caseload.

### Gate C: Security Verification

1. Uninvited patient registration fails.
2. Cross-tenant resource access fails.
3. Auth refresh respects account state.
4. Protected AI and transcript routes fail closed.

---

## 6. Risks

1. Frontend normalization can hide future backend drift if serializer tests are not kept alongside it.
2. Invite-only enforcement will expose any seeded or manual accounts that were created outside the intended workflow.
3. Real-time work can create false confidence if it only connects without broadcasting clinically meaningful events.
4. Chat summary features increase compliance exposure if stored artifacts are not access-controlled and audit-logged.

---

## 7. Execution Rule

Every batch must end with:

1. Updated baseline entry in `3.4.26PT1.md`.
2. Updated or new regression tests for the bug class addressed.
3. Validation output for TypeScript and relevant test suites.
4. No demo fallback that obscures production failure.