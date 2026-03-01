#!/usr/bin/env node
/**
 * Verification Script: Validate React app stability (Phase 1+)
 * 
 * Checks:
 * 1. No unresolved merge markers in source files
 * 2. Critical React entry points exist (main.tsx, App.tsx, router.tsx)
 * 3. All page components exist
 * 4. Netlify / deploy config is correct
 * 5. package-lock.json is present and valid
 * 6. index.html is a valid Vite shell (has #root + module script)
 * 
 * Run: npm run verify:no-conflicts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const checks = [];

// ─── 1. Check for merge markers in key source files ───
const filesToScan = [
  'index.html',
  'src/main.tsx',
  'src/App.tsx',
  'src/router.tsx',
  'src/api/client.ts',
  'src/stores/auth.ts',
  'src/stores/ui.ts',
  'vite.config.ts',
];

for (const relPath of filesToScan) {
  const fullPath = path.join(projectRoot, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasMergeMarkers = /^(<{7}|={7}|>{7})/m.test(content);
    checks.push({
      name: `No merge conflict markers in ${relPath}`,
      pass: !hasMergeMarkers,
    });
  }
}

// ─── 2. Critical React entry points exist ───
const requiredFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'src/router.tsx',
  'src/api/client.ts',
  'src/api/types.ts',
  'src/stores/auth.ts',
  'src/stores/ui.ts',
  'src/styles/globals.css',
  'src/components/layout/AppShell.tsx',
  'src/components/layout/AuthGuard.tsx',
  'src/components/layout/ErrorBoundary.tsx',
];

for (const relPath of requiredFiles) {
  checks.push({
    name: `Required file exists: ${relPath}`,
    pass: fs.existsSync(path.join(projectRoot, relPath)),
  });
}

// ─── 3. All page components exist ───
const pageFiles = [
  'src/pages/auth/LoginPage.tsx',
  'src/pages/auth/RegisterPage.tsx',
  'src/pages/patient/PatientHome.tsx',
  'src/pages/patient/CheckinPage.tsx',
  'src/pages/patient/JournalPage.tsx',
  'src/pages/patient/SubmissionSuccessPage.tsx',
  'src/pages/clinician/CaseloadPage.tsx',
  'src/pages/clinician/TriageInboxPage.tsx',
  'src/pages/clinician/DraftReviewPage.tsx',
];

for (const relPath of pageFiles) {
  checks.push({
    name: `Page component exists: ${relPath}`,
    pass: fs.existsSync(path.join(projectRoot, relPath)),
  });
}

// ─── 4. Netlify / deploy config ───
const netlifyPath = path.join(projectRoot, '..', 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
  checks.push({
    name: 'netlify.toml points to prototype-web',
    pass: netlifyContent.includes('base = "prototype-web"'),
    details: netlifyContent.includes('base = "prototype-web"')
      ? 'Base directory configured correctly'
      : 'netlify.toml base directive missing or incorrect',
  });
} else {
  checks.push({
    name: 'netlify.toml exists (expected at repo root)',
    pass: false,
    details: 'netlify.toml not found',
  });
}

// ─── 5. package-lock.json check ───
const lockfilePath = path.join(projectRoot, 'package-lock.json');
checks.push({
  name: 'package-lock.json exists and is valid JSON',
  pass: (() => {
    if (!fs.existsSync(lockfilePath)) return false;
    try {
      JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
      return true;
    } catch {
      return false;
    }
  })(),
  details: fs.existsSync(lockfilePath) ? 'Lockfile found' : 'Lockfile missing',
});

// ─── 6. index.html is a valid Vite shell ───
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
checks.push({
  name: 'index.html contains #root mount point',
  pass: indexHtml.includes('id="root"'),
});
checks.push({
  name: 'index.html contains Vite module script entry',
  pass: indexHtml.includes('type="module"') && indexHtml.includes('/src/main.tsx'),
});

// ─── Print results ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Stability Verification – React App Pre-Deploy Check');
console.log('═══════════════════════════════════════════════════════════\n');

let allPassed = true;
checks.forEach((check) => {
  const status = check.pass ? '✓' : '✘';
  console.log(`${status} ${check.name}`);
  if (check.details) {
    console.log(`  → ${check.details}\n`);
  }
  if (!check.pass) allPassed = false;
});

console.log('═══════════════════════════════════════════════════════════\n');

if (allPassed) {
  console.log('✓ All stability checks passed. React app is ready.\n');
  process.exit(0);
} else {
  console.log('✘ Some checks failed. Please review above.\n');
  process.exit(1);
}
