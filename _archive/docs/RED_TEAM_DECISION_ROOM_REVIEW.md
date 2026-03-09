# Red Team Review – Proof-of-Safety & ROI Decision Room

This document enumerates threat models, misuse scenarios, and mitigations for the new `decision-room` feature added in v2.6.

## Threat Model

| Asset | Adversary Goals | Attack Vectors | Mitigations |
|-------|----------------|----------------|-------------|
| UI nav links | Spoof or duplicate links to confuse executives/clinicians | Merge conflicts leave duplicate buttons; malicously inserted hidden links | Pre-build duplicate-label guard, runtime check via `verify-demo-stability`, visual audit of DOM; manual code review |
| Decision Room state | Tamper with readiness verdict or pilot score | JS injection via compromised demo-panel; stale state after reset | Deterministic state object, resetDemo wiring, displayed values recomputed on showScreen, no `eval` or external fetches |
| Procurement packet content | Leak clinician-only evidence to patient or inflate status | Packet generator using same `securityState` or `enterpriseItems` objects | Packet sanitized to include only high-level checklist and audit summaries; no PHI; simulation label enforced |
| Reset mechanism | Bypass resetting state leading to stale data reused for decisions | Missing `resetDecisionRoomState` call, absent in `verify-demo-stability` | Automated script checks, test coverage via Playwright resets, code comments
| Performance / DoS | Large audit logs or many triage items degrade responsiveness | `auditLog` capped at 200 entries; UI uses simple DOM operations | Capping and simple rendering prevents hangs

### Common threat categories
- **Spoofing**: injection of fake nav elements or UI text via merge markers, duplicates. Guard scripts and review process mitigate.
- **Tampering**: modifying decision-room functions to return misleading verdicts. All computations are deterministic and rely on sanitized demo state. Code review ensures no unauthorized network calls.
- **Repudiation**: user claiming decision-room showed different values. Audit log rows include timestamps and are part of packet.
- **Information Disclosure**: ensuring zero PHI in packet or risk posture; explicit labels and safe defaults.
- **Denial of Service**: UI is simple enough that adversarial input cannot freeze browser; long arrays truncated.
- **Privilege Misuse**: only demo controls accessible in admin panel; no patient workflow touches decision-room logic.

## Misuse / Abuse Scenarios

1. **Forged status inflation** – an attacker modifies `computeReadinessVerdict()` to always return `APPROVED`.
   - *Mitigation:* function logic simple and visible; tests verify verdict varies; red team note to add unit tests in future sprint.

2. **Stale state used for executive decision** – state not reset or computed when screen shown.
   - *Mitigation:* `showScreen` triggers `renderDecisionRoom()`; `resetDemo()` calls `resetDecisionRoomState()`; verify script checks wiring; smoke test resets and reopens screen.

3. **Clinician-only evidence leakage to patient surfaces** – procurement packet accidentally includes clinician notes or PHI.
   - *Mitigation:* packet generator builds a fixed object with high‑level strings; does not read any patient fields; review of code confirms no cross‑contamination.

4. **Duplicate nav/hidden conflict-marker regression** – merge conflict leaves `<<<<<<<` text or extra nav buttons.
   - *Mitigation:* existing merge-guard script catches conflict patterns and duplicates; new entries added for Decision Room; verification script covers runtime counts; manual PR review emphasizes link counts.

5. **DoS via excessively large packet** – attacker inputs huge audit logs or triage list to inflate packet JSON.
   - *Mitigation:* audit log capped at 200 entries; triage queue baseline small; packet generated on demand and displayed in `<pre>` with overflow controls.

## Mitigations and Controls
- Pre-build guard scripts (`check-merge-artifacts.mjs`, `verify-demo-stability.mjs`) check for merges, duplicates, missing resets.
- Playwright smoke test expanded to exercise decision-room and reset semantics.
- `resetDemo()` deterministic and extended to include new state; stable baseline objects defined at top.
- UI strings explicitly labeled "(simulated)" or with conservative disclaimers.
- New code added with minimal surface area; no external imports, no asynchronous operations, no try/catch blocks.
- Red team backlog: add unit tests, static type enforcement, and runtime integrity checks for verdict functions during next sprint.

## Residual Risks / Follow-up
- Lack of strong typing in vanilla JS may allow subtle variable shadowing; consider migrating decision-room logic to a module with TypeScript.
- No integrity protection for UI scripts; in production, host review copy may require CSP or subresource integrity.
- Packet export is not persisted; any future file download feature must be evaluated separately.
- Governance readiness depends on simulated metric; real integrations may surface additional data integrity requirements.

End of document.
