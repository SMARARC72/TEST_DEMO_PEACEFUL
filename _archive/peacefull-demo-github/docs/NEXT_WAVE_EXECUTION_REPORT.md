# Next-Wave Master Prompt Execution Report

Scope executed against current demo implementation with emphasis on patient uplift, non-distracting investor value signals, and hardening.

## 1) Executive Snapshot
- Core platform integrity is strong: 30 interactive screens, 86 nav links, and no missing nav targets.
- Current demo storytelling is clinician-heavy; patient continuity and emotional guidance can be materially improved.
- Navigation improvements shipped recently; next gain is context-aware wayfinding (where am I / what next).
- Accessibility is the largest quality gap: many controls lack assistive metadata and explicit form semantics.
- Policy boundaries are clear and mostly preserved, but can be made more explicit in patient-facing microcopy.
- Investor narrative is credible on safety/compliance, but underdeveloped on patient engagement and retention proof.
- Technical risk is moderate-low for UI/IA enhancements, higher for anything touching state/event orchestration.
- Red-team review found highest risk in trust-friction and overclaim ambiguity, not classic security exploitability.
- Highest ROI near-term path: patient continuity features + lightweight proof tiles + accessibility hardening.
- Non-negotiable: preserve clinician-supervised model and CSP boundaries while adding patient value.

## 2) Baseline Map

### Screen Inventory (Current)
- Total screens detected: 30
- Key patient screens: `landing`, `patient-welcome`, `patient-consent`, `patient-home`, `patient-journal`, `patient-checkin`, `patient-voice`, `patient-submission-success`, `patient-settings`
- Key clinician/governance screens: `clinician-login`, `clinician-mfa`, `clinician-caseload`, `clinician-inbox`, `inbox-detail`, `draft-review`, `restricted-notes`, `exports-center`, `suppression-ui`, `roi-dashboard`, `enterprise-governance`, `security-command-center`, `decision-room`

### Transition Highlights (Observed)
- `landing` → patient/clinician entry + posture/script/ROI/governance
- Patient flow mostly hub-and-spoke around `patient-home`
- Clinician flow mostly hub-and-spoke around `clinician-caseload`
- Investor flow exists across `demo-script`, `roi-dashboard`, `enterprise-governance`, `decision-room`

### Current Invariants (Policy + Behavior)
- Human-in-the-loop posture preserved
- Suppression transparency shown on clinician side
- Portal authority pattern retained
- Restricted surface/export segmentation retained
- Synthetic-data posture retained

### Verification Baseline
- Unit tests: 27/27 passing (`vitest run`)
- Navigation integrity: no missing targets, no duplicate IDs

## 3) Gap Analysis Matrix

| Dimension | Severity | Current Gap | Risk | Next Action |
|---|---|---|---|---|
| Accessibility semantics | High | Buttons/inputs lack robust aria/labeling patterns | Exclusion + compliance perception risk | P0 a11y metadata pass |
| Patient continuity | High | Limited between-session momentum cues | Lower adherence narrative | Add streak/progress/small-win surfaces |
| Emotional UX confidence | Medium-High | Supportive tone exists but is sparse | Trust erosion under stress moments | Add reassurance/microcopy framework |
| Wayfinding clarity | Medium | Strong nav exists, weak “next best step” per screen | Decision fatigue | Add screen-level contextual next actions |
| Investor evidence compactness | Medium | Signals exist but are distributed and verbose | Demo pacing risk | Add concise proof strip + KPI snapshot |
| ROI defensibility | Medium | Assumptions visible but no confidence ranges | Overclaim interpretation risk | Add range bands + assumption sensitivity |
| Security/trust cues in patient flow | Medium | Mostly clinician-side hardening visibility | Patient trust under-served | Add patient-safe trust indicators |
| Maintainability | Medium | Large single-file surfaces remain complex | Future regression risk | Incremental modular extraction roadmap |
| Data boundary clarity | Low-Med | Mostly clear, sometimes implicit | Misinterpretation risk | Add explicit role labels on critical surfaces |
| Mobile scanability | Medium | Dense cards in some screens | Comprehension drop on small screens | Tighten hierarchy and spacing in dense views |

## 4) Patient Experience Opportunity Map

### A) Immediate Comfort & Trust
1. Session-safe reassurance banner per patient screen
- Why: Reduces anxiety and clarifies scope
- Impact: High | Complexity: S | Regression: Low | Demo-safe: Now

2. “What happens next” panel after each submission
- Why: Reduces uncertainty after journaling/voice
- Impact: High | Complexity: S | Regression: Low | Demo-safe: Now

