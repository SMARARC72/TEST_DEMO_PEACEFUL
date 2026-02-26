/**
 * Main Entry Point - Exposes all demo functions globally for onclick handlers
 * Part of Peacefull.ai Demo technical debt cleanup
 */

// Import all modules
import { state } from './state.js';
import { showScreen, showToast } from './helpers.js';
import {
  renderSubmissionSurfaces,
  renderTriageQueue,
  renderMemoryReview,
  renderTreatmentPlan,
  renderEnterpriseGovernance,
  renderSecurityCommandCenter,
  renderDecisionRoom
} from './render.js';
import * as actions from './actions.js';
import { initEventDelegation } from './events.js';

// Expose to global scope for inline onclick handlers
window.showScreen = showScreen;
window.showToast = showToast;

// Demo panel
window.toggleDemoPanel = actions.toggleDemoPanel;

// Consent/journal
window.checkConsents = actions.checkConsents;
window.checkJournal = actions.checkJournal;
window.saveJournal = actions.saveJournal;

// Sliders/check-in
window.updateSlider = actions.updateSlider;
window.submitCheckin = actions.submitCheckin;

// Voice recording
window.toggleRecording = actions.toggleRecording;
window.uploadVoice = actions.uploadVoice;

// MFA
window.checkMFA = actions.checkMFA;

// Demo controls
window.updateSystemStatus = actions.updateSystemStatus;
window.updateSafetyTier = actions.updateSafetyTier;
window.updateInboxStatus = actions.updateInboxStatus;
window.updateSummaryStatus = actions.updateSummaryStatus;
window.updateRecStatus = actions.updateRecStatus;
window.updateExportStatus = actions.updateExportStatus;
window.updateVoiceStatus = actions.updateVoiceStatus;

// Triage queue
window.selectTriageItem = actions.selectTriageItem;
window.updateTriageStatus = actions.updateTriageStatus;
window.resetTriageQueue = actions.resetTriageQueueAction;

// Memory review
window.selectMemory = actions.selectMemory;
window.updateMemoryStatus = actions.updateMemoryStatus;
window.resetMemoryReview = actions.resetMemoryReviewAction;

// Treatment plan
window.selectPlan = actions.selectPlan;
window.updatePlanStatus = actions.updatePlanStatus;
window.resetTreatmentPlan = actions.resetTreatmentPlanAction;

// Enterprise governance
window.selectEnterprise = actions.selectEnterprise;
window.updateEnterpriseStatus = actions.updateEnterpriseStatus;
window.resetEnterpriseGovernance = actions.resetEnterpriseGovernanceAction;

// Inbox/draft actions
window.acknowledgeAlert = actions.acknowledgeAlert;
window.resolveAlert = actions.resolveAlert;
window.escalateAlert = actions.escalateAlert;
window.markReviewed = actions.markReviewed;
window.useWithCaution = actions.useWithCaution;
window.retainDraft = actions.retainDraft;
window.rejectSummary = actions.rejectSummary;
window.escalateSummary = actions.escalateSummary;

// Export
window.showExportConfirmation = actions.showExportConfirmation;
window.hideExportConfirmation = actions.hideExportConfirmation;
window.generateExport = actions.generateExport;

// ROI
window.setROIMode = actions.setROIMode;
window.toggleAssumption = actions.toggleAssumption;

// Security Command Center
window.updateMfaMethod = actions.updateMfaMethod;
window.validateBackupCode = actions.validateBackupCode;
window.triggerStepUpAuth = actions.triggerStepUpAuth;
window.validateSmartContractArtifact = actions.validateSmartContractArtifact;
window.verifyMerkleRootPath = actions.verifyMerkleRootPath;
window.resetSecurityState = actions.resetSecurityStateAction;

// Decision Room
window.generateProcurementPacket = actions.generateProcurementPacket;
window.resetDecisionRoomState = actions.resetDecisionRoomStateAction;

// Full demo reset
window.resetDemo = actions.resetDemo;

// State accessor (for debugging if needed)
window.demoState = state;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize event delegation (Step 2 tech debt)
  initEventDelegation();
  
  // Initial renders
  renderSubmissionSurfaces();
  renderTriageQueue();
  renderMemoryReview();
  renderTreatmentPlan();
  renderEnterpriseGovernance();
  renderSecurityCommandCenter();
  renderDecisionRoom();
  
  // MFA input navigation
  const mfaInputs = document.querySelectorAll('#clinician-mfa input');
  mfaInputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      if (input.value.length === 1 && i < mfaInputs.length - 1) {
        mfaInputs[i + 1].focus();
      }
    });
  });
  
  console.log('Peacefull.ai Demo initialized (modular)');
});
