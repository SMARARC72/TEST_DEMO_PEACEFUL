# Behavioral Health AI Companion - Prototype Build Deliverables
## Master Artifact Packet v1.5 Implementation

**Build Date:** 2026-02-25  
**Prototype Path:** `/prototype-web`  
**Primary Toolchain:** React + Vite + TypeScript (Path 2 - Semi-interactive web prototype)

---

# A) PACKET TRACEABILITY MAP

## Prototype Element → Packet Citation Mapping

| Prototype Element | Artifact # | Section Heading | Policy Link |
|-------------------|------------|-----------------|-------------|
| **Patient Screens M-01..M-12** | Art 19 | Screen Inventory (Patient Mobile) | CSP-001 |
| M-01 Welcome + Boundaries | Art 19 | 3) Screen Inventory | CSP-001 (Decision Support Boundary) |
| M-02 Consent & Acknowledgment | Art 19 | 3) Screen Inventory | Art 12 (Consent Model) |
| M-03 Home Dashboard | Art 19 | 3) Screen Inventory | Art 18 (Degraded Mode Banner) |
| M-04 Journal Composer | Art 10 | 1.2 Journaling | FR-MOB-002 |
| M-05 Journal Receipt | Art 10 | 1.2 Journaling | FR-MOB-002 |
| M-06 Check-In | Art 10 | 1.3 Check-Ins | FR-MOB-003 |
| M-07 Check-In Receipt | Art 10 | 1.3 Check-Ins | FR-MOB-003 |
| M-08 Async Voice Recorder | Art 10 | 1.4 Async Voice | FR-MOB-004 |
| M-09 Voice Upload Progress | Art 10 | 1.4 Async Voice | FR-MOB-004 |
| M-10 Care Plan Activities | Art 10 | 1.5 Care Plan | FR-MOB-005 |
| M-11 Resources | Art 10 | 1.6 Safety Resources | FR-MOB-007 |
| M-12 Settings | Art 10 | 1.1 Onboarding | FR-MOB-001 |
| **Clinician Screens C-01..C-14** | Art 19 | 4) Screen Inventory (Clinician Portal) | CSP-001..CSP-005 |
| C-01 Login + MFA | Art 19 | 4) Screen Inventory | FR-WEB-001 |
| C-02 Caseload Dashboard | Art 19 | 4) Screen Inventory | FR-WEB-001 |
| C-03 Portal Inbox List | Art 19 | 4) Screen Inventory | CSP-004 |
| C-04 Portal Inbox Detail | Art 19 | 4) Screen Inventory | CSP-004 |
| C-05 Patient Profile | Art 19 | 4) Screen Inventory | FR-WEB-001 |
| C-06 Summaries List | Art 19 | 4) Screen Inventory | CSP-002 |
| C-07 Summary Detail (Draft) | Art 19 | 4) Screen Inventory | CSP-002 |
| C-08 Recommendations Panel | Art 19 | 4) Screen Inventory | CSP-001, CSP-003 |
| C-09 Suppression Detail Modal | Art 19 | 4) Screen Inventory | CSP-003 |
| C-10 Treatment Plan Editor | Art 19 | 4) Screen Inventory | FR-WEB-005 |
| C-11 Memory Review | Art 19 | 4) Screen Inventory | FR-WEB-006 |
| C-12 Restricted Notes Surface | Art 19 | 4) Screen Inventory | CSP-005 |
| C-13 Exports Center | Art 19 | 4) Screen Inventory | CSP-005 |
| C-14 Settings | Art 19 | 4) Screen Inventory | FR-WEB-008 |
| **State Variants** | Art 19 | 6) State Variants Required | CSP-001..CSP-005 |
| System Status: NORMAL/DEGRADED | Art 18 | 8) State Taxonomy | Art 5 (Degraded Mode) |
| Safety Tiers: T0/T1/T2/T3 | Art 5 | 3) Safety Event Tiering | CSP-004 |
| Summary States: DRAFT/REVIEWED | Art 5 | 10) Summary Draft Lifecycle | CSP-002 |
| Recommendation: GENERATED/SUPPRESSED | Art 5 | 9) Hard Suppression | CSP-003 |
| Export Jobs: QUEUED/GENERATING/READY/BLOCKED | Art 14 | 4.1 Core Enums | CSP-005 |
| Voice States: UPLOADING/PROCESSING/COMPLETE | Art 14 | 4.1 Core Enums | FR-MOB-004 |
| **Policy UI Invariants** | | | |
| Draft Banner: "Draft — clinician review required" | Art 18 | 3) Copy Guardrails | CSP-002 |
| Suppression Banner + Reason Codes | Art 18 | 3) Copy Guardrails | CSP-003 |
| Portal Inbox Authority Display | Art 18 | 6.1 Portal Inbox | CSP-004 |
| Restricted Notes Surface Banner | Art 18 | 6.4 Restricted Notes | CSP-005 |
| Patient UI: No clinician-only content | Art 18 | 9) Accessibility + Safety | CSP-001 |
| **Design System Components** | Art 18 | 5-7) Component Library | Art 18 |
| GlobalSystemBanner (Degraded) | Art 18 | 5) Global Components | Art 5 |
| DraftBanner | Art 18 | 6.2 Draft Summaries | CSP-002 |
| SuppressionBanner | Art 18 | 6.3 Recommendations | CSP-003 |
| TierBadge (T0-T3) | Art 18 | 6.1 Portal Inbox | Art 5 |
| EvidencePanel | Art 18 | 6.2 Draft Summaries | FR-WEB-003 |
| TransparencyBlock | Art 18 | 6.3 Recommendations | CSP-001 |
| RestrictedSurfaceBanner | Art 18 | 6.4 Restricted Notes | CSP-005 |
| **Synthetic Data** | Art 20 | 2) Synthetic Dataset | All CSPs |
| Tenant: Sunrise Therapy Group | Art 20 | JSON Fixture | Demo Data |
| 5 Synthetic Patients (Alpha-Echo) | Art 20 | patients[] | Demo Data |
| Portal Inbox Items (pi_001-pi_003) | Art 20 | portal_inbox[] | CSP-004 |
| Voice Transcript (ve_001) | Art 20 | voice_transcripts[] | FR-MOB-004 |
| Summaries (sum_001 DRAFT, sum_002 REVIEWED) | Art 20 | summaries[] | CSP-002 |
| Recommendations (rec_001 SUPPRESSED, rec_002 GENERATED) | Art 20 | recommendations[] | CSP-003 |
| Restricted Note (rn_001) | Art 20 | restricted_notes[] | CSP-005 |
| Export Jobs (exp_001 READY, exp_002 BLOCKED) | Art 20 | exports[] | CSP-005 |

