# Red Team Security Demo Review (Simulated)

WARNING: Demo simulation only. No real-world cryptographic guarantees.

## Threat Model (STRIDE-style, concise)
- Spoofing: attacker impersonates clinician/admin to bypass MFA.
- Tampering: forged contract artifact or Merkle path tampering.
- Repudiation: audit log tampering or log omission in UI.
- Information Disclosure: leakage of sensitive controls or PHI via UI.
- Denial of Service: flooding with bogus validations to desync UI.
- Elevation of Privilege: step-up auth bypass for high-risk actions.

## Abuse Scenarios
- MFA bypass attempt using predictable backup codes.
- Replay of stale challenge/signature to make forged contract appear valid.
- Forged contract artifact metadata supplied to validation routine.
- Merkle path tampering to make invalid leaf appear to belong to root.
- UI state desync after resets resulting in stale statuses.

## Detection & Mitigation Mapping
- Use deterministic synthetic data and strict equality checks in simulation.
- Surface audit events for every validation attempt; append-only UI log.
- Mark all cryptographic validation results as "simulated" with clear evidence text.
- Fail build on duplicate critical navigation labels to avoid merge-leak UI confusion.
- Reset demo deterministically clears security state and audit log.

## Residual Risks & Backlog
- Demo-level simulations do not replace real cryptographic verification.
- Follow-up: integrate real HSM-backed key simulation and signed attestations.

## Demo Disclaimers
- This command center is a synthetic demo for illustration and red-team exercises only.
- Do not use outputs for real access control decisions.
