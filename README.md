# Behavioral Health AI Companion - Prototype

**Version:** 1.0  
**Date:** 2026-02-25  
**Built from:** Master Artifact Packet v1.5

---

## Quick Start

### Option 1: Open Directly (Recommended for Demo)

Simply open `prototype-web/index.html` in any modern web browser:

```bash
# On macOS
open prototype-web/index.html

# On Linux
xdg-open prototype-web/index.html

# On Windows
start prototype-web/index.html
```

Or drag and drop `index.html` into your browser window.

### Option 2: Serve with Local Server

For the best experience (especially with React Router), serve via a local HTTP server:

```bash
cd prototype-web

# Using Python 3
python -m http.server 8080

# Using Node.js (if installed)
npx serve .

# Using PHP
php -S localhost:8080
```

Then open: http://localhost:8080

---

## File Structure

```
/output/
├── prototype-web/
│   └── index.html          # Complete prototype (single file)
├── DELIVERABLES.md         # Complete deliverables documentation
├── VC_DEMO_SCRIPT.md       # 10-12 minute demo script
├── RED_TEAM_HARDENING.md   # Security hardening analysis
├── ROUNDTABLE_REVIEW.md    # Expert review + improvements
├── QA_CHECKLIST.md         # Spec-lock verification
└── README.md               # This file
```

---

## Screens Implemented

### Patient Routes (`/patient/*`)

| Route | Screen | Description |
|-------|--------|-------------|
| `/patient/welcome` | M-01 | Welcome + product boundaries |
| `/patient/consent` | M-02 | Consent acknowledgments |
| `/patient/home` | M-03 | Home dashboard |
| `/patient/journal` | M-04 | Journal composer |
| `/patient/history` | M-05 | Journal history |
| `/patient/checkin` | M-06 | Daily check-in |
| `/patient/voice` | M-08 | Voice recorder |
| `/patient/voice/progress` | M-09 | Upload progress |
| `/patient/careplan` | M-10 | Care plan activities |
| `/patient/resources` | M-11 | Safety resources |
| `/patient/settings` | M-12 | Settings |

### Clinician Routes (`/clinician/*`)

| Route | Screen | Description |
|-------|--------|-------------|
| `/clinician/login` | C-01 | Login + MFA |
| `/clinician/caseload` | C-02 | Caseload dashboard |
| `/clinician/inbox` | C-03 | Portal inbox list |
| `/clinician/inbox/:id` | C-04 | Inbox detail |
| `/clinician/patient/:id` | C-05 | Patient profile |
| `/clinician/summaries` | C-06 | Summaries list |
| `/clinician/summary/:id` | C-07 | Summary detail |
| `/clinician/recommendations` | C-08 | Recommendations panel |
| `/clinician/restricted-notes` | C-12 | Restricted notes |
| `/clinician/exports` | C-13 | Exports center |

---

## Demo Mode

The prototype includes a floating **Demo Mode** panel that allows real-time toggling of system states:

### How to Use Demo Mode

1. Look for the purple "Demo Mode" button in the bottom-right corner
2. Click to expand the control panel
3. Use toggles to demonstrate different states:

| Toggle | Options | Purpose |
|--------|---------|---------|
| System Status | NORMAL / DEGRADED | Show global banner behavior |
| Safety Tier | T0 / T1 / T2 / T3 | Show notification channels |
| Summary Status | DRAFT / REVIEWED | Show CSP-002 enforcement |
| Recommendation | GENERATED / SUPPRESSED | Show CSP-003 enforcement |
| Export Status | READY / BLOCKED_POLICY | Show CSP-005 enforcement |
| Voice Status | UPLOADING → COMPLETE | Show async processing |

### Demo Flow Recommendations

1. Start with **NORMAL** mode, show patient onboarding
2. Switch to **DEGRADED** mode, show global banner
3. Toggle **T2** tier, show portal inbox with email/SMS nudges
4. Toggle **DRAFT** summary, show persistent banner
5. Toggle **SUPPRESSED** recommendation, show reason codes
6. Toggle **BLOCKED_POLICY**, show 428 error

---

## Synthetic Dataset

All data is synthetic and explicitly marked. Located in `prototype-web/index.html`:

```javascript
const syntheticData = {
  tenant: {
    name: "Sunrise Therapy Group (Synthetic)"
  },
  patients: [
    { display_name: "Patient Alpha (Synthetic)", ... },
    // ...
  ],
  // ...
};
```

### Data Contents

- **Tenant:** Sunrise Therapy Group (Synthetic)
- **Clinicians:** 2 (Dr. Rivera, Dr. Chen - both marked synthetic)
- **Patients:** 5 (Alpha, Bravo, Charlie, Delta, Echo - all marked synthetic)
- **Portal Inbox:** 3 items (T0, T1, T2 tiers)
- **Summaries:** 2 (1 Draft, 1 Reviewed)
- **Recommendations:** 2 (1 Suppressed, 1 Generated)
- **Restricted Notes:** 1
- **Export Jobs:** 2 (1 Ready, 1 Blocked)

---

## CSP Policy Enforcement

### CSP-001: Decision Support Policy

- ✅ Patient UI never shows clinician-only recommendations
- ✅ Patient UI never shows suppression reason codes
- ✅ Patient UI never shows internal confidence values
- ✅ "Not emergency replacement" visible in patient UI

### CSP-002: Draft Summary Policy

- ✅ All Draft summaries show "Draft — clinician review required" banner
- ✅ Banner is non-dismissible
- ✅ Review actions required for promotion

### CSP-003: Recommendation Suppression Policy

- ✅ Suppressed recommendations show reason codes
- ✅ Remediation steps always visible
- ✅ No silent suppression

### CSP-004: Portal Inbox Authority

- ✅ Portal inbox is authoritative workflow
- ✅ Email/SMS shown as "nudges" only
- ✅ Acknowledge/resolve only in portal

### CSP-005: Restricted Surface

- ✅ Restricted notes separate surface
- ✅ Excluded from standard exports
- ✅ Export blocking (428) when confirmation missing

---

## Demo Script

See `VC_DEMO_SCRIPT.md` for the complete 10-12 minute presentation script.

**Key Messages:**
- "Clinician-supervised, not autonomous"
- "Extends care between sessions"
- "Safety-first design with hard constraints"
- "Synthetic data only—no PHI"

---

## Browser Compatibility

Tested and working in:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

Requires JavaScript enabled.

---

## Troubleshooting

### Blank Page
- Ensure JavaScript is enabled
- Try opening with a local HTTP server (not file://)
- Check browser console for errors

### Demo Mode Not Visible
- Look for purple button in bottom-right corner
- May be behind other content—try scrolling

### Navigation Issues
- Use browser back button
- Or click app navigation elements

---

## License & Disclaimer

**Prototype Only:** This is a demonstration prototype built from synthetic data. Not for production use.

**No PHI:** This prototype contains no protected health information. All data is synthetic.

**Not Medical Advice:** This prototype does not provide medical advice, diagnosis, or treatment.

**Emergency:** If you are in crisis, call emergency services or the 988 Suicide & Crisis Lifeline.

---

## Contact

For questions about this prototype, refer to the KRLZ
.
