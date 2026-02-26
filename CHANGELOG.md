# Change Log - VC Demo v2.0
## Peacefull.ai Behavioral Health AI Companion

**Version:** 2.0  
**Date:** 2026-02-25  
**Packet Reference:** Master Artifact Packet v1.5

---

## v2.4 — AI Communication Surfaces for Patient Submissions (NEW)

## v2.5 — Security Command Center & Hardening (NEW)

### Security Command Center (Demo Simulation)
- **Added:** `security-command-center` screen in `prototype-web/index.html`
- **Purpose:** Interactive demo simulation of MFA, smart contract validation, Merkle verification, and security audit timeline.
- **Features:**
  - Simulated MFA controls (SMS/TOTP/Hardware Key), backup code validation, and step-up auth trigger
  - Simulated smart contract validation with deterministic status (VALID/INVALID/REVIEW_REQUIRED)
  - Simulated Merkle path verification with explainable result
  - Synthetic security event timeline and risk posture scorecard
  - All simulation state is deterministic and reset by `resetSecurityState()` which is wired into `resetDemo()`

### Hardening & Guardrails
- **Updated:** `prototype-web/scripts/check-merge-artifacts.mjs` and `verify-demo-stability.mjs`
  - Added duplicate-label guard for `Security Command Center`
  - Ensures `resetDemo()` includes `resetSecurityState()` and checks run pre-build


### Patient Submission Success + AI Response
- **Added:** `patient-submission-success` screen in `prototype-web/index.html`
- **Purpose:** Show patient-safe, supportive AI response immediately after journal/voice submissions
- **Features:**
  - Successful submission confirmation for journal and voice memo
  - Patient-facing "What I heard" reflection summary
  - Suggested next-step prompt with non-clinical framing
  - Explicit boundary language (not diagnosis/emergency guidance)

### Clinician-Only Internal Report Comparison
- **Added:** `ai-communication-compare` screen
- **Purpose:** Demonstrate differential communication surfaces by audience (patient vs clinician)
- **Features:**
  - Side-by-side patient-safe response vs clinician internal report
  - Internal report includes signal band, evidence references, and known unknowns
  - Explicit clinician-only banner to prevent boundary confusion

### Deterministic Submission State Wiring
- **Added:** `baselineSubmissionState`, `processSubmission`, `renderSubmissionSurfaces`, `resetSubmissionState`
- **Updated:** `saveJournal()` and `uploadVoice()` route into submission success + report surfaces
- **Updated:** `resetDemo` restores submission/report baseline deterministically

---

## v2.6 — Proof-of-Safety & ROI Decision Room (CAPSTONE)

### Decision Room Integration
- **Added:** `decision-room` screen in `prototype-web/index.html`
- **Purpose:** Unified executive/clinical decision surface consolidating safety, governance, and ROI proof without altering existing workflows.
- **Features:**
  - Safety Assurance Panel summarizing risk posture, boundary checks, suppression reasons.
  - Governance Chain-of-Custody Panel with approval statuses, audit events and deterministic readiness verdict.
  - ROI + GTM Proof Panel with clinician time-saved signal, Pilot Expansion Score derived from multiple modules.
  - Procurement Export Packet action generating structured summary (simulation) using `generateProcurementPacket()`.
  - Navigation added to demo control panel and enterprise governance quick actions.
  - Deterministic state helpers (`baselineDecisionRoomState`, `computeReadinessVerdict`, `computePilotExpansionScore`, `generateProcurementPacket`, `resetDecisionRoomState`) and wiring to `resetDemo()`.

### Hardening Updates
- Added Decision Room duplicate nav check in `check-merge-artifacts.mjs` and `verify-demo-stability.mjs`.
- Reset wiring validation expanded to include `resetDecisionRoomState()`.

### Documentation
- Added `RED_TEAM_DECISION_ROOM_REVIEW.md` covering threat model, misuse scenarios, and mitigations.


## v2.3 — Enterprise Governance Differentiator (NEW)

