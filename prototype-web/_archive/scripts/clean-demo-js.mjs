#!/usr/bin/env node
/**
 * Clean demo-related code from JS files after screen removal.
 * Removes imports, global assignments, render calls, and action handlers
 * for the 15 removed demo/investor screens.
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
        console.log(`  [WARN] "${search.substring(0, 60)}..." not found in ${filename}`);
      }
    } else {
      // Regex
      content = content.replace(search, replace);
    }
  }
  
  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  const newLen = content.split('\n').length;
  writeFileSync(path, content, 'utf-8');
  console.log(`  [${filename}] ${originalLen} → ${newLen} lines (removed ${originalLen - newLen})`);
}

console.log('=== Cleaning demo references from JS files ===\n');

// ─── index.js ───
cleanFile('index.js', [
  // Update header
  ['/**\n * Main Entry Point - Exposes all demo functions globally for onclick handlers\n * Part of Peacefull.ai Demo technical debt cleanup\n */',
   '/**\n * Main Entry Point - Exposes functions globally for onclick handlers\n */'],
  
  // Remove demo render imports
  ['  renderEnterpriseGovernance,\n  renderSecurityCommandCenter,\n  renderDecisionRoom,\n', ''],
  ['  renderGuidedDemo,\n  renderKPIPanel,\n', ''],
  ['  renderEvidenceBase,\n', ''],
  ['  renderInvestorFinancials,\n', ''],
  
  // Remove demo panel global
  ['// Demo panel\nwindow.toggleDemoPanel = actions.toggleDemoPanel;\n', ''],
  
  // Remove enterprise governance globals
  ['// Enterprise governance\nwindow.selectEnterprise = actions.selectEnterprise;\nwindow.updateEnterpriseStatus = actions.updateEnterpriseStatus;\nwindow.resetEnterpriseGovernance = actions.resetEnterpriseGovernanceAction;\n', ''],
  
  // Remove ROI globals
  ['// ROI\nwindow.setROIMode = actions.setROIMode;\nwindow.toggleAssumption = actions.toggleAssumption;\n', ''],
  
  // Remove Security Command Center globals
  ['// Security Command Center\nwindow.updateMfaMethod = actions.updateMfaMethod;\nwindow.validateBackupCode = actions.validateBackupCode;\nwindow.triggerStepUpAuth = actions.triggerStepUpAuth;\nwindow.validateSmartContractArtifact = actions.validateSmartContractArtifact;\nwindow.verifyMerkleRootPath = actions.verifyMerkleRootPath;\nwindow.resetSecurityState = actions.resetSecurityStateAction;\n', ''],
  
  // Remove Decision Room globals
  ['// Decision Room\nwindow.generateProcurementPacket = actions.generateProcurementPacket;\nwindow.resetDecisionRoomState = actions.resetDecisionRoomStateAction;\n', ''],
  
  // Remove Guided Demo globals
  ['// Guided Demo (F3)\nwindow.startGuidedDemo = actions.startGuidedDemo;\nwindow.advanceGuidedDemo = actions.advanceGuidedDemo;\nwindow.resetGuidedDemo = actions.resetGuidedDemoAction;\n', ''],
  
  // Remove full demo reset
  ['// Full demo reset\nwindow.resetDemo = actions.resetDemo;\n\n// State accessor (for debugging if needed)\nwindow.demoState = state;\n', ''],
  
  // Remove demo render calls
  ['  renderEnterpriseGovernance();\n  renderSecurityCommandCenter();\n  renderDecisionRoom();\n', ''],
  ['  renderGuidedDemo();\n  renderKPIPanel();\n', ''],
  ['  renderEvidenceBase();\n', ''],
  ['  renderInvestorFinancials();\n', ''],
  
  // Update console log
  ["console.log('Peacefull.ai Demo initialized (modular + API integration)');", "console.log('Peacefull.ai Clinical Platform initialized');"],
]);

// ─── events.js ───
cleanFile('events.js', [
  // Update header
  ['Part of Peacefull.ai Demo technical debt cleanup - Step 2', 'Centralized event delegation for clinical platform'],
  
  // Remove demo panel action
  ['  // Demo panel\n  \'toggle-demo-panel\': actions.toggleDemoPanel,\n', ''],
  
  // Remove enterprise governance action
  ['  // Enterprise\n  \'reset-enterprise-governance\': actions.resetEnterpriseGovernanceAction,\n', ''],
  
  // Remove security actions
  [/  \/\/ Security command center\n(?:  '[^']+': actions\.\w+,\n)+/g, ''],
  
  // Remove decision room actions
  [/  \/\/ Decision room\n(?:  '[^']+': actions\.\w+,\n)+/g, ''],
  
  // Remove guided demo actions
  [/  \/\/ Guided Demo \(F3\)\n(?:  '[^']+': actions\.\w+,\n)+/g, ''],
  
  // Remove reset-demo action
  [/  \/\/ Full reset\n  'reset-demo': actions\.resetDemo,\n/g, ''],
  
  // Remove ROI actions
  [/  \/\/ ROI\n(?:  '[^']+': actions\.\w+,\n)+/g, ''],
]);

// ─── state.js ───
cleanFile('state.js', [
  // Update header
  ['Part of Peacefull.ai Demo technical debt cleanup', 'Baseline states and mutable state initialization'],
  
  // Update demo mode text
  ["tone: 'Supportive reflection generated in demo mode.'", "tone: 'Supportive reflection generated by AI companion.'"],
  
  // Remove baselineSecurityState
  [/export const baselineSecurityState = \{[\s\S]*?\};\n/m, ''],
  
  // Remove baselineDecisionRoomState
  [/export const baselineDecisionRoomState = \{[\s\S]*?\};\n/m, ''],
  
  // Remove baselineEnterpriseItems
  [/export const baselineEnterpriseItems = \[[\s\S]*?\];\n/m, ''],
  
  // Remove baselineGuidedDemoState (we'll handle the exact text)
  [/export const baselineGuidedDemoState = \{[\s\S]*?\][\s\S]*?\};\n/m, ''],
  
  // Remove baselineInvestorFinancials
  [/export const baselineInvestorFinancials = \{[\s\S]*?\};\n\n/m, ''],
]);

// ─── helpers.js ───
cleanFile('helpers.js', [
  // Update header comments
  ['Helpers Module - Utility functions for the demo', 'Helpers Module - Utility functions'],
  ['Part of Peacefull.ai Demo technical debt cleanup', 'Clinical platform utilities'],
  
  // Remove decision room render call
  [/\s*if \(screenId === 'decision-room'[\s\S]*?window\.renderDecisionRoom\(\);\s*\}\n/m, '\n'],
]);

console.log('\n=== JS cleanup complete ===');
