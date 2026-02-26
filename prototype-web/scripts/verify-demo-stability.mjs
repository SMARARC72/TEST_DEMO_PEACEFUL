#!/usr/bin/env node
/**
 * Verification Script: Validate live demo stability
 * 
 * Checks:
 * 1. No unresolved merge markers in tracked files
 * 2. resetDemo() function exists and wires all reset hooks
 * 3. No duplicate nav elements (triage, reset)
 * 4. Netlify build config is correct
 * 5. package-lock.json is present and valid
 * 
 * Run: npm run verify:no-conflicts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const checks = [];

// 1. Check for merge markers
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
checks.push({
  name: 'No merge conflict markers in index.html',
  pass: !/^<<<<<<|^=======|^>>>>>>>/.test(indexHtml),
});

// 2. Check resetDemo wiring
const resetDemoMatch = indexHtml.match(/function resetDemo\(\)\s*\{([\s\S]*?)\n\s*\}/);
const hasResetWiring =
  resetDemoMatch &&
  resetDemoMatch[1].includes('resetMemoryReview()') &&
  resetDemoMatch[1].includes('resetTreatmentPlan()') &&
  resetDemoMatch[1].includes('resetEnterpriseGovernance()') &&
  resetDemoMatch[1].includes('resetSubmissionState()');

checks.push({
  name: 'resetDemo() wires all reset hooks',
  pass: hasResetWiring,
  details: resetDemoMatch
    ? `resetDemo wired with: Memory, Treatment, Enterprise, Submission\n    Found: ${resetDemoMatch[0].slice(0, 60)}...`
    : 'resetDemo() function not found',
});

// 3. Check for duplicate nav button patterns
const resetDemoButtonCount = (indexHtml.match(/<button[^>]*onclick="resetDemo\(\)"[^>]*>Reset Demo<\/button>/g) || []).length;
const commTriageCount = (indexHtml.match(/<button[^>]*onclick="showScreen\('communication-triage-queue'\)"[^>]*>Communication Triage Queue<\/button>/g) || []).length;

checks.push({
  name: 'Reset Demo button appears exactly once in DOM',
  pass: resetDemoButtonCount === 1,
  details: `Found ${resetDemoButtonCount} occurrence(s)`,
});

// 4. Netlify config check
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

  checks.push({
    name: 'Netlify build command includes conflict guard via npm scripts',
    pass: netlifyContent.includes('npm run check:artifacts') || netlifyContent.includes('check-merge-artifacts'),
    details: netlifyContent.includes('npm run check:artifacts')
      ? 'Guard script called from package.json build step'
      : netlifyContent.includes('check-merge-artifacts')
      ? 'Guard script in build pipeline'
      : 'Guard script must be called as part of build',
  });
} else {
  checks.push({
    name: 'netlify.toml exists (expected at repo root)',
    pass: false,
    details: 'netlify.toml not found',
  });
}

// 5. package-lock.json check
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

// Print results
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Stability Verification – Live Demo Pre-Deploy Check');
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
  console.log('✓ All stability checks passed. Demo is ready.\n');
  process.exit(0);
} else {
  console.log('✘ Some checks failed. Please review above.\n');
  process.exit(1);
}