### Enterprise Governance Hub
- **Added:** `enterprise-governance` screen in `prototype-web/index.html`
- **Purpose:** Showcase enterprise-grade procurement/governance readiness vs non-enterprise consumer tools
- **Features:**
  - Synthetic multi-tenant governance package table (SSO/SCIM, RBAC bundle, audit pipeline)
  - Deterministic review actions: `APPROVED`, `CONDITIONAL`, `REVIEW_REQUIRED`
  - Governance detail panel with evidence references and audit trail text
  - Simulated enterprise readiness metric tied to approved package count

### ROI Linkage
- **Enhanced:** `roi-dashboard`
- **Added:** "Enterprise Procurement Signal (Simulated)" card connected to governance approvals

### Deterministic Demo Controls
- **Updated:** `resetDemo`
- **Added:** enterprise governance reset wiring via `resetEnterpriseGovernance()`

---

## CLAIMS & TRUST FIXES

### Compliance Posture Panel (NEW)
- **Added:** `compliance-posture` screen
- **Purpose:** Replace hard compliance badges with transparent posture/roadmap
- **Changes:**
  - Removed: "HIPAA Compliant", "SOC 2 Type II", "End-to-End Encrypted" badges
  - Added: "BAA-capable cloud posture", "Audit logs", "MFA", "Data minimization"
  - Added: "SOC 2 planned: Q3 2026" with explicit timeline
  - Added: Synthetic data disclaimer

### ROI Dashboard (ENHANCED)
- **Modified:** `roi-dashboard` screen
- **Purpose:** Replace absolute claims with assumptions-based projections
- **Changes:**
  - Added: "Simulated Demo Values" banner
  - Added: Toggle between "Pilot Targets" and "Projections"
  - Added: Assumptions drawer with formula transparency
  - Added: Tooltips for Hours Saved, ROI, Annual Savings formulas
  - Modified: Metrics show conservative projection values when toggled

---

## SAFETY UI FIXES

### Signal Strength Bands (NEW)
- **Added:** CSS classes `.signal-band`, `.signal-low`, `.signal-guarded`, `.signal-moderate`, `.signal-high`
- **Purpose:** Replace AI confidence % with qualitative bands
- **Changes:**
  - Removed: "AI Confidence: 87% / 92%" displays
  - Added: LOW / GUARDED / MODERATE / HIGH signal bands
  - Added: "Known unknowns" disclosure in draft summaries
  - Added: Evidence refs (segment-level) in clinician view

### Workflow Simulation (REPLACED Story Mode)
- **Modified:** `workflow-simulation` screen (replaces `story-mode`)
- **Purpose:** Reframe as process demonstration vs outcome claim
- **Changes:**
  - Removed: "Crisis averted" language
  - Added: "Workflow Simulation" header with disclaimer
  - Added: 5-step process flow (Patient Input → AI Detection → Portal Inbox → Clinician Protocol → Documentation Outcome)
  - Added: Emphasis on clinician review at each step

---

## MOAT SCREENS (NEW)

### Restricted Notes Surface
- **Added:** `restricted-notes` screen
- **Packet Reference:** Artifact 5 §11, Artifact 10 §2.9
- **Features:**
  - Separate nav entry from main patient records
  - "Restricted Notes — Special Handling" banner
  - "Excluded from standard exports by default" notice
  - List + detail view with synthetic content
  - Audit metadata surface (created by, viewed X times, last access)

### Exports Center
- **Added:** `exports-center` screen
- **Packet Reference:** Artifact 5 §9, Artifact 10 §2.10
- **Features:**
  - Export profile selector (Standard / Segmented SUD / Restricted Notes)
  - Confirmation modal for segmented/restricted exports
  - BLOCKED_POLICY state (428): "Missing segmentation confirmation"
  - Manifest card: included/excluded items + checksums placeholder
  - Time-limited download flow (demo-only)

### Suppression Transparency UI
- **Added:** `suppression-ui` screen
- **Packet Reference:** Artifact 5 §9.2 Suppression Matrix
- **Features:**
  - Recommendation cards showing GENERATED vs SUPPRESSED status
  - Suppression reason codes with detailed explanations
  - Remediation steps for each suppression type
  - Links to relevant blocking items (open T2, unreviewed Draft, ASR low confidence)
  - "Clinician-Only" banner (not visible to patients)

---

## WORKFLOW PROOF SCREENS

