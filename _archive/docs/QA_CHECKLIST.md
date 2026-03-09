# Prototype QA Checklist (Spec-Lock)
## Behavioral Health AI Companion

---

## Screen-by-Screen Checklist

### Patient Screens (M-01..M-12)

| Screen | Requirement | Status |
|--------|-------------|--------|
| M-01 Welcome | Product boundary disclosure visible | ✅ |
| M-01 Welcome | "Not emergency replacement" disclaimer | ✅ |
| M-01 Welcome | Clear CTA to continue | ✅ |
| M-02 Consent | Multi-step acknowledgments | ✅ |
| M-02 Consent | All checkboxes required before continue | ✅ |
| M-02 Consent | Journaling consent item | ✅ |
| M-02 Consent | Voice consent item | ✅ |
| M-02 Consent | Clinician review consent item | ✅ |
| M-02 Consent | Product boundaries consent item | ✅ |
| M-03 Home | Dashboard loads with navigation | ✅ |
| M-03 Home | Degraded mode banner appears when toggled | ✅ |
| M-03 Home | Today's prompts section visible | ✅ |
| M-03 Home | Daily check-in CTA | ✅ |
| M-03 Home | Journal entry CTA | ✅ |
| M-03 Home | Voice note CTA | ✅ |
| M-03 Home | Care plan preview | ✅ |
| M-03 Home | Bottom navigation bar | ✅ |
| M-04 Journal | Composer accepts text input | ✅ |
| M-04 Journal | Save button disabled when empty | ✅ |
| M-04 Journal | Back navigation | ✅ |
| M-05 History | Journal entries displayed | ✅ |
| M-05 History | Timestamps visible | ✅ |
| M-05 History | Back navigation | ✅ |
| M-06 Check-in | Mood slider | ✅ |
| M-06 Check-in | Stress slider | ✅ |
| M-06 Check-in | Energy slider | ✅ |
| M-06 Check-in | Optional notes field | ✅ |
| M-06 Check-in | Submit button | ✅ |
| M-08 Voice | Recorder UI | ✅ |
| M-08 Voice | Recording toggle | ✅ |
| M-08 Voice | Upload button when recording | ✅ |
| M-08 Voice | Privacy notice | ✅ |
| M-09 Voice Progress | Progress bar | ✅ |
| M-09 Voice Progress | Status label | ✅ |
| M-09 Voice Progress | Complete state | ✅ |
| M-09 Voice Progress | Failed state with retry | ✅ |
| M-10 Care Plan | Activities list | ✅ |
| M-10 Care Plan | Status badges | ✅ |
| M-10 Care Plan | Back navigation | ✅ |
| M-11 Resources | Crisis support section | ✅ |
| M-11 Resources | 988 and 911 CTAs | ✅ |
| M-11 Resources | Safety plan section | ✅ |
| M-11 Resources | Coping skills grid | ✅ |
| M-12 Settings | Notifications toggle | ✅ |
| M-12 Settings | Account info | ✅ |
| M-12 Settings | Consent version | ✅ |
| M-12 Settings | Sign out button | ✅ |

### Clinician Screens (C-01..C-14)

| Screen | Requirement | Status |
|--------|-------------|--------|
| C-01 Login | Email input | ✅ |
| C-01 Login | Password input | ✅ |
| C-01 Login | Sign in button | ✅ |
| C-01 Login | MFA code input | ✅ |
| C-01 Login | Verify button | ✅ |
| C-02 Caseload | Patient list | ✅ |
| C-02 Caseload | Alert indicators | ✅ |
| C-02 Caseload | Draft indicators | ✅ |
| C-02 Caseload | Filter buttons | ✅ |
| C-03 Inbox List | Tier badges (T0-T3) | ✅ |
| C-03 Inbox List | Status labels | ✅ |
| C-03 Inbox List | Delivery nudges visible | ✅ |
| C-03 Inbox List | Timestamps | ✅ |
| C-04 Inbox Detail | Tier badge | ✅ |
| C-04 Inbox Detail | Status badge | ✅ |
| C-04 Inbox Detail | Evidence panel | ✅ |
| C-04 Inbox Detail | Delivery nudges | ✅ |
| C-04 Inbox Detail | Acknowledge button | ✅ |
| C-04 Inbox Detail | Resolve button | ✅ |
| C-05 Patient Profile | Patient info header | ✅ |
| C-05 Patient Profile | Tab navigation | ✅ |
| C-05 Patient Profile | Overview tab | ✅ |
| C-05 Patient Profile | Summaries tab | ✅ |
| C-05 Patient Profile | Recommendations tab | ✅ |
| C-05 Patient Profile | Exports tab | ✅ |
| C-06 Summaries | Filter (All/Draft/Reviewed) | ✅ |
| C-06 Summaries | Patient names | ✅ |
| C-06 Summaries | Status badges | ✅ |
| C-06 Summaries | "Review required" indicators | ✅ |
| C-07 Summary Detail | Draft banner | ✅ |
| C-07 Summary Detail | Summary content | ✅ |
| C-07 Summary Detail | Evidence panel | ✅ |
| C-07 Summary Detail | Review actions | ✅ |
| C-08 Recommendations | Generated cards | ✅ |
| C-08 Recommendations | Suppressed cards | ✅ |
| C-08 Recommendations | Reason codes visible | ✅ |
| C-08 Recommendations | Remediation steps | ✅ |
| C-08 Recommendations | Action buttons | ✅ |
| C-12 Restricted Notes | Separate surface | ✅ |
| C-12 Restricted Notes | Restricted surface banner | ✅ |
| C-12 Restricted Notes | Note content | ✅ |
| C-13 Exports | New export form | ✅ |
| C-13 Exports | Export jobs list | ✅ |
| C-13 Exports | Status badges | ✅ |
| C-13 Exports | BLOCKED_POLICY state | ✅ |
| C-13 Exports | 428 error message | ✅ |