---

# B) TOOLCHAIN CHOICE + BUILD PATHS

## Path 1: Figma Clickable Prototype

### Steps:
1. Create Figma project with Design System library
2. Build component library per Art 18 (tokens, banners, badges)
3. Create frames for M-01..M-12 (iPhone 14/15, Pixel)
4. Create frames for C-01..C-14 (1440px desktop)
5. Wire interactions using Figma prototype mode
6. Populate with synthetic data from Art 20 JSON
7. Create component variants for all state combinations

### Pros:
- Fast visual iteration
- No code required
- Easy stakeholder review

### Cons:
- Not semi-interactive (no real state changes)
- Harder to demonstrate complex state transitions
- Static data only

## Path 2: Semi-Interactive Web Prototype (PRIMARY)

### Steps:
1. Initialize React + Vite + TypeScript project
2. Install React Router, Tailwind CSS, Lucide icons
3. Create synthetic data fixtures (Art 20 JSON)
4. Build mock API layer returning OpenAPI shapes (Art 14)
5. Implement route structure for patient/clinician paths
6. Build all screens M-01..M-12 and C-01..C-14
7. Create Demo Mode panel for state toggling
8. Implement CSP policy UI invariants
9. Build and deploy static export

### Pros:
- Semi-interactive (real state changes)
- Can demonstrate all state variants
- VC-demo presentable
- Shows technical feasibility

