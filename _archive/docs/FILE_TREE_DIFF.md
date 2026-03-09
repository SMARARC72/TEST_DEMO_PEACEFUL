# File Tree Diff Summary
## VC Demo v2.0 Implementation

---

## FILES CREATED/MODIFIED

```
/mnt/okcomputer/output/prototype-web/
├── index.html                          [MODIFIED] Complete rewrite (~1,713 lines)
├── index.html.backup.v2                [CREATED] Backup of original
├── IMPLEMENTATION_PLAN.md              [CREATED] Implementation plan with traceability
├── RED_TEAM_REPORT.md                  [CREATED] Red team hardening results
├── CHANGELOG.md                        [CREATED] Detailed change log
├── FILE_TREE_DIFF.md                   [CREATED] This file
├── SPEC_TRACEABILITY_MAP.md            [CREATED] Screen-to-spec mapping
└── HOW_TO_RUN.md                       [CREATED] Deployment instructions
```

---

## SCREEN ROUTE MAPPING

### Existing Screens (Retained/Enhanced)
| Screen ID | Status | Changes |
|-----------|--------|---------|
| `landing` | ENHANCED | Added navigation to new screens |
| `patient-welcome` | RETAINED | No changes |
| `patient-consent` | ENHANCED | Added "not emergency care" checkbox |
| `patient-home` | RETAINED | No changes |
| `patient-journal` | ENHANCED | Added draft banner |
| `patient-voice` | ENHANCED | Fixed waveform animation |
| `patient-checkin` | RETAINED | No changes |
| `patient-settings` | RETAINED | No changes |
| `clinician-login` | RETAINED | No changes |
| `clinician-mfa` | ENHANCED | Fixed input detection |
| `clinician-caseload` | ENHANCED | Added degraded mode banner |
| `clinician-inbox` | ENHANCED | Added "portal is authoritative" banner |
| `clinician-patient` | RETAINED | No changes |
| `roi-dashboard` | ENHANCED | Added assumptions drawer, toggle |

### New Screens (Added)
| Screen ID | Purpose | Lines |
|-----------|---------|-------|
| `compliance-posture` | Compliance roadmap panel | ~120 |
| `demo-script` | Investor demo flow guide | ~80 |
| `inbox-detail` | Portal inbox alert detail | ~100 |
| `draft-review` | Draft summary review workflow | ~120 |
| `restricted-notes` | Restricted notes surface | ~80 |
| `exports-center` | Export profiles & manifests | ~100 |
| `suppression-ui` | Suppression transparency | ~100 |
| `workflow-simulation` | Process demonstration | ~120 |

### Removed Screens
| Screen ID | Reason |
|-----------|--------|
| `story-mode` | Replaced with `workflow-simulation` to avoid efficacy claims |

---

## CSS CLASSES ADDED

```css
/* Signal Strength Bands (replaces confidence %) */
.signal-band          /* Base signal band style */
.signal-low           /* LOW signal - red */
.signal-guarded       /* GUARDED signal - amber */
.signal-moderate      /* MODERATE signal - blue */
.signal-high          /* HIGH signal - green */

/* Draft Banner */
.draft-banner         /* Persistent draft warning */

/* Suppression Cards */
.suppression-card     /* Base suppression card */
.suppression-card.suppressed  /* Suppressed state */

/* Restricted Notes */
.restricted-banner    /* Special handling warning */

/* Compliance Posture */
.posture-item         /* Posture item container */
.posture-implemented  /* Implemented control */
.posture-planned      /* Planned control */

/* Assumptions Drawer */
.assumptions-drawer   /* Expandable formula section */

/* Demo Script */
.script-step          /* Script step container */
.script-dot           /* Step indicator dot */
.script-dot.active    /* Active step */
.script-dot.completed /* Completed step */

/* Alert Types */
.t2-alert             /* T2 urgent alert */
.t1-alert             /* T1 review recommended */
```

---

## JAVASCRIPT FUNCTIONS ADDED/MODIFIED

### New Functions
```javascript
// Demo Controls
updateSystemStatus()      // Toggle NORMAL/DEGRADED
updateSafetyTier()        // Set T0/T1/T2/T3
updateInboxStatus()       // Set OPEN/ACK/IN_REVIEW/RESOLVED
updateSummaryStatus()     // Set DRAFT/REVIEWED/ESCALATED
updateRecStatus()         // Set GENERATED/SUPPRESSED
updateExportStatus()      // Set READY/BLOCKED_POLICY/EXPIRED
resetDemo()               // Reset all controls to defaults

// Inbox Detail Actions
acknowledgeAlert()        // Acknowledge inbox alert
resolveAlert()            // Resolve inbox alert
escalateAlert()           // Escalate to supervisor

// Draft Review Actions
markReviewed()            // Mark summary reviewed
useWithCaution()          // Flag for cautious use
retainDraft()             // Keep as draft
rejectSummary()           // Reject summary
escalateSummary()         // Escalate for review

// Export Center
showExportConfirmation()  // Show confirmation modal
hideExportConfirmation()  // Hide confirmation modal
generateExport()          // Generate with confirmation

// ROI Dashboard
setROIMode(mode)          // Toggle pilot/projection
toggleAssumption(id)      // Show/hide formula
```

### Modified Functions
```javascript
showScreen(screenId)      // Added window.scrollTo(0,0)
checkJournal()            // Added draft banner toggle
toggleRecording()         // Fixed waveform display
checkMFA()                // Fixed completion detection
```

---

## SYNTHETIC DATA FIXTURES

### Patient Data
- Sarah Johnson (demo patient)
- Maria Rodriguez (T2 alert patient)
- James Smith (draft summary patient)
- Emma Wilson (stable patient)

### Alert Fixtures
- T2 Alert: Hopelessness + Self-Harm Language
- T2 Alert: Isolation + Withdrawal (ACKNOWLEDGED)
- T1 Alert: Mood Trend Declining (RESOLVED)

### Restricted Notes Fixtures
- Suicide attempt history (2019)
- Legal involvement / custody dispute

### Export Fixtures
- Ready export: Maria Rodriguez_Export_2024-02-25
- Blocked export: James Smith_Export_2024-02-24 (428)

### Suppression Fixtures
- GENERATED: Care Plan Recommendation
- SUPPRESSED (Open T2): Safety Protocol Recommendation
- SUPPRESSED (Unreviewed Draft): Draft Summary Recommendation
- SUPPRESSED (ASR Low): ASR Quality Recommendation

---

## DEPENDENCIES

### External Libraries (unchanged)
- Tailwind CSS (via CDN)
- Google Fonts: Inter

### No New Dependencies
All enhancements use vanilla HTML/CSS/JavaScript with existing Tailwind classes.
