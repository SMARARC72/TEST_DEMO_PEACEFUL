# Netlify Deploy Fix (Submodule Checkout Error)

## Error Observed
Netlify failed during "Preparing repo" with:

- `fatal: No url found for submodule path 'Peacefull.ai' in .gitmodules`
- `Error checking out submodules`

## Root Cause
The Git index contained `Peacefull.ai` as a git submodule entry (mode `160000`), but the repository had no valid `.gitmodules` mapping for that path.

Netlify's clone step attempts submodule checkout; without a mapping URL, the deploy fails before build starts.

## Fix Applied
- Removed the invalid gitlink/submodule index entry for `Peacefull.ai` from the repository.
- Removed the empty `Peacefull.ai` directory from source control.

## What You Should Do Next
1. Push this fix to `main`.
2. In Netlify, trigger a new deploy (or let auto-deploy run on push).
3. Confirm the clone stage succeeds (no submodule errors).

## Recommended Netlify settings for this repo
This repo can be hosted either as a direct static file or via Vite build:

### Static mode (fastest)
- Base directory: *(blank)*
- Build command: *(blank)*
- Publish directory: `prototype-web`

### Vite build mode
- Base directory: `prototype-web`
- Build command: `npm run build`
- Publish directory: `dist`
