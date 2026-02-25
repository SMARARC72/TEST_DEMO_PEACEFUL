# VC Demo Enhancement - Implementation Plan
## Behavioral Health AI Companion - Peacefull.ai

**Date:** 2026-02-25  
**Packet Version:** Master Artifact Packet v1.5  
**Traceability:** CSP-001..CSP-005, Artifact 18-20

---

## 1. EXECUTIVE SUMMARY

This implementation plan outlines the required enhancements to make the existing interactive demo VC-ready by addressing claims/trust issues, adding missing moat screens, and implementing proper safety UI patterns per the Master Artifact Packet.

---

## 2. REQUIRED ENHANCEMENTS WITH TRACEABILITY

### A) CLAIMS / TRUST FIXES (HIGH PRIORITY)

| # | Change | Packet Reference | CSP | Implementation |
|---|--------|-----------------|-----|----------------|
| A1 | Replace hard compliance badges with "Compliance Posture & Roadmap" panel | Artifact 8 (Regulatory), Artifact 13 (Diligence FAQ) | CSP-005 | New panel showing: BAA-capable posture, Audit logs, MFA, Data minimization, SOC2 planned |
| A2 | Replace hard performance claims with "Pilot Goals + Assumptions Drawer" | Artifact 11 (Outcomes), Artifact 12 (GTM) | CSP-001 | All metrics labeled "Simulated demo values" or "Pilot target" with formula tooltips |

### B) SAFETY UI FIXES (CRITICAL)

| # | Change | Packet Reference | CSP | Implementation |
|---|--------|-----------------|-----|----------------|
| B1 | Remove "AI Confidence: 87%/92%" → Replace with Signal Strength Bands | Artifact 5 (Clinical Safety), §6 ASR Confidence | CSP-003 | LOW/GUARDED/MODERATE/HIGH bands + "Known unknowns" + Evidence refs |
| B2 | Reframe Story Mode / Before-After as "workflow simulation" | Artifact 10 (UI/UX), §3.3 Messaging Guardrails | CSP-001 | Emphasize: detection → portal inbox → clinician protocol → documentation |

### C) MISSING MOAT SCREENS (MUST ADD)

| # | Screen | Packet Reference | CSP | Key Elements |
|---|--------|-----------------|-----|--------------|
| C1 | **Restricted Notes Surface** | Artifact 5 §11, Artifact 10 §2.9 | CSP-005 | Separate nav, "Special Handling" banner, list/detail/create, audit metadata |
| C2 | **Exports Center** | Artifact 5 §9, Artifact 10 §2.10 | CSP-005 | Profile selector, confirmation modal, BLOCKED_POLICY state (428), manifest card |
| C3 | **Suppression Transparency UI** | Artifact 5 §9.2 Suppression Matrix | CSP-003 | Recommendation cards (GENERATED/SUPPRESSED), reason codes, remediation steps |

### D) WORKFLOW PROOF SCREENS

| # | Screen | Packet Reference | CSP | Key Elements |
|---|--------|-----------------|-----|--------------|
| D1 | **Portal Inbox Detail View** | Artifact 10 §2.3, §2.4 | CSP-004 | Evidence panel with segment refs, Ack/Resolve actions, nudge telemetry |
| D2 | **Draft Summary Review View** | Artifact 5 §10, Artifact 10 §2.5 | CSP-002 | Draft banner, review action bar, evidence panel, ASR quality warnings |
| D3 | **ROI Panel (Assumptions-based)** | Artifact 12 §9 ROI Model, Artifact 17 | N/A | Toggle "pilot target vs projection", formula tooltips, assumptions drawer |

### E) DEMO MODE CONTROLS

