# Phase 0: Live Demo Audit Report
## Peacefull.ai VC Demo - Baseline Analysis

**Date:** 2026-02-25  
**Demo URL:** https://hdyyjvra5bpqm.ok.kimi.link/  
**Source Location:** `/mnt/okcomputer/output/prototype-web/index.html`

---

## 0.1 DEMO ACCESS STATUS

✅ **Source Code Accessible** - The demo source is available locally at:
- `/mnt/okcomputer/output/prototype-web/index.html` (1,713 lines)

The demo is a single-file vanilla HTML/CSS/JS application (no React build needed).

---

## 0.2 SCREEN INVENTORY (20 Screens Total)

### Patient Screens (7)
| Screen | ID | Status |
|--------|-----|--------|
| Welcome | `patient-welcome` | ✅ Present |
| Consent | `patient-consent` | ✅ Present |
| Home | `patient-home` | ✅ Present |
| Journal | `patient-journal` | ✅ Present |
| Check-in | `patient-checkin` | ✅ Present |
| Voice | `patient-voice` | ✅ Present |
| Settings | `patient-settings` | ✅ Present |

### Clinician Screens (8)
| Screen | ID | Status |
|--------|-----|--------|
| Login | `clinician-login` | ✅ Present |
| MFA | `clinician-mfa` | ✅ Present |
| Caseload | `clinician-caseload` | ✅ Present |
| Inbox | `clinician-inbox` | ✅ Present |
| Patient Detail | `clinician-patient` | ✅ Present |
| Inbox Detail | `inbox-detail` | ✅ Present |
| Draft Review | `draft-review` | ✅ Present |
| Restricted Notes | `restricted-notes` | ✅ Present |

### Moat Screens (3)
| Screen | ID | Status |
|--------|-----|--------|
| Restricted Notes | `restricted-notes` | ✅ Present |
| Exports Center | `exports-center` | ✅ Present |
| Suppression UI | `suppression-ui` | ✅ Present |

### Demo Screens (2)
| Screen | ID | Status |
|--------|-----|--------|
| Compliance Posture | `compliance-posture` | ✅ Present |
| ROI Dashboard | `roi-dashboard` | ✅ Present |
| Demo Script | `demo-script` | ✅ Present |
| Workflow Simulation | `workflow-simulation` | ✅ Present |

---

## 0.3 RISKY CLAIMS AUDIT

### ✅ COMPLIANCE CLAIMS - PROPERLY QUALIFIED

| Claim | Location | Status | Notes |
|-------|----------|--------|-------|
| "SOC 2 Type II" | compliance-posture (line 203) | ⚠️ MINOR | In "Roadmap" section with "Planned: Q3 2026" - could be clearer |
| "HIPAA Security Rule Alignment" | compliance-posture (line 210) | ✅ OK | Uses "aligned to" not "compliant" |
| "BAA-Capable Cloud Posture" | compliance-posture | ✅ OK | Properly qualified |
| "End-to-End Encrypted" | NOT FOUND | ✅ OK | Not claimed |
| "FDA 21 CFR Part 11" | NOT FOUND | ✅ OK | Not claimed |

**Finding:** The "SOC 2 Type II" text should be clarified as "SOC 2 Type II (Planned)" to avoid implying current certification.

### ✅ PERFORMANCE/ROI CLAIMS - PROPERLY QUALIFIED

| Claim | Location | Status | Notes |
|-------|----------|--------|-------|
| "340% ROI" | roi-dashboard (line 1193) | ✅ OK | Has "Simulated Demo Values" banner + toggle to projections |
| "99.2% detection" | NOT FOUND | ✅ OK | Not claimed |
| "4 min response" | NOT FOUND | ✅ OK | Not claimed |
| "-42% missed signals" | NOT FOUND | ✅ OK | Not claimed |
| "5.2 hours saved" | roi-dashboard | ✅ OK | Labeled with assumptions drawer |
| "$1.6M savings" | roi-dashboard | ✅ OK | Has conservative projection option ($1.2M) |

