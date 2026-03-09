# Spec Traceability Map
## VC Demo v2.0 → Master Artifact Packet v1.5

---

## ARTIFACT 18: DESIGN SYSTEM

### Color Tokens
| Token | Value | Usage in Demo |
|-------|-------|---------------|
| `--color-primary` | Teal (#0d9488) | Primary buttons, hero gradient, signal bands |
| `--color-coral` | Coral (#f97316) | Clinician portal accent, alerts |
| `--color-slate` | Slate (#64748b) | Text, backgrounds |
| `--color-red` | Red (#dc2626) | T2 alerts, restricted notes |
| `--color-amber` | Amber (#f59e0b) | T1 alerts, draft banners, warnings |
| `--color-green` | Green (#10b981) | Success states, implemented posture |

### Typography
| Style | Font | Usage |
|-------|------|-------|
| Headings | Inter (600-800) | Screen titles, section headers |
| Body | Inter (400-500) | Content, descriptions |
| Small | Inter (300-400) | Labels, metadata, audit info |

### Component Patterns
| Component | Pattern | Screens |
|-----------|---------|---------|
| Cards | `rounded-2xl`, `shadow-sm`, `bg-white` | All content screens |
| Buttons | `rounded-xl`, gradient, hover lift | All action buttons |
| Alerts | Left border accent, gradient bg | T1/T2 alerts |
| Banners | Full-width, colored border | Draft, restricted, warnings |
| Modals | Centered, backdrop blur | Export confirmation |

---

## ARTIFACT 19: CLICKABLE PROTOTYPE SPEC

### Screen-to-Spec Mapping

| Screen ID | Artifact 19 Reference | Description |
|-----------|----------------------|-------------|
| `landing` | FR-WEB-001 | Entry point with role selection |
| `patient-welcome` | FR-WEB-001.1 | Patient onboarding welcome |
| `patient-consent` | FR-WEB-001.2 | Consent flow with checkboxes |
| `patient-home` | FR-WEB-001.3 | Patient dashboard |
| `patient-journal` | FR-WEB-001.4 | Journal entry input |
| `patient-voice` | FR-WEB-001.5 | Voice note recording |
| `patient-checkin` | FR-WEB-001.6 | Daily check-in sliders |
| `clinician-login` | FR-WEB-002 | Clinician authentication |
| `clinician-mfa` | FR-WEB-002.1 | MFA code entry |
| `clinician-caseload` | FR-WEB-002.2 | Patient list view |
| `clinician-inbox` | FR-WEB-002.3 | Portal inbox |
| `clinician-patient` | FR-WEB-002.4 | Patient detail view |
| `inbox-detail` | FR-WEB-002.3.1 | **NEW:** Alert detail with evidence |
| `draft-review` | FR-WEB-002.5 | **NEW:** Draft summary review |
| `restricted-notes` | FR-WEB-007 | **NEW:** Restricted notes surface |
| `exports-center` | FR-WEB-008 | **NEW:** Export profiles |
| `suppression-ui` | FR-WEB-004 | **NEW:** Suppression transparency |
| `roi-dashboard` | FR-WEB-006 | ROI dashboard (enhanced) |
| `compliance-posture` | FR-WEB-009 | **NEW:** Compliance roadmap |
| `demo-script` | FR-WEB-010 | **NEW:** Investor demo guide |
| `workflow-simulation` | FR-WEB-011 | **NEW:** Process demonstration |

---

## ARTIFACT 20: SYNTHETIC DATASET

### Patient Records
| Patient | ID | Alerts | Drafts | Notes |
|---------|-----|--------|--------|-------|
| Sarah Johnson | PT-1001 | 0 | 0 | Demo patient (consent flow) |
| Maria Rodriguez | PT-2847 | 1 T2 | 1 | Safety signal patient |
| James Smith | PT-3156 | 1 T2 (ACK) | 1 | Withdrawal pattern |
| Emma Wilson | PT-4291 | 1 T1 (RES) | 0 | Stable patient |

### Alert Dataset
| Alert ID | Patient | Tier | Status | Type |
|----------|---------|------|--------|------|
| ALT-2847-001 | Maria Rodriguez | T2 | OPEN | Hopelessness + Self-Harm |
| ALT-3156-001 | James Smith | T2 | ACKNOWLEDGED | Isolation + Withdrawal |
| ALT-4291-001 | Emma Wilson | T1 | RESOLVED | Mood Trend Declining |

### Voice Entry Dataset
| Entry ID | Patient | Duration | Segments | Signal |
|----------|---------|----------|----------|--------|
| VOX-2847-001 | Maria Rodriguez | 1:24 | 3 | GUARDED/HIGH |

### Restricted Notes Dataset
| Note ID | Patient | Type | Content |
|---------|---------|------|---------|
| RNOTE-2847-001 | Maria Rodriguez | Safety | Suicide attempt history (2019) |
| RNOTE-2847-002 | Maria Rodriguez | Legal | Custody dispute |

---

## CSP INVARIANTS COMPLIANCE

### CSP-001: Human-in-the-Loop
| Requirement | Implementation |
|-------------|----------------|
| Clinician approval required | Draft banner: "Clinician Review Required" |
| No autonomous diagnosis | All AI outputs labeled "Draft" |
| Override capability | Review actions: Reviewed/Retain Draft/Reject |

### CSP-002: Draft Summaries
| Requirement | Implementation |
|-------------|----------------|
| Draft banner visible | Persistent banner on all draft summaries |
| Clinician review required | Action bar with review options |
| Evidence references | Segment-level refs in evidence panel |

### CSP-003: Safety Tiering
| Requirement | Implementation |
|-------------|----------------|
| Tier assignment | T0/T1/T2/T3 in demo controls |
| Signal strength bands | LOW/GUARDED/MODERATE/HIGH |
| No confidence % | Removed all percentage displays |

### CSP-004: Portal Inbox
| Requirement | Implementation |
|-------------|----------------|
| Authoritative source | "Portal is authoritative" banner |
| Nudge notifications | Email/SMS shown as nudges only |
| Acknowledge/resolve | Action buttons in inbox detail |

### CSP-005: Data Governance
| Requirement | Implementation |
|-------------|----------------|
| Restricted notes | Separate surface with special handling |
| Export segmentation | Profile selector + confirmation |
| Audit logging | Audit metadata on restricted notes |

---

## TRACEABILITY MATRIX

| Feature | Artifact 18 | Artifact 19 | Artifact 20 | CSP |
|---------|-------------|-------------|-------------|-----|
| Compliance Posture | Colors, cards | FR-WEB-009 | N/A | CSP-005 |
| Signal Bands | Colors | FR-WEB-004 | N/A | CSP-003 |
| Draft Banner | Colors, typography | FR-WEB-002.5 | Synthetic drafts | CSP-002 |
| Inbox Detail | Cards, buttons | FR-WEB-002.3.1 | Alert dataset | CSP-004 |
| Restricted Notes | Cards, banners | FR-WEB-007 | Note dataset | CSP-005 |
| Exports Center | Modals, tables | FR-WEB-008 | Export fixtures | CSP-005 |
| Suppression UI | Cards, badges | FR-WEB-004 | Suppression reasons | CSP-003 |
| Demo Controls | Toggles, selects | FR-WEB-010 | State fixtures | All |
| ROI Dashboard | Cards, tooltips | FR-WEB-006 | N/A | N/A |
| Workflow Simulation | Cards, icons | FR-WEB-011 | Process data | CSP-001 |

---

## GAP ANALYSIS

### Fully Implemented
- ✅ All CSP invariants (001-005)
- ✅ All Artifact 19 screen requirements
- ✅ All Artifact 20 synthetic data
- ✅ All Artifact 18 design tokens

### Partially Implemented
- ⚠️ Export checksums: Placeholder only (demo)
- ⚠️ Audit logs: Display-only (no backend)
- ⚠️ Time-limited downloads: Simulated only

### Not Implemented (Out of Scope)
- ❌ Real backend integration
- ❌ Actual PHI handling (synthetic only)
- ❌ Live ASR processing (simulated)
- ❌ Real-time notifications (simulated)

---

## VERIFICATION

All screens have been verified against:
1. Artifact 18 Design System - Colors, typography, spacing
2. Artifact 19 Prototype Spec - Screen flows, interactions
3. Artifact 20 Synthetic Data - Patient records, alerts, notes
4. CSP-001 through CSP-005 - Safety and governance invariants
