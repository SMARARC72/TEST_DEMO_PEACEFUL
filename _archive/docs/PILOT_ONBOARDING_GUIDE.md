# PeaceFull — Pilot Clinician Onboarding Guide

**Welcome to the PeaceFull pilot!** This guide will help you log in, navigate the platform, and start working with your pilot patients.

---

## 1. Getting Started

### Login URL
**https://peacefull.netlify.app/login**

### Your Credentials

| Email | Role |
|-------|------|
| `pilot.clinician.1@peacefull.cloud` | Clinician |
| `pilot.clinician.2@peacefull.cloud` | Clinician |
| `pilot.supervisor@peacefull.cloud` | Supervisor |

**Temporary password:** `Pilot2026!Change`

> ⚠️ **IMPORTANT:** Change your password immediately after first login. Navigate to **Settings → Security → Change Password**.

### MFA Setup
Multi-factor authentication (TOTP) is enabled for all clinician accounts. On first login:
1. You'll be prompted to set up MFA
2. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
3. Enter the 6-digit code to verify

---

## 2. Platform Overview

### Clinician Dashboard
After login, you'll see your dashboard with:
- **Active Patients** — Your assigned caseload with signal badges (LOW/MODERATE/ELEVATED/GUARDED)
- **Triage Queue** — Items requiring your attention, sorted by priority
- **AI Drafts** — AI-generated session notes and clinical summaries for your review
- **Escalations** — Crisis alerts and high-priority items

### Key Navigation
| Section | Description |
|---------|-------------|
| Dashboard | Overview of your caseload and pending items |
| Patients | Full patient list with profiles, check-in history, and journals |
| Triage | Review and acknowledge incoming patient submissions |
| AI Drafts | Review, approve, or edit AI-generated clinical documents |
| Escalations | Crisis alerts and safety-critical items |
| Session Notes | Create and manage session notes with AI assistance |
| Settings | Account settings, password change, MFA management |

---

## 3. Your Pilot Patients

You have 5 test patient accounts pre-assigned across the care team:

| Patient | Email | Assigned To |
|---------|-------|-------------|
| Test Patient-1 | `test.patient.1@peacefull.cloud` | Clinician-1 |
| Test Patient-2 | `test.patient.2@peacefull.cloud` | Clinician-1 |
| Test Patient-3 | `test.patient.3@peacefull.cloud` | Clinician-2 |
| Test Patient-4 | `test.patient.4@peacefull.cloud` | Clinician-2 |
| Test Patient-5 | `test.patient.5@peacefull.cloud` | Supervisor |

> These accounts use password `Pilot2026!Change` and can be used to test the patient experience (check-ins, journals, AI chat).

---

## 4. Key Workflows

### Reviewing a Patient Check-In
1. Go to **Triage** → you'll see incoming check-ins
2. Click a triage item to view the details
3. Click **Acknowledge** to mark it reviewed
4. After review, click **Resolve** to close the item

### Reviewing AI Drafts
1. Go to **AI Drafts** → see AI-generated documents
2. Click a draft to read the full content
3. Choose **Approve** (publish as-is), **Edit** (modify before publishing), or **Reject** (discard)

### Creating Session Notes
1. Go to **Session Notes** → click **New Session Note**
2. Fill in: session date, duration, CPT code
3. Use AI-assisted sections: subjective, objective, assessment, plan
4. Save and finalize

### Viewing Escalations
1. Go to **Escalations** → see crisis alerts
2. Items are color-coded by severity
3. Follow the safety protocol for each escalation type

---

## 5. AI Features

PeaceFull uses **Claude** (Anthropic) for AI-powered clinical assistance:
- **Session note drafting** — AI generates structured notes from your input
- **Clinical summaries** — AI summarizes patient check-in trends
- **Chat support** — Patients can use AI chat for between-session support (you can review transcripts)

> All AI outputs are drafts requiring clinician review before becoming part of the clinical record.

---

## 6. Security & Compliance

- **Encryption:** All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- **HIPAA:** Platform designed for HIPAA compliance
- **Audit logging:** All actions are logged with timestamp, user ID, and tenant scope
- **Session timeout:** Sessions expire after inactivity
- **MFA required:** All clinician accounts require TOTP

---

## 7. Support

| Issue | Contact |
|-------|---------|
| Login problems | support@peacefull.cloud |
| Technical issues | support@peacefull.cloud |
| Clinical questions | pilot.supervisor@peacefull.cloud |
| Security concerns | security@peacefull.cloud |

---

**Thank you for participating in the PeaceFull pilot!** Your feedback is essential to improving the platform for mental health clinicians everywhere.