3. Calm-state UI mode toggle (visual simplification)
- Why: Supports distressed users without changing logic
- Impact: Medium | Complexity: M | Regression: Low | Demo-safe: Next

4. Inline crisis escalation clarification block
- Why: Improves safety literacy in patient surfaces
- Impact: High | Complexity: S | Regression: Low | Demo-safe: Now

### B) Continuity & Adherence
5. Personal streak/progress summary card
- Why: Reinforces follow-through
- Impact: High | Complexity: M | Regression: Low | Demo-safe: Now

6. “Last clinician-reviewed moment” timeline item
- Why: Strengthens supervised-care confidence
- Impact: Medium-High | Complexity: M | Regression: Medium | Demo-safe: Next

7. Goal-of-the-week micro-plan card
- Why: Improves continuity between sessions
- Impact: High | Complexity: M | Regression: Medium | Demo-safe: Next

8. Check-in reminders summary (patient-visible schedule)
- Why: Reduces missed entries
- Impact: Medium | Complexity: S | Regression: Low | Demo-safe: Now

### C) Engagement & Habit Reinforcement
9. Reflection prompt carousel (non-clinical, supportive)
- Why: Increases journaling completion
- Impact: Medium | Complexity: S | Regression: Low | Demo-safe: Now

10. Micro-achievement badges (consistency, completion)
- Why: Motivational loop without gamification overload
- Impact: Medium | Complexity: M | Regression: Low | Demo-safe: Next

11. Voice-note preparation tips before record
- Why: Improves data quality + user comfort
- Impact: Medium | Complexity: S | Regression: Low | Demo-safe: Now

### D) Safety Escalation Clarity
12. Patient-friendly explanation of clinician review timing
- Why: Prevents false immediacy expectations
- Impact: High | Complexity: S | Regression: Low | Demo-safe: Now

13. Safety tier plain-language explainer (patient version)
- Why: Trust and transparency without clinical leakage
- Impact: Medium-High | Complexity: M | Regression: Medium | Demo-safe: Next

14. “You are not alone” guided resources card with structured actions
- Why: Better support orientation during distress
- Impact: High | Complexity: S | Regression: Low | Demo-safe: Now

### Top 5 Immediate (Now)
- What happens next panel
- Session-safe reassurance banner
- Crisis escalation clarification block
- Reflection prompt carousel
- Patient review-timing explainer

### Top 5 Next Phase
- Goal-of-the-week micro-plan
- Last clinician-reviewed moment timeline
- Calm-state UI mode
- Safety tier plain-language explainer
- Micro-achievement badges

## 5) Investor/VC Enhancement Set (Non-Distracting)

1. Compact “Proof Strip” on landing (Safety, Compliance, Pilot-readiness)
- Why investor cares: rapid de-risk signal
- Placement: below hero CTA
- Max surface: 1 row, 3 chips
- Distraction mitigation: no deep copy on landing

2. Pilot KPI snapshot (adoption, completion, review latency)
- Why: validates operational feasibility
- Placement: ROI dashboard top card
- Max surface: 3 metrics
- Mitigation: link to details instead of expansion

3. Assumption confidence bands (low/base/high)
- Why: reduces overclaim risk
- Placement: ROI assumptions drawer
- Max surface: 1 mini table
- Mitigation: keep formulas primary

4. Risk controls coverage meter (CSP coverage)
- Why: governance maturity cue
- Placement: compliance posture header
- Max surface: 1 progress line
- Mitigation: no extra modal

5. Time-to-value storyboard chip (week 1 / week 4 / week 12)
- Why: deployment realism
- Placement: demo script intro panel
- Max surface: 3 chips
- Mitigation: static labels only

6. Workflow reliability signal (state integrity checks passed)
- Why: execution confidence
- Placement: decision room summary
- Max surface: 2 lines
- Mitigation: no technical dump

7. Data-boundary assurance card (patient vs clinician views)
- Why: trust/compliance de-risk
- Placement: suppression screen footer
- Max surface: single card
- Mitigation: brief wording

8. Go-live readiness checklist snippet
- Why: investment readiness
- Placement: enterprise governance
- Max surface: 5 items max
- Mitigation: collapsed by default

9. Retention hypothesis panel (what improves patient return)
- Why: growth thesis support
- Placement: ROI dashboard secondary area
- Max surface: 3 bullets
- Mitigation: no speculative numbers without ranges

10. Competitive moat summary chip set (human-supervised + policy-locked)
- Why: differentiation
- Placement: landing secondary CTA area
- Max surface: 3 chips
- Mitigation: avoid competitor names

