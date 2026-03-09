# How to Run / Deploy
## Peacefull.ai VC Demo v2.0

---

## QUICK START (Local)

### Option 1: Direct File Open
1. Navigate to `/mnt/okcomputer/output/prototype-web/`
2. Open `index.html` in any modern browser
3. Demo loads at landing screen

### Option 2: Python HTTP Server
```bash
cd /mnt/okcomputer/output/prototype-web
python3 -m http.server 8080
# Open http://localhost:8080 in browser
```

### Option 3: Node.js (npx serve)
```bash
cd /mnt/okcomputer/output/prototype-web
npx serve -p 8080
# Open http://localhost:8080 in browser
```

---

## DEPLOYMENT (Hosted Demo)

### Static Hosting Options

#### 1. Netlify Drop
1. Go to https://app.netlify.com/drop
2. Drag and drop the `prototype-web` folder
3. Get instant URL (e.g., `https://xxx.netlify.app`)

#### 2. Vercel
```bash
npm i -g vercel
cd /mnt/okcomputer/output/prototype-web
vercel --prod
```

#### 3. GitHub Pages
1. Push `prototype-web` folder to GitHub repo
2. Enable GitHub Pages in repo settings
3. Select root folder as source

#### 4. AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync /mnt/okcomputer/output/prototype-web s3://your-bucket-name --acl public-read

# Invalidate CloudFront (if using)
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

---

## DEMO MODE PANEL OPERATION

### Accessing the Panel
- **Location:** Fixed top-right corner of all screens
- **Toggle:** Click "Demo Controls" header to collapse/expand
- **Default:** Expanded on load

### Control Reference

| Control | Options | Effect |
|---------|---------|--------|
| **System Status** | NORMAL / DEGRADED | Shows/hides degraded mode banner on caseload |
| **Safety Tier** | T0 / T1 / T2 / T3 | Demo tier routing (visual only) |
| **Inbox Status** | OPEN / ACK / IN_REVIEW / RESOLVED / CLOSED | Updates inbox item badges |
| **Summary Status** | DRAFT / REVIEWED / ESCALATED / REJECTED | Updates summary state |
| **Recommendation** | GENERATED / SUPPRESSED | Toggles suppression UI state |
| **Export Status** | READY / BLOCKED_POLICY / EXPIRED | Updates export card state |

### Quick Access Buttons
| Button | Destination | Use Case |
|--------|-------------|----------|
| **Compliance Posture** | `compliance-posture` | Show security roadmap to investors |
| **Demo Script** | `demo-script` | Start guided investor walkthrough |
| **Restricted Notes** | `restricted-notes` | Demonstrate special handling |
| **Exports Center** | `exports-center` | Show segmentation & confirmation |
| **Suppression UI** | `suppression-ui` | Explain recommendation blocking |
| **Reset Demo** | N/A | Reset all controls to defaults |

---

## INVESTOR DEMO FLOW (8-10 Minutes)

### Recommended Sequence

#### 1. Opening (30 seconds)
- Start at `landing` screen
- Brief intro: "Clinician-supervised AI for behavioral health"
- Navigate to `demo-script` for overview

#### 2. Patient Experience (1 minute)
- Click "Patient Experience" → `patient-welcome`
- Walk through consent flow
- Show journal entry with draft banner
- Emphasize: "Patient never sees AI confidence"

#### 3. Clinician Portal (2 minutes)
- Click "Clinician Portal" → `clinician-login`
- Show MFA requirement
- Navigate to `clinician-caseload`
- Point out T2 alert badge

#### 4. Portal Inbox (1 minute)
- Click `clinician-inbox`
- Explain: "Portal is authoritative; notifications are nudges"
- Click T2 alert → `inbox-detail`
- Show evidence panel with signal bands
- Show nudge telemetry

#### 5. Draft Summary Review (1 minute)
- Navigate to `draft-review`
- Emphasize persistent draft banner
- Show review action bar
- Show "Known unknowns" disclosure

#### 6. Suppression Transparency (1 minute)
- Navigate to `suppression-ui`
- Explain: "Recommendations suppressed due to open T2"
- Show reason codes and remediation steps
- Emphasize: "Clinician-only visibility"

#### 7. Data Governance (1 minute)
- Navigate to `restricted-notes`
- Explain special handling and export restrictions
- Navigate to `exports-center`
- Show profile selector and confirmation modal
- Show BLOCKED_POLICY state

#### 8. ROI & Compliance (1 minute)
- Navigate to `roi-dashboard`
- Toggle between Pilot Targets and Projections
- Show assumptions drawer with formulas
- Navigate to `compliance-posture`
- Show implemented controls and roadmap

#### 9. Closing (30 seconds)
- Return to `landing`
- Summarize: "Clinician-supervised, safety-first, transparent AI"
- Provide contact info

---

## KEY TALKING POINTS

### Safety First
- "Every AI insight is a draft requiring clinician approval"
- "Signal strength bands, not confidence percentages"
- "Portal inbox is authoritative; notifications are nudges"

### Transparency
- "Suppression reasons with remediation steps"
- "Evidence references for every alert"
- "Assumptions drawer for all projections"

### Compliance
- "BAA-capable cloud posture"
- "Restricted notes with separate audit trail"
- "Export segmentation with confirmation"

### Workflow
- "Capture between-session signals clinicians would miss"
- "Generate draft summaries to save documentation time"
- "Maintain human oversight at every step"

---

## TROUBLESHOOTING

### Demo Panel Not Visible
- Check if `z-index: 100` is being overridden
- Ensure no other element has higher z-index

### Screens Not Transitioning
- Check browser console for JavaScript errors
- Verify `showScreen()` function is defined
- Ensure all screen IDs match

### Styles Not Loading
- Verify Tailwind CDN is accessible
- Check for Content Security Policy blocks
- Try hard refresh (Ctrl+Shift+R)

### Recording Animation Not Working
- Verify CSS animation keyframes are defined
- Check if `waveform` class is applied
- Ensure `recording-active` class toggles correctly

---

## BROWSER COMPATIBILITY

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| Mobile Chrome | 90+ | ✅ Supported |
| Mobile Safari | 14+ | ✅ Supported |

---

## PERFORMANCE NOTES

- **File Size:** ~1,713 lines HTML/CSS/JS
- **Load Time:** < 1 second on broadband
- **External Dependencies:** Tailwind CSS CDN only
- **No Build Step Required:** Pure HTML/CSS/JS

---

## SECURITY NOTES

- **No PHI:** All data is synthetic
- **No Backend:** No data leaves the browser
- **No Cookies:** No session tracking
- **Cache Headers:** Set to prevent caching

---

## SUPPORT

For issues or questions:
- Review `CHANGELOG.md` for feature details
- Review `RED_TEAM_REPORT.md` for security considerations
- Review `SPEC_TRACEABILITY_MAP.md` for spec compliance
