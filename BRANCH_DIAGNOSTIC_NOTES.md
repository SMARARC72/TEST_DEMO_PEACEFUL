# Branch Diagnostic Notes (Netlify Build)

This branch exists to isolate and diagnose CI/deploy behavior independently from prior PR threads.

## Scope carried forward
- Keep all shipped demo workflows intact (AI communication surfaces, triage queue, C-10/C-11 workflows, enterprise governance, reset behavior).
- Keep merge-artifact guard in build pipeline.
- Keep Netlify build base as `prototype-web` and build command `npm ci && npm run build`.

## Netlify failure root cause addressed
`npm ci` requires a committed lockfile in the build base directory.
Because Netlify builds from `prototype-web`, `prototype-web/package-lock.json` must be present and committed.

## Verification checklist for this branch
1. `cd prototype-web && npm run verify:no-conflicts`
2. `cd prototype-web && npm ci`
3. `cd prototype-web && npm run lint`
4. `cd prototype-web && npm run build`

If all checks pass, this branch is ready for PR review as a separated diagnostic lane.