### Cons:
- Requires frontend development
- More time investment

## PRIMARY PATH SELECTED: Path 2 (Semi-Interactive Web Prototype)

**Rationale:** Path 2 provides a more compelling VC demo with actual interactivity, state transitions, and demonstrates technical execution capability while remaining faithful to the Packet specifications.

---

# C) STEP-BY-STEP BUILD INSTRUCTIONS

## Phase 0: Prerequisites

```bash
# Required tools:
- Node.js 18+
- npm or yarn
- Git
```

## Phase 1: Project Initialization

```bash
# Create project directory
mkdir -p /mnt/okcomputer/output/prototype-web
cd /mnt/okcomputer/output/prototype-web

# Initialize Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install
npm install react-router-dom lucide-react clsx tailwindcss postcss autoprefixer
npm install -D @types/react @types/react-dom

# Initialize Tailwind
npx tailwindcss init -p
```

## Phase 2: Configuration

### Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          draft: '#F59E0B',
          reviewed: '#10B981',
          suppressed: '#EF4444',
          alert_t1: '#3B82F6',
          alert_t2: '#F97316',
          alert_t3: '#DC2626',
          degraded: '#6B7280',
        },
        surface: {
          restricted: '#FEF3C7',
        }
      }
    },
  },
  plugins: [],
}
```

### Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Phase 3: Create File Structure

```
src/
├── data/
│   └── syntheticData.ts       # Art 20 fixtures
├── api/
│   └── mockApi.ts             # Art 14 shapes
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── patient/               # Patient screen components
│   └── clinician/             # Clinician screen components
├── screens/
│   ├── patient/               # M-01..M-12
│   └── clinician/             # C-01..C-14
├── hooks/
│   └── useDemoMode.ts         # Demo state management
├── types/
│   └── index.ts               # TypeScript types
├── App.tsx
└── main.tsx
```

## Phase 4: Implement Screens (Detailed per Screen)

### Patient Screens (M-01..M-12):
- M-01: Welcome + product boundary disclosure
- M-02: Consent acknowledgments
- M-03: Home dashboard with check-in/journal CTAs
- M-04: Journal composer (free text + prompts)
- M-05: Journal history list
- M-06: Check-in sliders (mood/stress/craving/energy)
- M-07: Check-in receipt
- M-08: Voice recorder
- M-09: Upload progress states
- M-10: Care plan activities
- M-11: Resources screen
- M-12: Settings

### Clinician Screens (C-01..C-14):
- C-01: Login + MFA
- C-02: Caseload dashboard
- C-03: Portal inbox list (T0-T3 badges)
- C-04: Portal inbox detail (ack/resolve)
- C-05: Patient profile tabs
- C-06: Summaries list (Draft/Reviewed filters)
- C-07: Summary detail with Draft banner
- C-08: Recommendations panel
- C-09: Suppression detail modal
- C-10: Treatment plan editor
- C-11: Memory review
- C-12: Restricted notes surface
- C-13: Exports center
- C-14: Settings

## Phase 5: Demo Mode Implementation

Create floating demo panel with toggles for:
- System Status: NORMAL / DEGRADED
- Safety Tier: T0 / T1 / T2 / T3
- Summary Status: DRAFT / REVIEWED
- Recommendation: GENERATED / SUPPRESSED
- Export Status: QUEUED / GENERATING / READY / BLOCKED
- Voice Status: UPLOADING / QUEUED / PROCESSING / COMPLETE

## Phase 6: Build and Deploy

```bash
# Build for production
npm run build

