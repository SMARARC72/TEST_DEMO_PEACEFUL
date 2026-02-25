# VC Demo Script - Behavioral Health AI Companion
## 10-12 Minute Presentation

---

## Opening (1 minute)

**Presenter:** "Good morning. I'm presenting a clinician-supervised behavioral health AI companion—not an autonomous therapist. This platform extends care between sessions while preserving clinical judgment and safety boundaries.

Our moat is safety-first design: Draft-by-default summaries, transparent suppression, portal-authoritative workflows, and strict separation of clinician-only content. All built on a synthetic dataset with no PHI—ready for pilot with 200+ clinicians."

---

## Scenario A: Patient Onboarding (2 minutes)

**Action:** Navigate to Patient View → Welcome screen

**Script:**
"Let's start with the patient experience. When a patient first opens the app, they see clear product boundaries—this is not an emergency replacement, not a diagnosis tool, not a medication recommender.

The consent flow uses a middle-ground model for adults 18+. Patients acknowledge that their entries will be visible to their clinician, that AI-generated summaries require clinician review, and that voice entries will be transcribed.

This establishes trust and sets appropriate expectations from day one."

**Key Points:**
- M-01 Welcome: Product boundary disclosure visible
- M-02 Consent: Multi-step acknowledgment required
- CSP-001 compliance: No diagnosis/medication UI

---

## Scenario B: Patient Daily Engagement (2 minutes)

**Action:** Navigate through Home → Check-in → Journal → Voice

**Script:**
"The patient dashboard provides structured prompts: daily check-ins with mood/stress/energy sliders, journaling with free text and prompts, and async voice recording for when typing is inconvenient.

Let me show the check-in flow—patients rate their mood, stress, and energy levels. This data feeds into the clinician dashboard but is never presented as a diagnosis.

The voice feature reduces friction for patients who prefer speaking. The upload progress shows real-time status—uploading, queued, processing, complete."

**Demo Mode Toggle:** Show different voice states (UPLOADING → PROCESSING → COMPLETE)

**Key Points:**
- M-03 Home: Clear CTAs for engagement
- M-06 Check-in: Structured data collection
- M-08 Voice: Async recording with progress states

---

## Scenario C: Clinician Portal + Caseload (1 minute)

**Action:** Switch to Clinician View → Login → Caseload

**Script:**
"Now let's switch to the clinician perspective. After MFA authentication, clinicians see their caseload with visual indicators for patients needing attention.

Patient Bravo has an open alert—let's see what that looks like in the portal inbox."

**Key Points:**
- C-01 Login: MFA simulation
- C-02 Caseload: Alert indicators on patient cards

---

## Scenario D: Portal Inbox Authority (2 minutes) - CSP-004

**Action:** Navigate to Portal Inbox → Open T2 Alert

**Script:**
"This is our portal inbox—the authoritative workflow for safety events. Notice the tier badges: T0 for routine notifications, T1 for portal-only alerts, T2 for portal plus email and SMS, T3 for crisis escalation.

Patient Bravo has a T2 alert. The evidence panel shows the voice transcript segment that triggered this—segment seg_02 where the patient expressed concern about relapse but also used coping strategies.

**Critical point:** Email and SMS are nudges only. The delivery status shows they were sent, but acknowledge and resolve actions only happen in the portal. This ensures the clinician has full context before taking action.

Let me demonstrate the tier variations using demo mode..."

**Demo Mode Toggle:** Show T0, T1, T2, T3 variations

**Key Points:**
- C-03 Inbox List: Tier badges (T0-T3) with icons
- C-04 Inbox Detail: Evidence panel + delivery nudges
- CSP-004: Portal authoritative; email/SMS secondary

---

## Scenario E: Draft Summary Review (2 minutes) - CSP-002

**Action:** Navigate to Summaries → Open Draft Summary

**Script:**
"All AI-generated summaries default to Draft status. This is non-negotiable—no automatic promotion to Reviewed.

Here's a journal digest for Patient Bravo. The Draft banner is always visible: 'Draft — clinician review required.' This cannot be dismissed.

The evidence panel shows segment-level references—every claim in the summary links back to source data. Clinicians can mark as Reviewed, Use with Caution, Retain Draft, or Reject.

Let me toggle between Draft and Reviewed states..."

**Demo Mode Toggle:** DRAFT → REVIEWED