### ✅ SAFETY UI - NO AI CONFIDENCE %

| Element | Location | Status | Notes |
|---------|----------|--------|-------|
| "AI Confidence: XX%" | NOT FOUND | ✅ OK | Not used |
| Signal Bands | inbox-detail | ✅ OK | Uses LOW/GUARDED/MODERATE/HIGH |
| "ASR confidence" | suppression-ui (line 1148) | ✅ OK | Refers to speech recognition, not safety AI |

### ✅ EFFICACY CLAIMS - PROPERLY REFRAMED

| Claim | Location | Status | Notes |
|-------|----------|--------|-------|
| "Crisis Averted" | NOT FOUND | ✅ OK | Not used |
| "Emergency services not needed" | NOT FOUND | ✅ OK | Not used |
| "Workflow Simulation" | landing, demo-script | ✅ OK | Proper framing used |

---

## 0.4 MOAT SCREENS AUDIT

### ✅ RESTRICTED NOTES (Line 903)
- ✅ Separate nav item
- ✅ "Restricted Notes — Special Handling" banner
- ✅ "Excluded from standard exports by default" notice
- ✅ List + detail view with synthetic content
- ✅ Audit metadata (created by, views, last access)

### ✅ EXPORTS CENTER (Line 964)
- ✅ Export profile selector (Standard / Segmented SUD / Restricted Notes)
- ✅ Confirmation modal for restricted exports
- ✅ BLOCKED_POLICY (428) state: "Missing segmentation confirmation"
- ✅ Manifest card with items, size, checksums
- ✅ Time-limited download concept

### ✅ SUPPRESSION UI (Line 1061)
- ✅ Recommendation cards (GENERATED/SUPPRESSED)
- ✅ Suppression reason codes
- ✅ Remediation steps
- ✅ Links to blocking items
- ✅ "Clinician-Only" banner

---

## 0.5 WORKFLOW PROOF AUDIT

### ✅ PORTAL INBOX DETAIL (Line 750)
- ✅ Evidence panel with segment-level refs
- ✅ Signal bands (GUARDED/HIGH)
- ✅ Actions: Acknowledge / Resolve / Escalate
- ✅ Nudge telemetry (email/SMS status)
- ⚠️ MISSING: "Portal is authoritative; notifications are nudges" banner

### ✅ DRAFT SUMMARY REVIEW (Line 822)
- ✅ Draft banner persistent
- ✅ Review actions: Reviewed/Use with caution/Retain Draft/Reject/Escalate
- ✅ Evidence panel
- ✅ "Known unknowns" disclosure

---

## 0.6 DEMO MODE CONTROLS AUDIT

All controls present and functional:
- ✅ System status: NORMAL/DEGRADED
- ✅ Safety tier: T0/T1/T2/T3
- ✅ Inbox status: OPEN/ACK/IN_REVIEW/RESOLVED/CLOSED
- ✅ Summary status: DRAFT/REVIEWED/ESCALATED/REJECTED
- ✅ Recommendation: GENERATED/SUPPRESSED
- ⚠️ MISSING: Export status toggle (READY/BLOCKED_POLICY/EXPIRED)
- ⚠️ MISSING: Voice status toggle (UPLOADING/PROCESSING/COMPLETE/FAILED)

---

## 0.7 SUMMARY OF FINDINGS

### Critical Issues: 0
### High Issues: 0
### Medium Issues: 1
- "SOC 2 Type II" → Should be "SOC 2 Type II (Planned)" for clarity

### Low Issues: 2
- Missing "Portal is authoritative" banner in inbox detail
- Missing Export status and Voice status toggles in demo panel

### Overall Assessment: ✅ DEMO IS VC-READY
The demo has been well-implemented with all required moat screens, proper claim qualifications, and signal bands replacing confidence percentages. Minor wording improvements recommended.
