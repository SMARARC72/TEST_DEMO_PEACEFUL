# Next Feature Pass — AI Communication Surfaces for Patient Submissions

## 1) Parity + Gap Audit
| Flow area | Existing behavior | Target behavior | Reuse points | Risk/duplication notes |
|---|---|---|---|---|
| Patient journal submit | Save action showed draft toast and returned home | Submission success screen + patient-facing AI reflection | Existing `patient-journal`, `saveJournal`, toast pattern | Avoid duplicating check-in or draft-review state |
| Patient voice upload | Upload toast and return home | Submission success screen + patient-facing AI reflection for voice memo | Existing `patient-voice`, `uploadVoice`, record/upload controls | Ensure no clinician-only fields appear in patient view |
| Clinician internal visibility | Draft review/inbox already clinician-facing | Add explicit compare view for patient-safe vs clinician-internal outputs | Existing clinician workflow routes, badges, and banner patterns | Keep internal fields out of patient route surfaces |

## 2) Implemented capability
- Added `patient-submission-success` screen for successful journal/voice submissions.
- Added `ai-communication-compare` screen with explicit clinician-only banner and side-by-side patient vs clinician outputs.
- Added deterministic state model:
  - `baselineSubmissionState`
  - `processSubmission`
  - `renderSubmissionSurfaces`
  - `resetSubmissionState`
- Updated `saveJournal()` and `uploadVoice()` to transition lifecycle from submission to clinician-visible output.
- Updated `resetDemo` to restore submission/report baseline deterministically.

## 3) Red-team hardening pass and patches
1. Boundary leak risk
   - Check: patient submission screen should not include clinician evidence/unknowns.
   - Patch: clinician-only details rendered exclusively in `ai-communication-compare` with explicit internal banner.
2. Claim hygiene
   - Check: no diagnosis/autonomous therapy claims in patient response.
   - Patch: bounded language and emergency disclaimer retained.
3. Confidence theater
   - Check: avoid numeric confidence percentages.
   - Patch: qualitative signal band only in clinician internal panel.
4. Deterministic replay
   - Check: repeated demos can reset baseline.
   - Patch: `resetSubmissionState()` wired into `resetDemo`.

## 4) Validation summary
- Build and lint pass.
- Browser assertions pass for:
  - journal success routing,
  - voice success routing,
  - patient response rendering,
  - clinician comparison rendering,
  - reset behavior,
  - C-11/C-10/enterprise route regression visibility.
