/**
 * Events Module - Centralized event delegation
 * Part of Peacefull.ai Demo technical debt cleanup - Step 2
 */

import { showScreen, showToast } from './helpers.js';
import * as actions from './actions.js';

/**
 * Action registry mapping data-action values to handler functions.
 * Add entries here to support new delegated actions.
 */
const actionRegistry = {
  // Demo panel
  'toggle-demo-panel': actions.toggleDemoPanel,
  
  // Consent/journal
  'save-journal': actions.saveJournal,
  'submit-checkin': actions.submitCheckin,
  
  // Voice
  'toggle-recording': actions.toggleRecording,
  'upload-voice': actions.uploadVoice,
  
  // Demo controls
  'update-system-status': actions.updateSystemStatus,
  'update-safety-tier': actions.updateSafetyTier,
  'update-inbox-status': actions.updateInboxStatus,
  'update-summary-status': actions.updateSummaryStatus,
  'update-rec-status': actions.updateRecStatus,
  'update-export-status': actions.updateExportStatus,
  'update-voice-status': actions.updateVoiceStatus,
  
  // Triage
  'reset-triage-queue': actions.resetTriageQueueAction,
  
  // Memory
  'reset-memory-review': actions.resetMemoryReviewAction,
  
  // Treatment plan
  'reset-treatment-plan': actions.resetTreatmentPlanAction,
  
  // Enterprise
  'reset-enterprise-governance': actions.resetEnterpriseGovernanceAction,
  
  // Inbox/draft actions
  'acknowledge-alert': actions.acknowledgeAlert,
  'resolve-alert': actions.resolveAlert,
  'escalate-alert': actions.escalateAlert,
  'mark-reviewed': actions.markReviewed,
  'use-with-caution': actions.useWithCaution,
  'retain-draft': actions.retainDraft,
  'reject-summary': actions.rejectSummary,
  'escalate-summary': actions.escalateSummary,
  
  // Export
  'show-export-confirmation': actions.showExportConfirmation,
  'hide-export-confirmation': actions.hideExportConfirmation,
  'generate-export': actions.generateExport,
  
  // Security
  'update-mfa-method': actions.updateMfaMethod,
  'validate-backup-code': actions.validateBackupCode,
  'validate-contract': actions.validateSmartContractArtifact,
  'verify-merkle': actions.verifyMerkleRootPath,
  'reset-security-state': actions.resetSecurityStateAction,
  
  // Decision room
  'generate-procurement-packet': actions.generateProcurementPacket,
  'reset-decision-room': actions.resetDecisionRoomStateAction,
  
  // Full reset
  'reset-demo': actions.resetDemo,
};

/**
 * Initialize event delegation on the document body.
 * Handles clicks on elements with data-nav or data-action attributes.
 */
export function initEventDelegation() {
  document.body.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav], [data-action], [data-triage-status], [data-memory-status], [data-plan-status], [data-enterprise-status], [data-roi-mode], [data-step-up], [data-toggle-assumption], [data-toast]');
    if (!target) return;
    
    // Navigation: data-nav="screen-id"
    const nav = target.dataset.nav;
    if (nav) {
      event.preventDefault();
      showScreen(nav);
      return;
    }
    
    // Generic action: data-action="action-name"
    const action = target.dataset.action;
    if (action && actionRegistry[action]) {
      event.preventDefault();
      actionRegistry[action]();
      return;
    }
    
    // Triage status: data-triage-status="STATUS"
    const triageStatus = target.dataset.triageStatus;
    if (triageStatus) {
      event.preventDefault();
      actions.updateTriageStatus(triageStatus);
      return;
    }
    
    // Memory status: data-memory-status="STATUS"
    const memoryStatus = target.dataset.memoryStatus;
    if (memoryStatus) {
      event.preventDefault();
      actions.updateMemoryStatus(memoryStatus);
      return;
    }
    
    // Plan status: data-plan-status="STATUS"
    const planStatus = target.dataset.planStatus;
    if (planStatus) {
      event.preventDefault();
      actions.updatePlanStatus(planStatus);
      return;
    }
    
    // Enterprise status: data-enterprise-status="STATUS"
    const enterpriseStatus = target.dataset.enterpriseStatus;
    if (enterpriseStatus) {
      event.preventDefault();
      actions.updateEnterpriseStatus(enterpriseStatus);
      return;
    }
    
    // ROI mode: data-roi-mode="pilot|projection"
    const roiMode = target.dataset.roiMode;
    if (roiMode) {
      event.preventDefault();
      actions.setROIMode(roiMode);
      return;
    }
    
    // Step-up auth: data-step-up="reason"
    const stepUp = target.dataset.stepUp;
    if (stepUp) {
      event.preventDefault();
      actions.triggerStepUpAuth(stepUp);
      return;
    }
    
    // Toggle assumption: data-toggle-assumption="id"
    const toggleAssumption = target.dataset.toggleAssumption;
    if (toggleAssumption) {
      event.preventDefault();
      actions.toggleAssumption(toggleAssumption);
      return;
    }
    
    // Toast message: data-toast="message"
    const toast = target.dataset.toast;
    if (toast) {
      event.preventDefault();
      showToast(toast);
      return;
    }
  });
  
  // Handle change events for select/checkbox via delegation
  document.body.addEventListener('change', (event) => {
    const target = event.target;
    
    // Consent checkboxes
    if (target.classList.contains('consent-check')) {
      actions.checkConsents();
      return;
    }
  });
  
  // Handle input events for text areas and inputs
  document.body.addEventListener('input', (event) => {
    const target = event.target;
    
    // Journal text area
    if (target.id === 'journal-text') {
      actions.checkJournal();
      return;
    }
    
    // Slider inputs
    if (target.dataset.slider) {
      actions.updateSlider(target.dataset.slider, target.value);
      return;
    }
    
    // MFA inputs
    if (target.closest('#clinician-mfa')) {
      actions.checkMFA();
      return;
    }
  });
  
  console.log('Event delegation initialized');
}