## 6) Roundtable Expert Analysis

### Behavioral Clinician Advisor
- Top concerns: patient uncertainty post-submission; insufficient expectation setting
- Top recommendations: clear follow-up timing, human-review status cues, supportive language templates
- Risk if ignored: reduced trust and lower disclosure quality
- Confidence: High

### Patient Experience Researcher
- Top concerns: friction in distressed states, limited continuity cues
- Top recommendations: progress continuity, low-cognitive-load prompts, calm-state pattern
- Risk if ignored: drop-off after first use
- Confidence: High

### Healthcare Compliance/Risk Lead
- Top concerns: implicit boundaries not always explicit in patient text
- Top recommendations: role labels, no-override policy messaging, transparent escalation explanation
- Risk if ignored: interpretation risk during demos/audits
- Confidence: High

### Security Red-Team Engineer
- Top concerns: trust-manipulation vectors via ambiguous wording, weak semantic affordances
- Top recommendations: explicit claims boundaries, integrity indicators, route-target validation checks retained
- Risk if ignored: reputational exploit via misleading interpretation
- Confidence: Medium-High

### Product Design Lead
- Top concerns: inconsistent hierarchy in dense screens; limited “next best action” cues
- Top recommendations: context CTA patterns, scan-friendly spacing, patient-first microcopy system
- Risk if ignored: navigation effort remains high
- Confidence: High

### GTM/Investor Strategy Lead
- Top concerns: proof points are present but fragmented
- Top recommendations: concise proof strip, confidence-band ROI framing, pilot-readiness mini checklist
- Risk if ignored: narrative feels feature-rich but thesis-light
- Confidence: High

## 7) Red-Team Hardening Findings

### Iteration 1: Structural and Routing Integrity
- Finding: hash/deep-link behavior must remain deterministic across all major screens
- Severity: Medium
- Exploit/failure path: stale hash + missing fallback can create perceived broken route
- Mitigation: keep validated hash routing + fallback to landing
- Residual risk: Low

- Finding: large single-file screen surfaces increase regression blast radius
- Severity: Medium
- Exploit/failure path: unrelated edits can break hidden edge flow
- Mitigation: phased modular extraction of patient-only views first
- Residual risk: Medium-Low

### Iteration 2: UX Adversarial and Trust Integrity
- Finding: patient may infer immediate clinician response without explicit timing
- Severity: High
- Exploit/failure path: ambiguous “saved/routed” language
- Mitigation: add explicit “review timing” and emergency routing text
- Residual risk: Low

- Finding: dense terminology can overload distressed users
- Severity: Medium
- Exploit/failure path: skip/abandon key safety guidance
- Mitigation: plain-language blocks + progressive disclosure
- Residual risk: Medium-Low

### Iteration 3: Safety/Policy Boundary Integrity
- Finding: boundary model is strong but not always visible contextually
- Severity: Medium
- Exploit/failure path: misread clinician-only surfaces as patient-relevant
- Mitigation: persistent role badges on sensitive screens
- Residual risk: Low

- Finding: suppression rationale visibility must stay clinician-only
- Severity: High
- Exploit/failure path: accidental cross-surface reuse of components
- Mitigation: test gate for patient surface leakage
- Residual risk: Low

### Iteration 4: Investor Credibility and Overclaim Resistance
- Finding: ROI point estimates can be interpreted as guarantees
- Severity: Medium-High
- Exploit/failure path: no confidence intervals/sensitivity context
- Mitigation: confidence bands + assumption sensitivity notes
- Residual risk: Medium-Low

- Finding: compliance posture could be mistaken for completed certification set
- Severity: Medium
- Exploit/failure path: roadmap and achieved controls visually conflated
- Mitigation: clear “implemented vs planned” tagging with timestamps
- Residual risk: Low

## 8) Prioritized Non-Breaking Backlog

### P0 (Must Fix)
1. Patient post-submission expectation panel
- Patient value: High | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S

2. Accessibility semantics pass (aria labels, form labeling, focus states)
- Patient value: High | Business value: High | Impl risk: Medium | Reg risk: Medium | Effort: M

3. Role-boundary labeling on sensitive screens
- Patient value: Medium | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S

4. ROI confidence band annotation
- Patient value: Low | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S

### P1 (High Value)
5. Patient continuity card (streak + last action + next step)
- Patient value: High | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S/M

6. Reflection prompt carousel on patient home/journal
- Patient value: Medium-High | Business value: Medium | Impl risk: Low | Reg risk: Low | Effort: S

7. Compact investor proof strip on landing
- Patient value: Low | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S