**Key Points:**
- C-06 Summaries List: Draft/Reviewed filter
- C-07 Summary Detail: Persistent Draft banner
- CSP-002: No auto-promotion; clinician review required

---

## Scenario F: Suppression Transparency (2 minutes) - CSP-003

**Action:** Navigate to Recommendations

**Script:**
"Our recommendation engine has hard suppression rules. When uncertainty is high, we suppress rather than guess.

Patient Bravo's recommendation was suppressed for three reasons: there's an open T2 event, ASR confidence was low due to background noise, and there's an unreviewed draft summary.

The clinician sees the exact reason codes and remediation steps: acknowledge the T2 event, review the draft summary, verify the transcript with audio. Nothing is hidden.

Compare this to Patient Charlie—when conditions are met, the recommendation is generated with full transparency: why now, known unknowns, confidence level, and caution flags."

**Demo Mode Toggle:** SUPPRESSED → GENERATED

**Key Points:**
- C-08 Recommendations: Generated vs Suppressed cards
- CSP-003: Reason codes + remediation always visible

---

## Scenario G: Restricted Notes + Export Controls (1 minute) - CSP-005

**Action:** Navigate to Restricted Notes → Exports Center

**Script:**
"Restricted notes are a separate surface with special handling. They're excluded from standard exports by default and require separate permissions.

In the export center, standard clinician exports don't include restricted notes. For segmented exports—like SUD treatment records—we require confirmation that segmentation is appropriate. If confirmation is missing, the export is blocked with a 428 PRECONDITION_REQUIRED error.

This ensures compliance with 42 CFR Part 2 and other regulations."

**Demo Mode Toggle:** Show BLOCKED_POLICY state

**Key Points:**
- C-12 Restricted Notes: Separate surface with banner
- C-13 Exports: Policy-controlled with 428 blocking
- CSP-005: Restricted notes excluded by default

---

## Scenario H: Degraded Mode (1 minute)

**Action:** Toggle DEGRADED mode

**Script:**
"Finally, let me show our degraded mode. When LLM or ASR providers experience issues, the system enters degraded mode. A global banner appears, and safety workflows are prioritized over non-essential features.

This ensures the platform remains safe even when core AI services are unavailable."

**Demo Mode Toggle:** NORMAL → DEGRADED

**Key Points:**
- Global degraded mode banner
- Safety workflows prioritized

---

## Closing (1 minute)

**Script:**
"To summarize our safety moat:

1. **CSP-001** - Decision Support Policy: Patient UI never shows clinician-only content. No diagnosis, no medication recommendations.

2. **CSP-002** - Draft Summary Policy: All summaries default to Draft. Clinician review required before promotion.

3. **CSP-003** - Suppression Policy: Hard suppression under uncertainty. Reason codes and remediation always visible.

4. **CSP-004** - Portal Authority: Inbox is authoritative. Email/SMS are nudges only.

5. **CSP-005** - Restricted Surface: Separate handling for sensitive notes. Export controls enforce policy.

This prototype demonstrates our commitment to safety-first design. All data is synthetic—no PHI. Ready for pilot with 200+ clinicians across TX, VA, FL, AZ, NC.

Thank you. Questions?"

---

## Demo Mode Quick Reference

| Toggle | States | Demo Purpose |
|--------|--------|--------------|
| System Status | NORMAL / DEGRADED | Show global banner behavior |
| Safety Tier | T0 / T1 / T2 / T3 | Show notification channel variations |
| Summary Status | DRAFT / REVIEWED | Show CSP-002 enforcement |
| Recommendation | GENERATED / SUPPRESSED | Show CSP-003 enforcement |
| Export Status | READY / BLOCKED_POLICY | Show CSP-005 enforcement |
| Voice Status | UPLOADING → COMPLETE | Show async processing states |

---

## Safety Guardrails (Artifact 12)

**During demo, never say:**
- "AI therapist" or "AI replaces clinicians"
- "Diagnoses patients" or "prescribes treatment"
- "Emergency services" or "crisis intervention"
- "100% accurate" or "guaranteed results"

**Always say:**
- "Clinician-supervised" or "extends care between sessions"
- "Decision support" or "assists clinicians"
- "Not emergency replacement" or "call 911 for emergencies"
- "Draft requires review" or "clinician judgment preserved"
