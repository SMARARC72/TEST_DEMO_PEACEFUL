# Red Team Hardening Report
## Peacefull.ai VC Demo v2.1

**Date:** 2026-02-25  
**Demo Version:** 2.1 (Post-Hardening)  
**Tester:** Automated Red Team Analysis

---

## EXECUTIVE SUMMARY

This report documents the red team hardening pass performed on the Peacefull.ai VC Demo. The analysis verified compliance with CSP-001..CSP-005 invariants and identified minimal residual risks.

**Overall Risk Rating:** LOW ✅

---

## 1. ROLE SEPARATION TESTS

### 1.1 Patient UI Access to Clinician-Only Data
**Test:** Attempted to access clinician-only screens from patient context

| Screen | Patient Accessible? | Result |
|--------|---------------------|--------|
| Suppression UI | No | ✅ PASS |
| Restricted Notes | No | ✅ PASS |
| Exports Center | No | ✅ PASS |
| Inbox Detail | No | ✅ PASS |
| Draft Review | No | ✅ PASS |
| Clinician Caseload | No | ✅ PASS |

**Finding:** All clinician-only screens require navigation from clinician portal. No direct access possible.

### 1.2 Patient UI Data Exposure
**Test:** Verified patient UI never shows clinician-only artifacts

| Artifact | Patient UI | Result |
|----------|------------|--------|
| Suppression reason codes | Not shown | ✅ PASS |
| Recommendation rationale | Not shown | ✅ PASS |
| Restricted notes | Not shown | ✅ PASS |
| Signal bands | Not shown | ✅ PASS |
| Internal confidence metrics | Not shown | ✅ PASS |

**Finding:** Patient UI only shows: journal entry confirmation, mood/stress check-ins, and draft banner ("Your clinician will review").

---

## 2. PROHIBITED CLAIMS SCAN

### 2.1 Compliance Claims
| Claim | Found? | Location | Status |
|-------|--------|----------|--------|
| "HIPAA Compliant" | No | N/A | ✅ PASS |
| "SOC 2 Type II Certified" | No | N/A | ✅ PASS |
| "SOC 2 Type II (Planned)" | Yes | compliance-posture | ✅ OK - Properly qualified |
| "FDA 21 CFR Part 11" | No | N/A | ✅ PASS |
| "End-to-End Encrypted" | No | N/A | ✅ PASS |

### 2.2 Performance Claims
| Claim | Found? | Location | Status |
|-------|--------|----------|--------|
| "99.2% detection" | No | N/A | ✅ PASS |
| "340% ROI" (unqualified) | No | N/A | ✅ PASS |
| "340%" with assumptions | Yes | roi-dashboard | ✅ OK - Properly qualified |
| "4 min response time" | No | N/A | ✅ PASS |
| "-42% missed signals" | No | N/A | ✅ PASS |

### 2.3 Efficacy Claims
| Claim | Found? | Location | Status |
|-------|--------|----------|--------|
| "Crisis averted" | No | N/A | ✅ PASS |
| "Emergency services not needed" | No | N/A | ✅ PASS |
| "Prevents suicide" | No | N/A | ✅ PASS |
| "Workflow Simulation" | Yes | landing, demo-script | ✅ OK - Proper framing |

### 2.4 AI Confidence
| Element | Found? | Location | Status |
|---------|--------|----------|--------|
| "AI Confidence: XX%" | No | N/A | ✅ PASS |
| "Confidence: 87%" | No | N/A | ✅ PASS |
| Signal bands (LOW/GUARDED/etc) | Yes | inbox-detail | ✅ OK - Conservative alternative |
| "ASR confidence" | Yes | suppression-ui | ✅ OK - Speech recognition context |

---

## 3. AUTOMATION BIAS TESTS

### 3.1 Directive Language
| Test | Finding | Status |
|------|---------|--------|
| "Recommended action" without clinician framing | Not found | ✅ PASS |
| "You should" directives | Not found | ✅ PASS |
| "Clinician-supervised" language | Present throughout | ✅ OK |
| "Draft" labels on AI outputs | Present on all summaries | ✅ OK |

### 3.2 Override Capability
| Feature | Implementation | Status |
|---------|----------------|--------|
| Review actions on drafts | Reviewed/Use with caution/Retain Draft/Reject/Escalate | ✅ OK |
| Acknowledge/Resolve/Escalate on alerts | All options available | ✅ OK |
| Override suppression | Via remediation steps | ✅ OK |

---

## 4. PATCHES APPLIED

### Patch 1: SOC 2 Wording Clarification
**Issue:** "SOC 2 Type II" could imply current certification
**Fix:** Changed to "SOC 2 Type II (Planned)" with "Target: Q3 2026"
**Location:** compliance-posture screen

### Patch 2: Portal Authority Banner
**Issue:** Missing "Portal is authoritative" clarification in inbox detail
**Fix:** Added amber banner: "Portal is authoritative. Email/SMS are nudges only."
**Location:** inbox-detail screen

### Patch 3: Demo Control Completeness
**Issue:** Missing Export status and Voice status toggles
**Fix:** Added both toggles with all state options
**Location:** Demo Controls panel

---

## 5. RESIDUAL RISKS

| Risk ID | Description | Severity | Mitigation |
|---------|-------------|----------|------------|
| RES-001 | Demo uses synthetic data but could be confused with real | Low | Multiple "Synthetic Data Only" disclaimers |
| RES-002 | Workflow simulation implies clinical efficacy | Low | Explicit "Workflow Simulation" label + disclaimers |
| RES-003 | Signal bands could be misinterpreted | Low | Contextual labels + "Signal" vs "Risk" terminology |

**All residual risks are ACCEPTABLE for VC presentation.**

---

## 6. VERIFICATION CHECKLIST

- [x] No "HIPAA Compliant" / "SOC 2 Type II Certified" hard claims
- [x] No "99.2%" / "340% ROI" without "Pilot target" label
- [x] No AI confidence % in safety contexts
- [x] No clinician-only data in patient screens
- [x] No "crisis averted" efficacy claims
- [x] All suppression reasons show remediation steps
- [x] All exports show confirmation requirements
- [x] Draft banner visible on all draft summaries
- [x] Signal bands used instead of confidence %
- [x] "Clinician-supervised" language prominent
- [x] "Not emergency care" disclaimer present
- [x] "Portal is authoritative" clarification present
- [x] All CSP invariants (001-005) implemented
- [x] All moat screens (Restricted Notes, Exports, Suppression) present
- [x] Demo mode controls functional
- [x] Investor demo script complete

---

## 7. CONCLUSION

**RECOMMENDATION: APPROVED FOR VC PRESENTATION**

All HIGH and CRITICAL severity risks have been addressed. The demo:
- ✅ Presents claims with appropriate qualifiers
- ✅ Maintains clear patient/clinician boundaries
- ✅ Includes all required moat screens
- ✅ Complies with CSP-001..CSP-005 invariants
- ✅ Uses conservative signal bands instead of confidence percentages
- ✅ Frames outcomes as "workflow simulation" not clinical efficacy

The demo is ready for investor presentations with continued monitoring for any emergent risks during live demos.
