# Peacefull.ai - Behavioral Health AI Companion (VC Demo)

A clinician-supervised behavioral health AI companion prototype for VC demonstrations.

## 🚀 One-Click Deploy to GitHub

### Prerequisites
1. Create a GitHub account: [github.com/join](https://github.com/join)
2. Create a new repository named `peacefull-demo`: [github.com/new](https://github.com/new)

### Deploy (Choose your OS)

**Mac/Linux:**
```bash
./deploy.sh YOUR_GITHUB_USERNAME
```

**Windows:**
```batch
deploy.bat YOUR_GITHUB_USERNAME
```

### Example
```bash
./deploy.sh khojarahimi
```

That's it! The script will:
- ✓ Initialize Git repository
- ✓ Add all files
- ✓ Commit changes
- ✓ Push to GitHub
- ✓ Provide your live demo URL

Then enable GitHub Pages in Settings → Pages (takes 1-2 minutes).

---

## 🌐 Live Demo

**After deployment:** [https://your-username.github.io/peacefull-demo](https://your-username.github.io/peacefull-demo)

## 📋 Overview

This interactive demo showcases:
- **Patient Experience** - Journal entries, voice notes, daily check-ins
- **Clinician Portal** - Portal inbox, draft summaries, safety alerts
- **Moat Screens** - Restricted notes, exports center, suppression transparency
- **Compliance Posture** - Security roadmap and planned certifications
- **ROI Dashboard** - Assumptions-based projections with formula transparency

## 🛡️ Safety Features

- Signal strength bands (LOW/GUARDED/MODERATE/HIGH) - no AI confidence %
- Persistent draft banners requiring clinician review
- "Portal is authoritative" - notifications are nudges only
- Patient/clinician data boundary enforcement
- Synthetic data only - no PHI

## 📁 Project Structure

```
├── index.html          # Single-file demo (all HTML/CSS/JS)
├── README.md           # This file
└── docs/               # Documentation (optional)
    ├── CHANGELOG.md
    ├── RED_TEAM_REPORT.md
    └── SPEC_TRACEABILITY.md
```

## 🏃 Local Development

### Option 1: Direct Open
Simply open `index.html` in any modern browser.

### Option 2: Python HTTP Server
```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

### Option 3: Node.js
```bash
npx serve -p 8080
```

## 🌐 GitHub Pages Hosting

This demo is configured for GitHub Pages. To deploy:

1. Go to **Settings** → **Pages** in your GitHub repo
2. Set **Source** to "Deploy from a branch"
3. Select **main** branch and **/(root)** folder
4. Click **Save**
5. Your demo will be live at `https://your-username.github.io/repo-name`

## 🎬 Demo Flow (Recommended 8-10 min)

1. **Landing** → Overview of the platform
2. **Patient Experience** → Consent flow, journal entry
3. **Clinician Portal** → Login, MFA, caseload view
4. **Portal Inbox** → T2 alert with evidence panel
5. **Draft Review** → AI summary requiring clinician approval
6. **Suppression UI** → Blocked recommendations with remediation
7. **Exports Center** → Segmentation and confirmation
8. **ROI Dashboard** → Assumptions drawer with projections
9. **Compliance Posture** → Security roadmap

## 🎛️ Demo Controls

The demo includes a control panel (top-right) for:
- System status (NORMAL/DEGRADED)
- Safety tier (T0/T1/T2/T3)
- Inbox status (OPEN/ACK/IN_REVIEW/RESOLVED/CLOSED)
- Summary status (DRAFT/REVIEWED/ESCALATED/REJECTED)
- Recommendation status (GENERATED/SUPPRESSED)
- Export status (READY/BLOCKED_POLICY/EXPIRED/FAILED)
- Voice status (UPLOADING/PROCESSING/COMPLETE/FAILED)

## 📊 Screens (20 Total)

### Patient Screens (7)
- Welcome, Consent, Home, Journal, Check-in, Voice, Settings

### Clinician Screens (8)
- Login, MFA, Caseload, Inbox, Patient Detail, Inbox Detail, Draft Review, Restricted Notes

### Moat Screens (3)
- Restricted Notes, Exports Center, Suppression UI

### Demo Screens (2)
- Compliance Posture, ROI Dashboard, Demo Script, Workflow Simulation

## 🔒 CSP Invariants

| CSP | Description | Status |
|-----|-------------|--------|
| CSP-001 | Human-in-the-Loop | ✅ Draft banners, review actions |
| CSP-002 | Draft Summaries | ✅ Persistent banners, evidence refs |
| CSP-003 | Safety Tiering | ✅ Signal bands, no confidence % |
| CSP-004 | Portal Inbox | ✅ Authority banner, nudge telemetry |
| CSP-005 | Data Governance | ✅ Restricted notes, export segmentation |

## 📝 Changelog

See [CHANGELOG.md](./docs/CHANGELOG.md) for detailed changes.

## 🔐 Red Team Report

See [RED_TEAM_REPORT.md](./docs/RED_TEAM_REPORT.md) for security hardening details.

## 📄 License

Proprietary - For demonstration purposes only.

---

**Note:** This demo uses synthetic data only. No PHI is present.