### Portal Inbox Detail View
- **Added:** `inbox-detail` screen
- **Packet Reference:** Artifact 10 §2.3, §2.4
- **Features:**
  - Evidence panel with segment-level refs
  - Action buttons: Acknowledge / Resolve / Escalate
  - Nudge telemetry: Email sent, SMS pending, Portal item created
  - "Portal is authoritative; notifications are nudges" banner

### Draft Summary Review View
- **Added:** `draft-review` screen
- **Packet Reference:** Artifact 5 §10, Artifact 10 §2.5
- **Features:**
  - Persistent "DRAFT - Clinician Review Required" banner
  - Review action bar: Reviewed / Use with Caution / Retain Draft / Reject / Escalate
  - Evidence panel with segment refs
  - ASR quality context (Signal band + quality flags)
  - "Known unknowns" disclosure

---

## DEMO MODE CONTROLS (ENHANCED)

### Demo Control Panel
- **Modified:** Enhanced existing demo panel
- **New Controls:**
  - System status: NORMAL / DEGRADED
  - Safety tier: T0 / T1 / T2 / T3 per patient
  - Inbox status: OPEN / ACK / IN_REVIEW / RESOLVED / CLOSED
  - Summary status: DRAFT / REVIEWED / ESCALATED / REJECTED
  - Recommendation status: GENERATED / SUPPRESSED (+ reason codes)
  - Export status: READY / BLOCKED_POLICY / EXPIRED / FAILED
- **Quick Access Buttons:**
  - Compliance Posture
  - Demo Script
  - Restricted Notes
  - Exports Center
  - Suppression UI

---

## INVESTOR DEMO SCRIPT (NEW)

### Demo Script View
- **Added:** `demo-script` screen
- **Purpose:** Guide 8-10 minute investor flow
- **Steps:**
  1. Patient journaling/voice (1 min) → `patient-journal`, `patient-voice`
  2. Clinician inbox (T2) (1 min) → `clinician-inbox`
  3. Inbox detail + evidence (1 min) → `inbox-detail`
  4. Draft summary review (1 min) → `draft-review`
  5. Suppressed recommendation (1 min) → `suppression-ui`
  6. Exports + manifest (1 min) → `exports-center`
  7. ROI assumptions panel (1 min) → `roi-dashboard`

---

## BUG FIXES

### Patient Consent Flow
- **Fixed:** Consent checkboxes now properly enable Continue button
- **Added:** "This is not emergency care" as required checkbox

### Recording UI
- **Fixed:** Waveform animation now displays during recording
- **Added:** Timer display (MM:SS format)

### MFA Input
- **Fixed:** 6-digit code inputs now properly detect completion
- **Added:** Auto-enable Verify button when all digits entered

---

## FILES MODIFIED

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `/prototype-web/index.html` | Complete rewrite | ~1,713 lines |

---

## SCREEN INVENTORY

### Patient Screens (5)
1. `patient-welcome` - Welcome screen
2. `patient-consent` - Consent flow with 3 checkboxes
3. `patient-home` - Dashboard with quick actions
4. `patient-journal` - Journal entry with draft banner
5. `patient-voice` - Voice recording with waveform
6. `patient-checkin` - Mood/stress sliders
7. `patient-settings` - Notification preferences

### Clinician Screens (8)
1. `clinician-login` - Email/password login
2. `clinician-mfa` - 6-digit code entry
3. `clinician-caseload` - Patient list with alerts
4. `clinician-inbox` - Portal inbox with T1/T2 alerts
5. `clinician-patient` - Patient detail view
6. `inbox-detail` - Alert detail with evidence (NEW)
7. `draft-review` - Draft summary review (NEW)
8. `restricted-notes` - Restricted notes surface (NEW)

### Moat Screens (3)
1. `restricted-notes` - Special handling notes
2. `exports-center` - Export profiles and manifests
3. `suppression-ui` - Recommendation suppression transparency

### Demo Screens (4)
1. `landing` - Main entry point
2. `compliance-posture` - Compliance roadmap
3. `roi-dashboard` - ROI with assumptions
4. `workflow-simulation` - Process demonstration
5. `demo-script` - Investor demo guide (NEW)

**Total Screens:** 20