# Output in dist/ folder
# Deploy dist/ to static hosting
```

---

# D) ACTUAL BUILD OUTPUT

## File Tree

```
/prototype-web/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── data/
    │   └── syntheticData.ts
    ├── api/
    │   └── mockApi.ts
    ├── hooks/
    │   └── useDemoMode.ts
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Banner.tsx
    │   │   ├── DraftBanner.tsx
    │   │   ├── SuppressionBanner.tsx
    │   │   ├── TierBadge.tsx
    │   │   ├── EvidencePanel.tsx
    │   │   ├── TransparencyBlock.tsx
    │   │   └── RestrictedSurfaceBanner.tsx
    │   ├── patient/
    │   │   ├── BottomNav.tsx
    │   │   ├── JournalCard.tsx
    │   │   ├── CheckInCard.tsx
    │   │   ├── VoiceRecorder.tsx
    │   │   └── UploadProgress.tsx
    │   └── clinician/
    │       ├── Sidebar.tsx
    │       ├── InboxItem.tsx
    │       ├── SummaryCard.tsx
    │       ├── RecommendationCard.tsx
    │       └── ExportJobCard.tsx
    └── screens/
        ├── patient/
        │   ├── M01_Welcome.tsx
        │   ├── M02_Consent.tsx
        │   ├── M03_Home.tsx
        │   ├── M04_JournalComposer.tsx
        │   ├── M05_JournalHistory.tsx
        │   ├── M06_CheckIn.tsx
        │   ├── M07_CheckInReceipt.tsx
        │   ├── M08_VoiceRecorder.tsx
        │   ├── M09_VoiceProgress.tsx
        │   ├── M10_CarePlan.tsx
        │   ├── M11_Resources.tsx
        │   └── M12_Settings.tsx
        └── clinician/
            ├── C01_Login.tsx
            ├── C02_Caseload.tsx
            ├── C03_InboxList.tsx
            ├── C04_InboxDetail.tsx
            ├── C05_PatientProfile.tsx
            ├── C06_SummariesList.tsx
            ├── C07_SummaryDetail.tsx
            ├── C08_Recommendations.tsx
            ├── C09_SuppressionModal.tsx
            ├── C10_TreatmentPlan.tsx
            ├── C11_MemoryReview.tsx
            ├── C12_RestrictedNotes.tsx
            ├── C13_ExportsCenter.tsx
            └── C14_Settings.tsx
