#!/usr/bin/env node
/**
 * Merge Artifact Guard
 * 
 * Ensures build fails early if:
 * 1. Unresolved Git merge conflict markers exist
 * 2. Leaked branch identifiers are present in source
 * 3. Duplicate UI elements (e.g., duplicate nav buttons)
 * 
 * Run: node scripts/check-merge-artifacts.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Files to check for merge markers
const filesToCheck = [
  'index.html',
  'netlify.toml',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'eslint.config.js',
];

// Patterns that indicate unresolved conflicts
const conflictPatterns = [
  /^<<<<<<</m,  // Start of conflict
  /^=======/m,  // Conflict separator
  /^>>>>>>>/m,  // End of conflict
];

// Patterns that indicate leaked branch identifiers
const leakedBranchPatterns = [
  /<<<<<<< HEAD/,
  /<<<<<<< [a-zA-Z0-9/_-]+/,
  />>>>>>> [a-zA-Z0-9/_-]+/,
];

// Patterns for duplicate UI elements in index.html
const duplicatePatterns = [
  {
    name: 'Communication Triage Queue button (in buttons only, not headings)',
    pattern: /<button[^>]*onclick="showScreen\('communication-triage-queue'\)"[^>]*>Communication Triage Queue<\/button>/g,
    maxCount: 1,
  },
  {
    name: 'Reset Demo button (in DOM, not comments)',
    pattern: /<button[^>]*onclick="resetDemo\(\)"[^>]*>Reset Demo<\/button>/g,
    maxCount: 1,
  },
  {
    name: 'Security Command Center button (in buttons only)',
    pattern: /<button[^>]*onclick="showScreen\('security-command-center'\)"[^>]*>Security Command Center<\/button>/g,
    maxCount: 2,
  },
  {
    name: 'Decision Room button (in buttons only)',
    pattern: /<button[^>]*onclick="showScreen\('decision-room'\)"[^>]*>Decision Room<\/button>/g,
    maxCount: 1,
  },
];

let errors = [];

// Check each file for merge markers
filesToCheck.forEach((file) => {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⊘ Skipping ${file} (not found)`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check for conflict markers
  conflictPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      errors.push(
        `✘ [${file}] Found unresolved merge conflict marker: ${pattern}`
      );
    }
  });

  // Check for leaked branch identifiers
  leakedBranchPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      errors.push(
        `✘ [${file}] Found leaked branch identifier: ${pattern}`
      );
    }
  });
});

// Check index.html for duplicate UI elements
if (fs.existsSync(path.join(projectRoot, 'index.html'))) {
  const htmlContent = fs.readFileSync(
    path.join(projectRoot, 'index.html'),
    'utf8'
  );

  duplicatePatterns.forEach(({ name, pattern, maxCount }) => {
    const matches = htmlContent.match(pattern);
    const count = matches ? matches.length : 0;
    if (count > maxCount) {
      errors.push(
        `✘ [index.html] Found ${count} occurrences of "${name}" (expected max: ${maxCount})`
      );
    }
  });

  // Check for visible merge marker text in rendered DOM
  if (/<<<<<<<|=======|>>>>>>>/.test(htmlContent)) {
    errors.push(
      `✘ [index.html] Found potential merge marker text that may leak to rendered DOM`
    );
  }
}

// Output results
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Merge Artifact Guard – Build Pre-Check');
console.log('═══════════════════════════════════════════════════════════\n');

if (errors.length === 0) {
  console.log('✓ No merge artifacts, leaked branch identifiers, or duplicates found.');
  console.log('✓ Build is safe to proceed.\n');
  process.exit(0);
} else {
  console.log(`✘ Found ${errors.length} issue(s):\n`);
  errors.forEach((error, i) => {
    console.log(`  ${i + 1}. ${error}`);
  });
  console.log('\n✘ Build FAILED: Resolve all merge artifacts before proceeding.\n');
  process.exit(1);
}
