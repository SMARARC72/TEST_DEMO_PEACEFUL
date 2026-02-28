#!/usr/bin/env node
/**
 * Build script: Combine modular Peacefull.ai demo into a single HTML file.
 * Reads prototype-web/index.html + all JS modules → peacefull-demo-github/index.html
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = '/workspaces/TEST_DEMO_PEACEFUL/prototype-web';
const OUT  = '/workspaces/TEST_DEMO_PEACEFUL/peacefull-demo-github/index.html';

// --- 1. Read all source files ---
const html      = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const stateJS   = readFileSync(resolve(ROOT, 'public/js/state.js'), 'utf8');
const helpersJS = readFileSync(resolve(ROOT, 'public/js/helpers.js'), 'utf8');
const renderJS  = readFileSync(resolve(ROOT, 'public/js/render.js'), 'utf8');
const actionsJS = readFileSync(resolve(ROOT, 'public/js/actions.js'), 'utf8');
const eventsJS  = readFileSync(resolve(ROOT, 'public/js/events.js'), 'utf8');
const indexJS   = readFileSync(resolve(ROOT, 'public/js/index.js'), 'utf8');

// --- 2. Strip import/export from each JS module ---
function stripImportsExports(code) {
  // Remove import lines (single and multi-line)
  let result = code;
  
  // Remove single-line imports:  import { ... } from '...';
  // Also import * as xxx from '...';
  // Also import xxx from '...';
  result = result.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  
  // Remove multi-line imports (import { \n ... \n } from '...';)
  result = result.replace(/^import\s*\{[^}]*\}\s*from\s*['"].*?['"];?\s*$/gm, '');
  
  // Remove any remaining bare import lines
  result = result.replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"].*?['"];?\s*$/gm, '');
  
  // Remove 'export ' keyword from declarations (export function, export const, export let, etc.)
  result = result.replace(/^export\s+(function|const|let|var|class)\s/gm, '$1 ');
  
  // Remove 'export default' 
  result = result.replace(/^export\s+default\s+/gm, '');
  
  return result;
}

// --- 3. Process events.js: replace actions.xxx with direct function refs ---
function processEvents(code) {
  let result = stripImportsExports(code);
  // Replace actions.xxx references with direct function calls
  result = result.replace(/actions\./g, '');
  return result;
}

// --- 4. Process index.js: replace actions.xxx with direct function refs ---
function processIndex(code) {
  let result = stripImportsExports(code);
  // Replace actions.xxx references with direct function calls
  result = result.replace(/actions\./g, '');
  return result;
}

// --- 5. Build the IIFE script block ---
const iifeScript = `<script>
(function() {
  'use strict';

  // ==================== STATE MODULE ====================
${stripImportsExports(stateJS)}

  // ==================== HELPERS MODULE ====================
${stripImportsExports(helpersJS)}

  // ==================== RENDER MODULE ====================
${stripImportsExports(renderJS)}

  // ==================== ACTIONS MODULE ====================
${stripImportsExports(actionsJS)}

  // ==================== EVENTS MODULE ====================
${processEvents(eventsJS)}

  // ==================== MAIN ENTRY POINT ====================
${processIndex(indexJS)}

})();
</script>`;

// --- 6. Replace the modular script tag in HTML with the IIFE ---
const scriptTagPattern = /\s*<!--\s*JAVASCRIPT\s*\(Modular\)\s*-->\s*\n\s*<script\s+type="module"\s+src="\/js\/index\.js"><\/script>/;
let outputHTML;

if (scriptTagPattern.test(html)) {
  outputHTML = html.replace(scriptTagPattern, '\n  <!-- JAVASCRIPT (Single File Build) -->\n  ' + iifeScript);
} else {
  // Fallback: replace just the script tag
  outputHTML = html.replace(
    /<script\s+type="module"\s+src="\/js\/index\.js"><\/script>/,
    '<!-- JAVASCRIPT (Single File Build) -->\n  ' + iifeScript
  );
}

// --- 7. Write the output ---
writeFileSync(OUT, outputHTML, 'utf8');

const lineCount = outputHTML.split('\n').length;
console.log(`✅ Single-file build complete: ${OUT}`);
console.log(`   Total lines: ${lineCount}`);
console.log(`   File size: ${(Buffer.byteLength(outputHTML, 'utf8') / 1024).toFixed(1)} KB`);