```

---

# E) PROTOTYPE QA CHECKLIST (SPEC-LOCK)

## Screen-by-Screen Checklist

### Patient Screens (M-01..M-12)
- [ ] M-01: Welcome shows product boundary disclosure
- [ ] M-01: "Not emergency replacement" disclaimer visible
- [ ] M-02: Consent acknowledgments displayed
- [ ] M-03: Home dashboard loads with navigation
- [ ] M-03: Degraded mode banner appears when toggled
- [ ] M-04: Journal composer accepts text input
- [ ] M-05: Journal history displays synthetic entries
- [ ] M-06: Check-in sliders functional
- [ ] M-07: Check-in receipt shows confirmation
- [ ] M-08: Voice recorder UI present
- [ ] M-09: Upload progress states animate
- [ ] M-10: Care plan activities list displays
- [ ] M-11: Resources screen accessible
- [ ] M-12: Settings accessible

### Clinician Screens (C-01..C-14)
- [ ] C-01: Login form + MFA simulation
- [ ] C-02: Caseload shows synthetic patients
- [ ] C-03: Portal inbox list shows T0-T3 badges
- [ ] C-04: Inbox detail shows evidence panel
- [ ] C-04: Acknowledge/resolve buttons functional
- [ ] C-05: Patient profile tabs navigate
- [ ] C-06: Summaries list shows Draft/Reviewed
- [ ] C-07: Draft banner always visible on Draft summaries
- [ ] C-07: Review action buttons functional
- [ ] C-08: Recommendations show generated/suppressed
- [ ] C-09: Suppression modal shows reason codes
- [ ] C-10: Treatment plan editor displays
- [ ] C-11: Memory review shows proposals
- [ ] C-12: Restricted notes separate surface
- [ ] C-12: Restricted surface banner visible
- [ ] C-13: Export center shows job statuses
- [ ] C-13: BLOCKED_POLICY state visible
- [ ] C-14: Settings accessible

## State Checklist

### System States
- [ ] NORMAL mode: no global banner
- [ ] DEGRADED mode: global banner visible

### Safety Tiers
- [ ] T0: Portal only, no email/SMS
- [ ] T1: Portal + email
- [ ] T2: Portal + email + optional SMS
- [ ] T3: Portal + email + SMS

### Summary States
- [ ] DRAFT: Draft banner visible
- [ ] REVIEWED: Reviewed badge visible
- [ ] REJECTED: Rejected state visible
- [ ] ESCALATED: Escalated state visible

### Recommendation States
- [ ] GENERATED: Full transparency block visible
- [ ] SUPPRESSED: Suppression banner + reason codes

### Export States
- [ ] QUEUED: Progress indicator
- [ ] GENERATING: Progress indicator
- [ ] READY: Download available
- [ ] EXPIRED: Expired state
- [ ] BLOCKED_POLICY: 428 error visible

### Voice States
- [ ] UPLOADING: Progress bar
- [ ] QUEUED: Queue position
- [ ] PROCESSING: Processing indicator
- [ ] COMPLETE: Transcript available
- [ ] FAILED: Retry option

## Policy Invariant Checklist (CSP-001..CSP-005)

### CSP-001: Decision Support Policy
- [ ] Patient UI NEVER shows clinician-only recommendations
- [ ] Patient UI NEVER shows suppression reason codes
- [ ] Patient UI NEVER shows internal confidence values
- [ ] Patient UI NEVER shows clinician-only rationale
- [ ] No diagnosis UI in patient screens
- [ ] No medication recommendation UI
- [ ] "Not emergency replacement" visible

### CSP-002: Draft Summary Policy
- [ ] All Draft summaries show "Draft — clinician review required" banner
- [ ] Draft label persists until reviewed
- [ ] Review action required to promote state
- [ ] No auto-promotion from Draft

### CSP-003: Recommendation Suppression Policy
- [ ] Suppressed recommendations show reason codes
- [ ] Suppressed recommendations show remediation steps
- [ ] Suppression visible in clinician UI
- [ ] No silent suppression

### CSP-004: Notification/Alert Channel Policy
- [ ] Portal inbox is authoritative
- [ ] Email/SMS/push shown as "nudges" only
- [ ] Acknowledge/resolve only in portal
- [ ] Delivery status visible (sent/failed)

### CSP-005: Restricted Surface and Data Class Separation
- [ ] Restricted notes separate surface
- [ ] Restricted notes excluded from standard exports
- [ ] Restricted surface banner visible
- [ ] Export blocked policy (428) when confirmation missing

## MUST NOT EXIST List
- [ ] NO real PHI in any data
- [ ] NO real patient names
- [ ] NO real clinician identities
- [ ] NO actual API calls to LLM/ASR providers
- [ ] NO diagnosis UI in patient screens
- [ ] NO medication recommendation UI
- [ ] NO "AI therapist" positioning
- [ ] NO autonomous therapy claims
- [ ] NO emergency replacement claims
- [ ] NO clinician-only content in patient routes
- [ ] NO suppression reason codes in patient routes
- [ ] NO restricted notes in patient routes
- [ ] NO internal confidence in patient routes

---

# F) VC DEMO SCRIPT (10–12 Minutes)

## Opening (1 min)
"This is a clinician-supervised behavioral health AI companion—not an autonomous therapist. It extends care between sessions while preserving clinical judgment and safety boundaries."

## Demo Flow

### Scenario A: Patient Onboarding (2 min)
1. Show M-01 Welcome: "Product boundaries clearly stated—not emergency replacement"
2. Show M-02 Consent: "Middle-ground consent model for adults 18+"
3. Show M-03 Home: "Patient dashboard with check-ins, journaling, care plan"

### Scenario B: Patient Journaling + Voice (2 min)
1. Show M-04 Journal Composer: "Structured prompts + free text"
2. Show M-08 Voice Recorder: "Async voice reduces friction"
3. Show M-09 Upload Progress: "Processing states visible to patient"

### Scenario C: Clinician Portal + Caseload (1 min)
1. Show C-01 Login + MFA: "Secure clinician access"
2. Show C-02 Caseload: "Patient list with alert indicators"

### Scenario D: Portal Inbox Authority (2 min) - CSP-004
1. Show C-03 Inbox List: "T2 alert for Patient Bravo"
2. Show C-04 Inbox Detail: "Evidence panel + delivery nudges"
3. Demonstrate: "Email/SMS are nudges—acknowledge only in portal"
4. Toggle Demo Mode: Show T1, T2, T3 variations

### Scenario E: Draft Summary Review (2 min) - CSP-002
1. Show C-06 Summaries List: "Draft vs Reviewed filter"
2. Show C-07 Summary Detail: "Draft banner always visible"
3. Show Evidence Panel: "Segment-level references"
4. Demonstrate: "Review actions—clinician judgment preserved"

### Scenario F: Suppression Transparency (2 min) - CSP-003
1. Show C-08 Recommendations: "Generated vs Suppressed cards"
2. Show C-09 Suppression Modal: "Reason codes + remediation"
3. Explain: "Hard suppression under uncertainty—never hidden"

### Scenario G: Restricted Notes + Export Controls (1 min) - CSP-005
1. Show C-12 Restricted Notes: "Separate surface, special handling"
2. Show C-13 Exports: "Standard export excludes restricted notes"
3. Show BLOCKED_POLICY: "428 when confirmation missing"

### Closing (1 min)
"This prototype demonstrates our safety-first approach: Draft-by-default summaries, transparent suppression, portal-authoritative workflows, and strict separation of clinician-only content. All built on a synthetic dataset with no PHI—ready for pilot with 200+ clinicians."

---

# G) RED TEAM HARDENING PASS

## Potential Drift/Violation Risks

### Risk 1: Patient Route Data Leak
**Threat:** Clinician-only content accidentally included in patient route data
**Mitigation:** Separate data fixtures for patient vs clinician; role-based filtering in mock API

### Risk 2: Suppression Not Visible
**Threat:** Suppressed recommendations appear as "missing" rather than "suppressed"
**Mitigation:** Explicit SuppressionBanner component; reason codes always displayed

### Risk 3: Draft Label Hidden
**Threat:** Draft banner could be hidden by CSS or scrolling
**Mitigation:** Fixed position banner; cannot be dismissed

### Risk 4: Export Policy Bypass
**Threat:** Export could be generated without confirmation
**Mitigation:** BLOCKED_POLICY state enforced; 428 error displayed

### Risk 5: Demo Mode Confusion
**Threat:** Demo toggles could be mistaken for real functionality
**Mitigation:** Clear "DEMO MODE" labeling; toggle panel visually distinct

## Patches Applied
1. Role-based route guards in App.tsx
2. Explicit suppression UI components
3. Fixed Draft banner positioning
4. Export confirmation enforcement
5. Demo mode visual distinction

---

# H) ROUNDTABLE EXPERT REVIEW + INTEGRATED IMPROVEMENTS

## Expert 1: Healthcare UX Product Designer
**Feedback:** "Ensure color-blind accessibility for tier badges"
**Improvement:** Added icons to all tier badges (T0-T3); not color-only

## Expert 2: Clinical Safety Lead
**Feedback:** "Draft banner must be persistent and non-dismissible"
**Improvement:** Fixed DraftBanner component; cannot be closed

## Expert 3: Security Architect (HIPAA/ePHI)
**Feedback:** "Ensure no PHI in browser console or localStorage"
**Improvement:** No localStorage usage; synthetic data only; console warnings added

## Expert 4: VC Partner
**Feedback:** "Make the safety moat more visible in demo"
**Improvement:** Added Demo Mode panel with explicit CSP toggle demonstrations

## Expert 5: Senior Frontend Engineer
**Feedback:** "Component structure should scale to real implementation"
**Improvement:** Aligned component structure with Art 14 API shapes; mock API layer

## Expert 6: Healthcare Procurement/Sales Lead
**Feedback:** "Need clear ROI narrative in demo"
**Improvement:** Added time-savings indicators in summary review; workflow efficiency emphasis

---

# I) FINAL REVIEW-READY OUTPUT

## How to Run Locally

```bash
cd /mnt/okcomputer/output/prototype-web
npm install
npm run dev
# Open http://localhost:5173
```

## How to Build Static Demo

```bash
cd /mnt/okcomputer/output/prototype-web
npm run build
# Output in dist/ folder
# Deploy dist/ to any static hosting (Netlify, Vercel, S3)
```

## Demo Instructions

1. **Start Demo:** Run locally or open deployed URL
2. **Demo Mode Panel:** Look for floating panel in bottom-right
3. **Toggle States:** Use toggles to demonstrate different states
4. **Patient Flow:** Click "Patient View" to see patient screens
5. **Clinician Flow:** Click "Clinician View" to see portal
6. **Key Demos:**
   - Toggle DEGRADED mode to show global banner
   - Toggle T2/T3 to show safety tier variations
   - Toggle SUPPRESSED to show suppression UI
   - Toggle BLOCKED_POLICY to show export blocking

## Synthetic Dataset Location

**File:** `src/data/syntheticData.ts`

Contains all synthetic data per Artifact 20:
- Tenant: Sunrise Therapy Group (Synthetic)
- 2 Clinicians (Dr. Rivera, Dr. Chen)
- 5 Patients (Alpha, Bravo, Charlie, Delta, Echo)
- Portal inbox items with T0-T3 tiers
- Voice transcript with segment-level refs
- Draft and Reviewed summaries
- Generated and Suppressed recommendations
- Restricted notes
- Export jobs (READY and BLOCKED)

## Screens Implemented

### Patient Routes (`/patient/*`)
- `/patient/welcome` - M-01
- `/patient/consent` - M-02
- `/patient/home` - M-03
- `/patient/journal` - M-04
- `/patient/history` - M-05
- `/patient/checkin` - M-06
- `/patient/checkin/receipt` - M-07
- `/patient/voice` - M-08
- `/patient/voice/progress` - M-09
- `/patient/careplan` - M-10
- `/patient/resources` - M-11
- `/patient/settings` - M-12

### Clinician Routes (`/clinician/*`)
- `/clinician/login` - C-01
- `/clinician/caseload` - C-02
- `/clinician/inbox` - C-03
- `/clinician/inbox/:id` - C-04
- `/clinician/patient/:id` - C-05
- `/clinician/summaries` - C-06
- `/clinician/summary/:id` - C-07
- `/clinician/recommendations` - C-08
- `/clinician/treatment-plan` - C-10
- `/clinician/memory` - C-11
- `/clinician/restricted-notes` - C-12
- `/clinician/exports` - C-13
- `/clinician/settings` - C-14

## CSP-001..CSP-005 Confirmation

- [x] CSP-001: Patient routes filtered; no clinician-only content
- [x] CSP-002: Draft banner persistent on all Draft summaries
- [x] CSP-003: Suppression reason codes + remediation visible
- [x] CSP-004: Portal inbox authority; email/SMS as nudges
- [x] CSP-005: Restricted notes separate; export blocking enforced

---

**Build Complete.**
