# Deploy Smoke Checklist (Peacefull Demo)

## 1) Pre-Deploy Validation

Run from `prototype-web`:

```bash
npm test
npm run verify:no-conflicts
npm run build
```

Expected:
- Tests pass
- Stability script passes
- Build succeeds with generated `dist/`

---

## 2) Local Smoke Pass (Required)

### Prototype-web (Vite preview)

```bash
npm run preview -- --host 0.0.0.0 --port 4173
```

Check in browser:
- `http://localhost:4173/`
- Landing renders with improved spacing and hero panel
- Bottom quick-nav is visible and routes correctly
- Demo controls panel still works
- `#draft-review`, `#clinician-inbox`, `#roi-dashboard` deep-links open correctly

### Hosted Single-File Variant

From `peacefull-demo-github`:

```bash
python3 -m http.server 4180
```

Check in browser:
- `http://localhost:4180/index.html`
- Landing + quick-nav render correctly
- Back/home navigation works across all main screens

---

## 3) Netlify Deploy (prototype-web)

- Deploy source: `prototype-web`
- Build command: `npm run build`
- Publish directory: `dist`

After deploy, verify:
- `/` loads without console errors
- Navigation and quick-nav work
- No blank/white-space broken sections
- Demo controls still update status UI

---

## 4) GitHub Pages Deploy (peacefull-demo-github)

- Branch: `main`
- Folder: `/ (root)`
- Entry: `index.html`

After deploy, verify:
- Landing visuals and spacing
- Quick-nav routing
- Core demo flow: Patient → Clinician → Inbox → Draft → ROI

---

## 5) Red-Team Regression Quick Checks

- No missing screen targets
- No duplicate `id` values
- No JS errors in console during route changes
- Hash navigation does not break render state
- Existing interactions (recording, consent, exports, review actions) still respond

---

## 6) Final Release Gate

Ship only if all are true:
- ✅ Build/test/stability checks pass
- ✅ Both variants render and navigate cleanly
- ✅ No regressions in logic/workflows/interactivity
- ✅ Hosted URL reproduces local smoke behavior
