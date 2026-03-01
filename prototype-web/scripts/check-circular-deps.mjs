#!/usr/bin/env node
// ─── Circular Dependency Detector ────────────────────────────────────
// PRD Gate 1: Detect circular imports in src/ without external deps.
// Uses a simple DFS on static import statements.

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve, dirname, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

// Resolve path alias @/ → src/
function resolveAlias(importPath) {
  if (importPath.startsWith('@/')) {
    return join(SRC_DIR, importPath.slice(2));
  }
  return null;
}

// Resolve an import specifier to an absolute file path
function resolveImport(importPath, fromFile) {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) return null;

  let absPath;
  if (importPath.startsWith('@/')) {
    absPath = resolveAlias(importPath);
  } else {
    absPath = resolve(dirname(fromFile), importPath);
  }

  // Try exact match, then with extensions, then as index
  for (const candidate of [
    absPath,
    ...EXTENSIONS.map((ext) => absPath + ext),
    ...EXTENSIONS.map((ext) => join(absPath, 'index' + ext)),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not found — continue
    }
  }
  return null;
}

// Extract import specifiers from a file
function extractImports(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const imports = [];
  // Match: import ... from '...' and import '...' and export ... from '...'
  const re = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

// Collect all source files
function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip mocks and test directories
      if (entry === 'mocks' || entry === '__tests__') continue;
      files.push(...collectFiles(fullPath));
    } else if (EXTENSIONS.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

// Build dependency graph
function buildGraph(files) {
  const graph = new Map(); // file → Set<file>

  for (const file of files) {
    const deps = new Set();
    const imports = extractImports(file);
    for (const imp of imports) {
      const resolved = resolveImport(imp, file);
      if (resolved && files.includes(resolved)) {
        deps.add(resolved);
      }
    }
    graph.set(file, deps);
  }

  return graph;
}

// DFS cycle detection
function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();
  const path = [];

  function dfs(node) {
    if (inStack.has(node)) {
      // Found cycle — extract it
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      dfs(dep);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node);
  }

  return cycles;
}

function relativePath(absPath) {
  return absPath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '').replace(/\\/g, '/');
}

// ── Main ─────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  Circular Dependency Detection — Gate 1 Check');
console.log('═══════════════════════════════════════════════════');
console.log('');

const files = collectFiles(SRC_DIR);
console.log(`  Files scanned: ${files.length}`);

const graph = buildGraph(files);
const cycles = findCycles(graph);

if (cycles.length > 0) {
  console.log(`\n  ❌ ${cycles.length} circular dependency chain(s) found:\n`);
  for (const cycle of cycles) {
    const chain = cycle.map(relativePath).join(' → ');
    console.log(`    ↻ ${chain}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('  ✓ No circular dependencies found.');
  console.log('');
}
