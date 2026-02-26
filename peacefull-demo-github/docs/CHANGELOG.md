# Change Log v2.1
## Peacefull.ai VC Demo

**Version:** 2.1  
**Date:** 2026-02-25  
**Previous Version:** 2.0

---

## v2.2 — Live AI Chat Integration (NEW)

### Added Demo Surface
- **Screen:** `ai-live-chat-demo`
- **Purpose:** Show two patient types in a simulated live-chat context while preserving clinician-supervised safety model.

### Scenario Coverage
- **Type A (T1 / Guarded):** stress and anxiety language with patient-safe coaching response.
- **Type B (T2 / Elevated):** hopelessness language with deterministic escalation and portal-authoritative workflow handoff.

### Guardrails Displayed In-Screen
- Privacy/training boundary statements
- Tenant-scoped and role-constrained retrieval (RAG posture)
- Red-team hardening gates
- Quality check gates

### Tie-In Updates
- Landing quick link to Live AI Chat
- Demo Script step `2A` for live-chat walkthrough
- Workflow Simulation CTA to open live-chat path
- ROI trust signal card linked to live-chat scenarios

### Quick Reviewer Jump Path
- Landing → `Live AI Chat`
- Demo Script → `Live AI Chat (2A)`
- Workflow Simulation → `Open Live Chat Example Path`

---

## CLAIMS & TRUST FIXES

### A1: Compliance Posture Panel
- **Status:** ✅ Already implemented
- **Changes:** Minor wording improvement
  - "SOC 2 Type II" → "SOC 2 Type II (Planned)"
  - "Planned: Q3 2026" → "Target: Q3 2026"

### A2: ROI Dashboard
- **Status:** ✅ Already implemented
- **Features:**
  - "Simulated Demo Values" banner
  - Toggle: Pilot Targets vs Projections
  - Assumptions drawer with formula transparency
  - Conservative projection values

---

## SAFETY UI FIXES

### B1: Signal Strength Bands
- **Status:** ✅ Already implemented
- **Bands:** LOW / GUARDED / MODERATE / HIGH
- **Usage:** Evidence panel in inbox detail
- **Patient UI:** Never shows confidence metrics

### B2: Workflow Simulation
- **Status:** ✅ Already implemented
- **Framing:** "Workflow Simulation Demo • Synthetic Data Only"
- **No efficacy claims:** No "crisis averted" language

---

## MOAT SCREENS (ALL IMPLEMENTED)

### C1: Restricted Notes Surface ✅
- Separate nav item
- "Special Handling" banner
- "Excluded from standard exports"
- Audit metadata display

### C2: Exports Center ✅
- Profile selector (Standard/Segmented SUD/Restricted Notes)
- Confirmation modal for sensitive exports
- BLOCKED_POLICY (428) state
- Manifest card with checksums

### C3: Suppression Transparency UI ✅
- GENERATED/SUPPRESSED status cards
- Reason codes with explanations
- Remediation steps
- Links to blocking items
- "Clinician-Only" banner

---

## WORKFLOW PROOF SCREENS

### D1: Portal Inbox Detail ✅
- **NEW:** "Portal is authoritative" banner added
- Evidence panel with segment refs
- Signal bands (GUARDED/HIGH)
- Actions: Acknowledge/Resolve/Escalate
- Nudge telemetry

### D2: Draft Summary Review ✅
- Persistent draft banner
- Review action bar (5 options)
- Evidence panel
- "Known unknowns" disclosure

---

## DEMO MODE CONTROLS

### E1: Enhanced Control Panel
**Previously implemented:**
- System status: NORMAL/DEGRADED
- Safety tier: T0/T1/T2/T3
- Inbox status: OPEN/ACK/IN_REVIEW/RESOLVED/CLOSED
- Summary status: DRAFT/REVIEWED/ESCALATED/REJECTED
- Recommendation: GENERATED/SUPPRESSED

**NEW additions:**
- Export status: READY/BLOCKED_POLICY/EXPIRED/FAILED
- Voice status: UPLOADING/PROCESSING/COMPLETE/FAILED

---

## INVESTOR DEMO SCRIPT

### F1: Demo Script Panel ✅
- 8-10 minute guided flow
- 7 steps with navigation
- "Workflow simulation" language
- Quick access buttons

---

## PATCHES APPLIED (v2.1)

| Patch | Issue | Fix | Location |
|-------|-------|-----|----------|
| 1 | SOC 2 wording unclear | Added "(Planned)" label | compliance-posture |
| 2 | Missing portal authority banner | Added amber banner | inbox-detail |
| 3 | Incomplete demo controls | Added Export/Voice toggles | Demo Controls panel |

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `index.html` | 3 minor edits (lines ~203, ~761, ~91-101) |

---

## SCREEN INVENTORY (20 Screens)

**Patient (7):** welcome, consent, home, journal, checkin, voice, settings  
**Clinician (8):** login, mfa, caseload, inbox, patient-detail, inbox-detail, draft-review, restricted-notes  
**Moat (3):** restricted-notes, exports-center, suppression-ui  
**Demo (2):** compliance-posture, roi-dashboard, demo-script, workflow-simulation

---

## CSP INVARIANTS STATUS

| CSP | Status | Notes |
|-----|--------|-------|
| CSP-001 Human-in-the-Loop | ✅ | Draft banners, review actions |
| CSP-002 Draft Summaries | ✅ | Persistent banners, evidence refs |
| CSP-003 Safety Tiering | ✅ | Signal bands, no confidence % |
| CSP-004 Portal Inbox | ✅ | Authority banner, nudge telemetry |
| CSP-005 Data Governance | ✅ | Restricted notes, export segmentation |

---

## VERIFICATION

- [x] All moat screens present and functional
- [x] All CSP invariants implemented
- [x] No prohibited claims
- [x] Proper claim qualifications
- [x] Patient/clinician boundaries enforced
- [x] Demo controls complete
- [x] Red team hardening passed
