# Optimized Prompt: Full Product + Red-Team Review (Non-Breaking)

Use this prompt with an AI coding/review agent to run a comprehensive improvement cycle on the demo while preserving existing behavior.

---

## Copy/Paste Prompt

You are a senior product engineer, UX strategist, and red-team reviewer. Perform an end-to-end audit and improvement plan for this interactive demo site.

### Primary Objective
Improve design quality, navigation clarity, UX trust, and business impact (ROI narrative strength) **without breaking existing logic, workflows, interactivity, or policy boundaries**.

### Hard Constraints (Must Not Violate)
1. Do **not** remove or alter core user flows and existing screen routing.
2. Do **not** break any current controls, toggles, state transitions, or scripted interactions.
3. Do **not** change clinical/safety policy boundaries (human-in-the-loop behavior, suppression transparency, portal authority, restricted surface behavior).
4. Do **not** introduce backend dependencies or non-demo data sources.
5. Keep changes incremental, reversible, and compatible with static hosting.

### Required Review Scope
Audit and score the current implementation (0-10 with rationale) across:
- Functional reliability and interaction correctness
- Navigation architecture and discoverability
- Visual hierarchy, spacing density, readability, and responsive behavior
- Accessibility fundamentals (keyboard/focus/contrast/labels)
- Demo storytelling quality (investor clarity in under 10 minutes)
- Security and trust signals (including red-team abuse paths)
- ROI communication strength (clarity, credibility, assumptions)
- Maintainability and technical debt risk

### Output Format Required
Provide outputs in this exact sequence:
1. **Executive Snapshot (<=10 bullets)**: top issues and opportunities.
2. **Non-Breaking Improvement Backlog** with priority tags:
   - P0 (must fix), P1 (high ROI), P2 (polish)
   - each item includes: user value, business value, implementation risk, regression risk, effort estimate.
3. **Red-Team Findings**:
   - logic/workflow abuse cases
   - misleading UX / trust failure cases
   - navigation dead-ends / state confusion
   - data-boundary leakage risks
   - for each: severity, exploit path, mitigation.
4. **Safe Implementation Plan**:
   - phased rollout with checkpoints
   - validation gates after each phase
   - rollback strategy.
5. **Verification Matrix**:
   - what to test manually
   - what to test automatically
   - pass/fail criteria.
6. **ROI Lift Hypotheses**:
   - measurable assumptions
   - expected directional impact
   - instrumentation suggestions.

### Execution Rules
- Start with a baseline map of all screens and transitions.
- Identify whitespace/layout inefficiencies and navigation friction points first.
- Favor improvements that increase comprehension speed, confidence, and conversion narrative quality.
- Prefer low-risk UI/layout refinements over logic rewrites.
- If a recommendation could impact behavior, label it "behavioral risk" and provide a safer alternative.

### Red-Team Hardening Iteration Protocol
Run 3 iterations:
- **Iteration 1: Structural Risks** (routing, broken states, dead links, invalid assumptions)
- **Iteration 2: UX Adversarial Pass** (confusing actions, misleading labels, trust erosion)
- **Iteration 3: Business Credibility Pass** (ROI overclaim risk, missing assumptions, weak proof points)

For each iteration, return:
- Findings
- Proposed mitigations
- Residual risk after mitigation
- Confidence level.

### Final Deliverable Requirement
End with:
- A prioritized “do-now” patch set that is safe to apply immediately
- A “next wave” enhancement set
- A short list of changes explicitly avoided to preserve logic/workability.

---

## Optional Add-On Prompt (Implementation Mode)

After review output is approved, switch to implementation mode with this command:

"Implement only P0 + selected P1 items from the approved backlog. Keep logic unchanged. After each edit, run regression checks and report any behavior deltas immediately."