8. Contextual “next best action” CTA pattern across key screens
- Patient value: High | Business value: Medium | Impl risk: Medium | Reg risk: Medium | Effort: M

9. Voice note quality prep tips
- Patient value: Medium | Business value: Medium | Impl risk: Low | Reg risk: Low | Effort: S

10. Compliance implemented/planned timestamp labels
- Patient value: Low | Business value: High | Impl risk: Low | Reg risk: Low | Effort: S

### P2 (Polish)
11. Calm-state visual mode for patient screens
- Patient value: Medium | Business value: Medium | Impl risk: Medium | Reg risk: Low | Effort: M

12. Micro-achievement badges
- Patient value: Medium | Business value: Medium | Impl risk: Medium | Reg risk: Low | Effort: M

13. Mobile typography/spacing tune-up for dense clinician cards
- Patient value: Medium | Business value: Medium | Impl risk: Low | Reg risk: Low | Effort: S/M

## 9) Safe Implementation Plan

### Phase 1 (Hardening + Clarity)
- Deliver: P0 #1, #3, #4
- Gates:
  - no missing nav targets
  - no new console errors on route changes
  - patient/clinician boundary checks pass
- Rollback: revert phase commit only

### Phase 2 (Accessibility + Continuity)
- Deliver: P0 #2, P1 #5, #6, #9
- Gates:
  - keyboard navigation pass on patient screens
  - labels/aria verification pass
  - regression tests unchanged/pass
- Rollback: feature-flagged CSS/markup blocks removed

### Phase 3 (Investor Signal Compression)
- Deliver: P1 #7, #10
- Gates:
  - demo pacing still <=10 min
  - no visual distraction reported in review walkthrough
- Rollback: hide proof strip blocks

### Phase 4 (Workflow Polish)
- Deliver: P1 #8 + selected P2
- Gates:
  - state transitions unchanged
  - manual route walkthrough pass
- Rollback: remove CTA enhancements and revert style deltas

## 10) Verification Matrix

| Test Type | Area | Check | Pass Criteria |
|---|---|---|---|
| Manual | Navigation | quick-nav + data-nav transitions | 0 dead routes, 0 blank screens |
| Manual | Patient flow | welcome → consent → home → journal/checkin/voice | all actions respond, no blocked state |
| Manual | Clinician flow | login → mfa → caseload → inbox → detail → draft | all actions and banners visible |
| Manual | Boundary | patient views never show clinician suppression rationale | strict separation maintained |
| Manual | Investor flow | landing → script → ROI → governance → decision room | narrative coherent, no detours |
| Manual | Accessibility | tab order, visible focus, labels for inputs | no unusable control via keyboard |
| Automated | Unit tests | `vitest run` | all tests pass (current baseline: 27/27) |
| Automated | Structural | ID uniqueness + nav target resolution | no duplicates, no missing targets |
| Automated | Build | production build | successful output with no fatal errors |
| Automated | Stability | merge/conflict/stability scripts | all checks pass |

## 11) ROI and Outcome Hypotheses
- Patient completion rate uplift from continuity card + prompts: +8% to +15% directional
- Repeat weekly engagement uplift from next-step clarity: +10% to +18% directional
- Clinician prep efficiency signal improvement via clearer patient summaries: +5% to +12% directional
- Investor confidence uplift (demo clarity score) via proof strip + confidence bands: +15% to +25% directional

### Metrics to Track (Demo-safe)
- Journal completion ratio
- Check-in completion ratio
- Voice upload completion ratio
- Route drop-off by screen
- Time-to-next-action after submission
- Demo walkthrough completion time

### Instrumentation (Front-end only)
- Event markers on `data-nav` clicks
- Completion events for journal/check-in/voice actions
- Time deltas between submission and next navigation
- Optional local session summary panel (non-persistent)

## 12) Final Deliverable Summary

### Do-Now Patch Set (Safe Immediate)
- Add patient post-submission expectation module
- Add role-boundary tags on sensitive screens
- Add compact ROI confidence band note
- Add patient reassurance + crisis clarity microcopy blocks
- Preserve existing state/event logic and routes

### Next-Wave Enhancement Set
- Patient continuity card and prompt system
- Contextual next-best-action CTA model
- Investor proof strip and readiness compact cards
- Accessibility deep pass and keyboard/path validation suite

### Explicitly Avoided (to Preserve Workability)
- No backend/API integration
- No changes to clinician decision authority logic
- No changes to suppression policy behavior
- No hidden business-logic rewrites in routing/state engine
- No heavy dashboard expansion that distracts from core platform narrative
