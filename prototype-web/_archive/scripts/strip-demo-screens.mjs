#!/usr/bin/env node
/**
 * Strip 15 demo/investor screens from prototype-web/index.html
 * and clean up navigation references.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, '../prototype-web/index.html');

let html = readFileSync(htmlPath, 'utf-8');
const lines = html.split('\n');

// 15 demo screen IDs to remove
const DEMO_SCREENS = [
  'security-command-center',
  'decision-room',
  'compliance-posture',
  'demo-script',
  'ai-communication-compare',
  'ai-live-chat-demo',
  'evidence-base',
  'enterprise-governance',
  'roi-dashboard',
  'workflow-simulation',
  'guided-demo',
  'kpi-panel',
  'procurement-artifacts',
  'fhir-integration',
  'investor-financials',
];

// --- Step 1: Remove demo screen <div> sections ---
// Each screen starts with `  <div id="SCREEN_ID" class="screen ...">` (2-space indent)
// and ends with `  </div>` at the same level before the next screen or section
function removeScreenSections(content) {
  for (const screenId of DEMO_SCREENS) {
    // Match the entire screen div block
    // Screen divs start with <div id="screenId" class="screen and end at the matching </div>
    const startPattern = new RegExp(
      `(\\n?)  <!-- [^>]*?-->\\s*\\n  <div id="${screenId}" class="screen`,
      's'
    );
    
    // Find start of screen section (might have a comment before it)
    let startIdx = content.indexOf(`<div id="${screenId}" class="screen`);
    if (startIdx === -1) {
      console.log(`  [SKIP] Screen "${screenId}" not found`);
      continue;
    }
    
    // Look back for a comment line preceding the div
    const beforeStart = content.lastIndexOf('\n', startIdx - 1);
    const lineBeforeDiv = content.lastIndexOf('\n', beforeStart - 1);
    const precedingLine = content.substring(lineBeforeDiv + 1, beforeStart).trim();
    if (precedingLine.startsWith('<!--') || precedingLine === '') {
      startIdx = lineBeforeDiv + 1;
      // Also check if there's a blank line before the comment
      const lineBeforeComment = content.lastIndexOf('\n', lineBeforeDiv - 1);
      const prevLine = content.substring(lineBeforeComment + 1, lineBeforeDiv).trim();
      if (prevLine === '') {
        startIdx = lineBeforeComment + 1;
      }
    } else {
      startIdx = beforeStart + 1;
    }
    
    // Find the end: look for the next `  <div id="` or `  <!--` or `  <footer` at 2-space indent level
    const fromDiv = content.indexOf(`<div id="${screenId}"`, startIdx);
    // Count nesting depth to find the matching </div>
    let depth = 0;
    let pos = fromDiv;
    let endPos = -1;
    
    while (pos < content.length) {
      const nextOpen = content.indexOf('<div', pos);
      const nextClose = content.indexOf('</div>', pos);
      
      if (nextClose === -1) break;
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          endPos = content.indexOf('\n', nextClose);
          if (endPos === -1) endPos = nextClose + 6;
          break;
        }
        pos = nextClose + 6;
      }
    }
    
    if (endPos === -1) {
      console.log(`  [ERROR] Could not find end of screen "${screenId}"`);
      continue;
    }
    
    const removed = content.substring(startIdx, endPos + 1);
    const removedLines = removed.split('\n').length;
    content = content.substring(0, startIdx) + content.substring(endPos + 1);
    console.log(`  [REMOVED] Screen "${screenId}" (${removedLines} lines)`);
  }
  return content;
}

// --- Step 2: Remove demo nav buttons from demo panel ---
function removeDemoNavButtons(content) {
  // Remove specific data-nav buttons for demo screens
  for (const screenId of DEMO_SCREENS) {
    const pattern = new RegExp(
      `\\s*<button data-nav="${screenId}"[^>]*>[^<]*</button>`,
      'g'
    );
    const before = content.length;
    content = content.replace(pattern, '');
    if (content.length < before) {
      console.log(`  [REMOVED] Nav button for "${screenId}"`);
    }
  }
  return content;
}

// --- Step 3: Remove demo-specific quick-nav buttons ---
function removeQuickNavButtons(content) {
  // Remove ROI, Evidence, Financials from quick-nav
  const demoQuickNavs = ['roi-dashboard', 'evidence-base', 'investor-financials'];
  for (const id of demoQuickNavs) {
    const pattern = new RegExp(
      `\\s*<button type="button" data-nav="${id}"[^>]*>[^<]*</button>`,
      'g'
    );
    content = content.replace(pattern, '');
    console.log(`  [REMOVED] Quick-nav button for "${id}"`);
  }
  return content;
}

// --- Step 4: Remove investor accordion from landing ---
function removeInvestorAccordion(content) {
  // Remove the "Investor & Enterprise" button
  content = content.replace(
    /\s*<button onclick="document\.getElementById\('investor-accordion'\)[^"]*"[^>]*>Investor &amp; Enterprise ▾<\/button>/,
    ''
  );
  
  // Remove the entire investor-accordion div
  const accStart = content.indexOf('<div id="investor-accordion"');
  if (accStart !== -1) {
    let depth = 0;
    let pos = accStart;
    let endPos = -1;
    while (pos < content.length) {
      const nextOpen = content.indexOf('<div', pos);
      const nextClose = content.indexOf('</div>', pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          endPos = content.indexOf('\n', nextClose);
          break;
        }
        pos = nextClose + 6;
      }
    }
    if (endPos !== -1) {
      // Include any blank line after
      const lineStart = content.lastIndexOf('\n', accStart - 1);
      content = content.substring(0, lineStart) + content.substring(endPos);
      console.log('  [REMOVED] Investor accordion from landing');
    }
  }
  return content;
}

// --- Step 5: Remove demo hero metrics and evidence base link ---
function removeDemoHeroContent(content) {
  // Remove "Interactive demo surfaces" metric
  content = content.replace(
    /\s*<div class="hero-metrics">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
    ''
  );
  
  // Remove evidence-base link in hero
  content = content.replace(
    /\s*<div class="text-center mb-4">\s*<a href="#" data-nav="evidence-base"[^>]*>[^<]*<\/a>\s*<\/div>/,
    ''
  );
  
  console.log('  [REMOVED] Demo hero metrics and evidence link');
  return content;
}

// --- Step 6: Update footer links ---
function updateFooterLinks(content) {
  // Remove Security and Compliance links from footer that point to removed screens
  content = content.replace(
    /\s*<span>·<\/span>\s*\n\s*<button data-nav="security-command-center"[^>]*>[^<]*<\/button>/,
    ''
  );
  content = content.replace(
    /\s*<span>·<\/span>\s*\n\s*<button data-nav="compliance-posture"[^>]*>[^<]*<\/button>/,
    ''
  );
  // Remove "Synthetic Demo Data Only" text
  content = content.replace(
    /\s*<span>·<\/span>\s*\n\s*<span class="text-slate-500">Synthetic Demo Data Only<\/span>/,
    ''
  );
  console.log('  [UPDATED] Footer links cleaned');
  return content;
}

// --- Step 7: Remove the entire demo panel ---
function removeDemoPanel(content) {
  const panelStart = content.indexOf('<div id="demo-panel"');
  if (panelStart === -1) return content;
  
  // Find the comment before it
  const commentStart = content.lastIndexOf('<!-- Demo Control Panel -->', panelStart);
  const actualStart = commentStart !== -1 ? commentStart : panelStart;
  const lineStart = content.lastIndexOf('\n', actualStart - 1);
  
  // Find closing </div> of the demo-panel (nested)
  let depth = 0;
  let pos = panelStart;
  let endPos = -1;
  while (pos < content.length) {
    const nextOpen = content.indexOf('<div', pos);
    const nextClose = content.indexOf('</div>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        endPos = content.indexOf('\n', nextClose);
        break;
      }
      pos = nextClose + 6;
    }
  }
  
  if (endPos !== -1) {
    content = content.substring(0, lineStart) + content.substring(endPos);
    console.log('  [REMOVED] Entire demo control panel');
  }
  return content;
}

// --- Execute all steps ---
console.log('=== Stripping demo screens from index.html ===');
console.log(`Original: ${lines.length} lines`);

let result = html;
result = removeScreenSections(result);
result = removeDemoPanel(result);
result = removeDemoNavButtons(result);
result = removeQuickNavButtons(result);
result = removeInvestorAccordion(result);
result = removeDemoHeroContent(result);
result = updateFooterLinks(result);

// Clean up multiple blank lines
result = result.replace(/\n{4,}/g, '\n\n');

const newLines = result.split('\n').length;
console.log(`\nResult: ${newLines} lines (removed ${lines.length - newLines} lines)`);

writeFileSync(htmlPath, result, 'utf-8');
console.log('Saved to', htmlPath);