| # | Control | Packet Reference | Purpose |
|---|---------|-----------------|---------|
| E1 | System status toggle (NORMAL/DEGRADED) | Artifact 5 §9.2 | Show degraded mode behavior |
| E2 | Safety tier per patient (T0/T1/T2/T3) | Artifact 5 §3 Tiering | Demo tier routing |
| E3 | Inbox status (OPEN/ACK/IN_REVIEW/RESOLVED) | Artifact 5 §10 | Workflow state demo |
| E4 | Summary status (DRAFT/REVIEWED/ESCALATED) | Artifact 5 §10 | Draft lifecycle demo |
| E5 | Recommendation status (GENERATED/SUPPRESSED) | Artifact 5 §9 | Suppression transparency demo |
| E6 | Export status (READY/BLOCKED_POLICY/EXPIRED) | Artifact 5 §9.2 | Export policy demo |

### F) INVESTOR DEMO SCRIPT VIEW

| # | Flow Step | Duration | Screen |
|---|-----------|----------|--------|
| F1 | Patient journaling/voice (quick) | 1 min | patient-journal, patient-voice |
| F2 | Clinician inbox (T2) | 1 min | clinician-inbox |
| F3 | Inbox detail + evidence | 1 min | inbox-detail (NEW) |
| F4 | Draft summary review | 1 min | draft-review (NEW) |
| F5 | Suppressed recommendation w/ remediation | 1 min | suppression-ui (NEW) |
| F6 | Exports + manifest + confirmations | 1 min | exports-center (NEW) |
| F7 | ROI assumptions panel + pilot goals | 1 min | roi-dashboard (ENHANCED) |

---

## 3. SPEC TRACEABILITY MAP

| New/Modified Screen | Artifact 18 (Design) | Artifact 19 (Prototype) | Artifact 20 (Dataset) | CSP Invariant |
|---------------------|---------------------|------------------------|----------------------|---------------|
| compliance-posture | Color tokens, badges | New screen | N/A | CSP-005 |
| restricted-notes | Separate surface pattern | FR-WEB-007 | Synthetic notes | CSP-005 |
| exports-center | Modal, table patterns | FR-WEB-008 | Export manifests | CSP-005 |
| suppression-ui | Card, badge patterns | FR-WEB-004 | Suppression reasons | CSP-003 |
| inbox-detail | Evidence panel pattern | FR-WEB-002 | Alert details | CSP-004 |
| draft-review | Draft banner pattern | FR-WEB-003 | Summary artifacts | CSP-002 |
| demo-controls | Toggle, select patterns | Demo scenario controls | State fixtures | All |
| demo-script | Navigation pattern | Demo script flow | Scenario data | All |

---

## 4. FILE MODIFICATIONS

### Files to Modify:
1. `/mnt/okcomputer/output/prototype-web/index.html` - Main demo file

### New Synthetic Fixtures Needed:
1. Restricted notes (3-4 synthetic entries)
2. Export profiles (standard, segmented SUD, restricted)
3. Suppression reason codes with remediation
4. Draft summaries with evidence refs
5. Inbox items with nudge telemetry

---

## 5. RED TEAM HARDENING CHECKLIST

Before final output, verify:
- [ ] No "HIPAA Compliant" / "SOC 2 Type II" hard claims
- [ ] No "99.2%" / "340% ROI" without "Pilot target" label
- [ ] No AI confidence % in patient UI
- [ ] No clinician-only data in patient screens
- [ ] No "crisis averted" efficacy claims
- [ ] All suppression reasons show remediation
- [ ] All exports show confirmation requirements
- [ ] Draft banner visible on all draft summaries
- [ ] Signal bands used instead of confidence %

---

## 6. IMPLEMENTATION ORDER

1. **Phase 1: Claims/Trust Fixes** (A1-A2)
2. **Phase 2: Safety UI Fixes** (B1-B2)
3. **Phase 3: Moat Screens** (C1-C3)
4. **Phase 4: Workflow Screens** (D1-D3)
5. **Phase 5: Demo Controls** (E1-E6)
6. **Phase 6: Demo Script** (F1-F7)
7. **Phase 7: Red Team Hardening**
8. **Phase 8: Output Generation**
