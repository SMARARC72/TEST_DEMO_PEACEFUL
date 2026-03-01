#!/usr/bin/env node
// ─── Synthetic Data Guard ────────────────────────────────────────────
// PRD Synthetic Data Elimination: Ensure no demo/synthetic data patterns
// leak into production source code.
//
// Checks src/ for:
//  - Known synthetic names (demo patients, clinicians)
//  - Demo mode flags
//  - References to old prototype JS files
//
// Excludes: mocks/, test files, *.d.ts

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// ── Patterns that must NOT appear in production source ───
const FORBIDDEN_PATTERNS = [
  // Known synthetic patient names (from PRD)
  /Maria\s+Santos/i,
  /James\s+Mitchell/i,
  /Emma\s+Chen/i,
  /Maria\s+Rodriguez/i,
  /James\s+Smith/i,
  /Emma\s+Wilson/i,
  /Alex\s+Kim/i,
  // Known synthetic clinician names
  /Dr\.\s*Sarah\s+Chen/i,
  /Dr\.\s*Michael\s+Torres/i,
  /Dr\.\s*Lisa\s+Park/i,
  // Demo mode flags
  /\bisDemo\b/,
  /\bisDemoMode\b/,
  /\bdemoMode\b/,
  /\buseDemoData\b/,
  /\bfallbackToDemo\b/,
  // Old prototype file imports
  /public\/js\/state\.js/,
  /public\/js\/api-bridge\.js/,
  /public\/js\/render\.js/,
  /public\/js\/actions\.js/,
  // Hardcoded synthetic IDs
  /PT-2847/,
  // Prefixed synthetic data markers — lowercase only (demo_patient, fake_data, etc.)
  /\bdemo_(?:patient|clinician|data|user|session|record|score|plan)/,
  /\bfake_(?:patient|clinician|data|user|session|record|score|plan)/,
  /\bseed_(?:patient|clinician|data|user|session|record|score|plan)/,
  // Uppercase synthetic constant markers referencing actual data
  /\bDEMO_(?:PATIENT|CLINICIAN|DATA|USER|SESSION|RECORD)/,
  /\bFAKE_(?:PATIENT|CLINICIAN|DATA|USER|SESSION|RECORD)/,
  /\bSEED_(?:PATIENT|CLINICIAN|DATA|USER|SESSION|RECORD)/,
];

// ── Directories to skip ──────────────────────
const SKIP_DIRS = ['mocks', '__tests__', '__mocks__', 'node_modules'];

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.includes(entry)) continue;
      files.push(...collectFiles(fullPath));
    } else if (EXTENSIONS.includes(extname(entry)) && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function relativePath(absPath) {
  return absPath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '').replace(/\\/g, '/');
}

// ── Main ──────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  Synthetic Data Guard — Content Audit');
console.log('═══════════════════════════════════════════════════');
console.log('');

const files = collectFiles(SRC_DIR);
console.log(`  Files scanned: ${files.length}`);

const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment-only lines mentioning patterns in documentation context
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: relativePath(file),
          line: i + 1,
          pattern: pattern.source,
          text: trimmed.slice(0, 120),
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.log(`\n  ❌ ${violations.length} synthetic data reference(s) found:\n`);
  for (const v of violations) {
    console.log(`    ${v.file}:${v.line}`);
    console.log(`      Pattern: /${v.pattern}/`);
    console.log(`      Text: ${v.text}`);
    console.log('');
  }
  console.error('❌ Synthetic data found in production source. Remove or move to mocks/.');
  process.exit(1);
} else {
  console.log('  ✓ No synthetic data references found in production source.');
  console.log('');
}
