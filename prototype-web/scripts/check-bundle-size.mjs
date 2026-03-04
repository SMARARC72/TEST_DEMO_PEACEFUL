#!/usr/bin/env node
// ─── Bundle Size Budget Guard ────────────────────────────────────────
// PRD Gate 1: Fail if any chunk exceeds size budgets.
// Run after `npm run build` to verify bundle sizes.
//
// Budgets (gzipped):
//   Main chunk (index-*):      250 KB
//   Lazy-loaded page chunks:   100 KB each
//   Vendor chunks:             150 KB each
//   CSS:                        25 KB

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';

const DIST_DIR = join(process.cwd(), 'dist', 'assets');
const KB = 1024;

const BUDGETS = {
  mainJs: 250 * KB,     // Main entry chunk
  lazyJs: 100 * KB,     // Lazy-loaded page chunks
  vendorJs: 150 * KB,   // Vendor/library chunks (recharts, react, etc.)
  mlRuntime: 250 * KB,  // ML model runtimes (Whisper/transformers.js — loaded on-demand)
  css: 25 * KB,          // CSS bundle
};

// Known vendor chunks that get the larger vendor budget
const VENDOR_PATTERNS = [
  /^charts-/,
  /^browser-/,    // MSW browser
  /^schemas-/,    // Zod schemas
  /^react-/,      // React runtime
];

// Heavy ML runtime chunks — loaded lazily, on explicit user action only
const ML_RUNTIME_PATTERNS = [
  /^transformers/,     // @huggingface/transformers (Whisper AI)
  /^ort-/,             // ONNX Runtime
];

function isMLRuntime(name) {
  return ML_RUNTIME_PATTERNS.some((p) => p.test(name));
}

function isVendorChunk(name) {
  return VENDOR_PATTERNS.some((p) => p.test(name));
}

function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

function checkBundles() {
  let files;
  try {
    files = readdirSync(DIST_DIR);
  } catch {
    console.error('❌ dist/assets/ not found — run `npm run build` first');
    process.exit(1);
  }

  const violations = [];
  let totalGzip = 0;
  let fileCount = 0;

  for (const file of files) {
    const filePath = join(DIST_DIR, file);
    const stat = statSync(filePath);
    if (!stat.isFile()) continue;

    // Skip source maps
    if (file.endsWith('.map')) continue;

    const gzipSize = getGzipSize(filePath);
    totalGzip += gzipSize;
    fileCount++;

    let budget;
    let category;

    if (file.endsWith('.css')) {
      budget = BUDGETS.css;
      category = 'CSS';
    } else if (file.startsWith('index-') && file.endsWith('.js')) {
      budget = BUDGETS.mainJs;
      category = 'Main';
    } else if (file.startsWith('router-') && file.endsWith('.js')) {
      budget = BUDGETS.mainJs;
      category = 'Router';
    } else if (file.endsWith('.js') && isMLRuntime(file)) {
      budget = BUDGETS.mlRuntime;
      category = 'ML-Runtime';
    } else if (file.endsWith('.js') && isVendorChunk(file)) {
      budget = BUDGETS.vendorJs;
      category = 'Vendor';
    } else if (file.endsWith('.js')) {
      budget = BUDGETS.lazyJs;
      category = 'Lazy';
    } else {
      continue;
    }

    const overBudget = gzipSize > budget;
    const sizeKB = (gzipSize / KB).toFixed(1);
    const budgetKB = (budget / KB).toFixed(0);

    if (overBudget) {
      violations.push(`  ❌ ${file} (${category}): ${sizeKB} KB gzip > ${budgetKB} KB budget`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Bundle Size Budget — Gate 1 Check');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Files checked: ${fileCount}`);
  console.log(`  Total gzip: ${(totalGzip / KB).toFixed(1)} KB`);
  console.log('');

  if (violations.length > 0) {
    console.log('  VIOLATIONS:');
    violations.forEach((v) => console.log(v));
    console.log('');
    console.error(`❌ ${violations.length} bundle(s) exceed budget. Optimize or raise thresholds.`);
    process.exit(1);
  } else {
    console.log('  ✓ All bundles within budget.');
    console.log('');
  }
}

checkBundles();