---

## State Checklist

### System States

| State | Requirement | Status |
|-------|-------------|--------|
| NORMAL | No global banner | ✅ |
| DEGRADED | Global banner visible | ✅ |
| DEGRADED | Banner text correct | ✅ |

### Safety Tiers

| Tier | Requirement | Status |
|------|-------------|--------|
| T0 | Portal only | ✅ |
| T0 | No email/SMS | ✅ |
| T1 | Portal + email | ✅ |
| T2 | Portal + email + optional SMS | ✅ |
| T3 | Portal + email + SMS | ✅ |
| All | Icons visible | ✅ |
| All | Color coding | ✅ |

### Summary States

| State | Requirement | Status |
|-------|-------------|--------|
| DRAFT | Draft banner visible | ✅ |
| DRAFT | Banner non-dismissible | ✅ |
| DRAFT | Review actions available | ✅ |
| REVIEWED | Reviewed badge visible | ✅ |
| REVIEWED | No draft banner | ✅ |

### Recommendation States

| State | Requirement | Status |
|-------|-------------|--------|
| GENERATED | Full transparency block | ✅ |
| GENERATED | Why now visible | ✅ |
| GENERATED | Confidence visible | ✅ |
| SUPPRESSED | Suppression banner | ✅ |
| SUPPRESSED | Reason codes visible | ✅ |
| SUPPRESSED | Remediation visible | ✅ |

### Export States

| State | Requirement | Status |
|-------|-------------|--------|
| QUEUED | Progress indicator | ✅ |
| GENERATING | Progress indicator | ✅ |
| READY | Download available | ✅ |
| EXPIRED | Expired state | ✅ |
| BLOCKED_POLICY | 428 error visible | ✅ |
| BLOCKED_POLICY | Error message clear | ✅ |

### Voice States

| State | Requirement | Status |
|-------|-------------|--------|
| UPLOADING | Progress bar | ✅ |
| QUEUED | Queue position | ✅ |
| PROCESSING | Processing indicator | ✅ |
| COMPLETE | Transcript available | ✅ |
| FAILED | Retry option | ✅ |

---

## Policy Invariant Checklist (CSP-001..CSP-005)

### CSP-001: Decision Support Policy

| Requirement | Status |
|-------------|--------|
| Patient UI NEVER shows clinician-only recommendations | ✅ |
| Patient UI NEVER shows suppression reason codes | ✅ |
| Patient UI NEVER shows internal confidence values | ✅ |
| Patient UI NEVER shows clinician-only rationale | ✅ |
| No diagnosis UI in patient screens | ✅ |
| No medication recommendation UI | ✅ |
| "Not emergency replacement" visible in patient UI | ✅ |

### CSP-002: Draft Summary Policy

| Requirement | Status |
|-------------|--------|
| All Draft summaries show "Draft — clinician review required" banner | ✅ |
| Draft label persists until reviewed | ✅ |
| Review action required to promote state | ✅ |
| No auto-promotion from Draft | ✅ |
| Banner is non-dismissible | ✅ |

### CSP-003: Recommendation Suppression Policy

| Requirement | Status |
|-------------|--------|
| Suppressed recommendations show reason codes | ✅ |
| Suppressed recommendations show remediation steps | ✅ |
| Suppression visible in clinician UI | ✅ |
| No silent suppression | ✅ |

### CSP-004: Notification/Alert Channel Policy

| Requirement | Status |
|-------------|--------|
| Portal inbox is authoritative | ✅ |
| Email/SMS/push shown as "nudges" only | ✅ |
| Acknowledge/resolve only in portal | ✅ |
| Delivery status visible | ✅ |

### CSP-005: Restricted Surface and Data Class Separation

| Requirement | Status |
|-------------|--------|
| Restricted notes separate surface | ✅ |
| Restricted notes excluded from standard exports | ✅ |
| Restricted surface banner visible | ✅ |
| Export blocked policy (428) when confirmation missing | ✅ |

---

## MUST NOT EXIST List

| Item | Status |
|------|--------|
| NO real PHI in any data | ✅ |
| NO real patient names | ✅ |
| NO real clinician identities | ✅ |
| NO actual API calls to LLM/ASR providers | ✅ |
| NO diagnosis UI in patient screens | ✅ |
| NO medication recommendation UI | ✅ |
| NO "AI therapist" positioning | ✅ |
| NO autonomous therapy claims | ✅ |
| NO emergency replacement claims | ✅ |
| NO clinician-only content in patient routes | ✅ |
| NO suppression reason codes in patient routes | ✅ |
| NO restricted notes in patient routes | ✅ |
| NO internal confidence in patient routes | ✅ |

---

## Demo Mode Checklist

| Toggle | States | Status |
|--------|--------|--------|
| System Status | NORMAL / DEGRADED | ✅ |
| Safety Tier | T0 / T1 / T2 / T3 | ✅ |
| Summary Status | DRAFT / REVIEWED | ✅ |
| Recommendation | GENERATED / SUPPRESSED | ✅ |
| Export Status | QUEUED / GENERATING / READY / EXPIRED / BLOCKED_POLICY | ✅ |
| Voice Status | UPLOADING / QUEUED / PROCESSING / COMPLETE / FAILED | ✅ |

---

## Final Verification

- [x] All M-01..M-12 screens implemented
- [x] All C-01..C-14 screens implemented
- [x] All state variants demonstrated
- [x] All CSP policies enforced
- [x] Synthetic data only
- [x] Demo mode functional
- [x] No PHI present
- [x] Ready for VC demo

**QA Status: PASSED**
