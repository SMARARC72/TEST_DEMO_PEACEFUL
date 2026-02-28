#!/usr/bin/env node
/**
 * Clean demo action and render functions from JS files.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(__dirname, '../prototype-web/public/js');

function cleanFile(filename, replacements) {
  const path = resolve(jsDir, filename);
  let content = readFileSync(path, 'utf-8');
  const originalLen = content.split('\n').length;
  
  for (const [search, replace] of replacements) {
    if (typeof search === 'string') {
      if (content.includes(search)) {
        content = content.replace(search, replace);
      } else {
        console.log(`  [WARN] String not found in ${filename}: "${search.substring(0, 50)}..."`);
      }
    } else {
      const before = content;
      content = content.replace(search, replace);
      if (content === before) {
        console.log(`  [WARN] Regex not matched in ${filename}: ${search}`);
      }
    }
  }
  
  content = content.replace(/\n{3,}/g, '\n\n');
  const newLen = content.split('\n').length;
  writeFileSync(path, content, 'utf-8');
  console.log(`  [${filename}] ${originalLen} → ${newLen} lines (removed ${originalLen - newLen})`);
}

console.log('=== Cleaning actions.js and render.js ===\n');

// ─── actions.js ───
cleanFile('actions.js', [
  // Update header
  ['Part of Peacefull.ai Demo technical debt cleanup', 'Clinical platform action handlers'],
  
  // Remove demo imports
  ['  baselineEnterpriseItems,\n  baselineSecurityState,\n  baselineDecisionRoomState,\n', ''],
  ['  baselineGuidedDemoState,\n', ''],
  
  // Remove demo render imports
  ['  renderEnterpriseGovernance, \n  renderSecurityCommandCenter,\n  renderDecisionRoom,\n', ''],
  // Try alternate formatting
  ['  renderEnterpriseGovernance,\n  renderSecurityCommandCenter,\n  renderDecisionRoom,\n', ''],
  
  // Handle different formatting of render imports
  ['  renderGuidedDemo,\n  renderKPIPanel,\n', ''],
  ['  renderEvidenceBase,\n', ''],
  ['  renderInvestorFinancials,\n', ''],
  
  // Remove demo panel function
  [/\/\/ ============ DEMO PANEL ============\n\nexport function toggleDemoPanel\(\) \{[\s\S]*?\}\n/, ''],
  
  // Remove enterprise governance section
  [/\/\/ ============ ENTERPRISE GOVERNANCE ============\n\nexport function selectEnterprise[\s\S]*?renderEnterpriseGovernance\(\);\n\}\n/, ''],
  
  // Remove ROI section  
  [/\/\/ ============ ROI ============\n\nexport function setROIMode[\s\S]*?export function toggleAssumption[\s\S]*?\}\n/, ''],
  
  // Remove security command center section
  [/\/\/ ============ SECURITY COMMAND CENTER ============\n\nexport function appendSecurityAuditEvent[\s\S]*?renderSecurityCommandCenter\(\);\n\}\n/, ''],
  
  // Remove decision room section
  [/\/\/ ============ DECISION ROOM ============\n\nexport function generateProcurementPacket[\s\S]*?renderDecisionRoom\(\);\n\}\n/, ''],
  
  // Remove guided demo section
  [/\/\/ ============ GUIDED DEMO \(F3\) ============\n\nexport function startGuidedDemo[\s\S]*?renderGuidedDemo\(\);\n\}\n/, ''],
  
  // Clean up resetDemo function - remove refs to removed screens
  ['  state.enterpriseItems = JSON.parse(JSON.stringify(baselineEnterpriseItems));\n  state.selectedEnterpriseId = state.enterpriseItems[0].id;\n  renderEnterpriseGovernance();\n', ''],
  
  ['  state.securityState = JSON.parse(JSON.stringify(baselineSecurityState));\n  renderSecurityCommandCenter();\n  appendSecurityAuditEvent(\'Security demo state reset to baseline\');\n', ''],
  
  ['  state.decisionRoomState = JSON.parse(JSON.stringify(baselineDecisionRoomState));\n  renderDecisionRoom();\n', ''],
  
  ['  state.guidedDemoState = JSON.parse(JSON.stringify(baselineGuidedDemoState));\n  renderGuidedDemo();\n', ''],
  
  ['  state.kpiData = JSON.parse(JSON.stringify(baselineKPIData));\n  renderKPIPanel();\n', ''],
  
  ['  renderInvestorFinancials();\n', ''],
  
  // Clean up evidence filter state in resetDemo
  ['  state.evidenceFilter = \'All\';\n  state.expandedEvidenceId = null;\n', ''],
  
  // Rename resetDemo to resetState
  ['// ============ FULL DEMO RESET ============\n\nexport function resetDemo()',
   '// ============ STATE RESET ============\n\nexport function resetState()'],
  
  // Update toast
  ["showToast('Demo reset to defaults');", "showToast('State reset to defaults');"],
]);

// ─── render.js ─── Remove demo render functions
cleanFile('render.js', [
  // Update header
  [/Part of Peacefull\.ai Demo technical debt cleanup/g, 'Clinical platform render functions'],
  
  // Remove renderEnterpriseGovernance function
  [/export function renderEnterpriseGovernance\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderSecurityCommandCenter function
  [/export function renderSecurityCommandCenter\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderDecisionRoom function
  [/export function renderDecisionRoom\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderGuidedDemo function  
  [/export function renderGuidedDemo\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderKPIPanel function
  [/export function renderKPIPanel\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderEvidenceBase function
  [/export function renderEvidenceBase\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove renderInvestorFinancials function
  [/export function renderInvestorFinancials\(\) \{[\s\S]*?\n\}\n/m, ''],
  
  // Remove roi-dashboard references
  [/\s*const roiMemoryEl = document\.querySelector\('#roi-dashboard #roi-memory-signal'\);[\s\S]*?roiMemoryEl[\s\S]*?\n/m, '\n'],
]);

console.log('\n=== Phase 2 JS cleanup complete ===');
