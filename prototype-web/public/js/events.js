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
  
  // MBC Dashboard (F1)
  'add-mbc-note': actions.addMBCNote,
  'reset-mbc-dashboard': actions.resetMBCDashboardAction,
  
  // Adherence Tracker (F2)
  'log-adherence-completion': actions.logAdherenceCompletion,
  'reset-adherence': actions.resetAdherenceAction,
  
  // Guided Demo (F3)
  'start-guided-demo': actions.startGuidedDemo,
  'advance-guided-demo': actions.advanceGuidedDemo,
  'reset-guided-demo': actions.resetGuidedDemoAction,
  
  // Escalation Protocols (F5)
  'acknowledge-escalation': actions.acknowledgeEscalation,
  'resolve-escalation': actions.resolveEscalation,
  'reset-escalation': actions.resetEscalationAction,

  // Chat Simulation (F-P5)
  'advance-chat': actions.advanceChat,
  'reset-chat': actions.resetChatAction,

  // Onboarding (F-P8)
  'onboarding-next': actions.onboardingNext,
  'onboarding-back': actions.onboardingBack,
  
  // Full reset
  'reset-demo': actions.resetDemo,
};

/**
 * Initialize event delegation on the document body.
 * Handles clicks on elements with data-nav or data-action attributes.
 */
export function initEventDelegation() {
  document.body.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav], [data-action], [data-journal-prompt], [data-patient-profile], [data-triage-status], [data-memory-status], [data-plan-status], [data-enterprise-status], [data-roi-mode], [data-step-up], [data-toggle-assumption], [data-toast], [data-resource-filter], [data-resource-expand], [data-history-filter], [data-history-expand], [data-safety-step], [data-pmem-filter], [data-pmem-expand], [data-evidence-filter], [data-evidence-expand], [data-topic-id], [data-journal-filter]');
    if (!target) return;

    const journalPrompt = target.dataset.journalPrompt;
    if (journalPrompt) {
      event.preventDefault();
      actions.applyJournalPrompt(journalPrompt);
      return;
    }

    // Profile selection: data-patient-profile="profile-id"
    const patientProfile = target.dataset.patientProfile;
    if (patientProfile) {
      actions.selectPatientProfile(patientProfile);
    }
    
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

    // Resource filter
    const resourceFilter = target.dataset.resourceFilter;
    if (resourceFilter) {
      event.preventDefault();
      actions.setResourceFilter(resourceFilter);
      return;
    }

    // Resource expand
    const resourceExpand = target.dataset.resourceExpand;
    if (resourceExpand) {
      event.preventDefault();
      actions.toggleResourceExpand(resourceExpand);
      return;
    }

    // History filter
    const historyFilter = target.dataset.historyFilter;
    if (historyFilter) {
      event.preventDefault();
      actions.setHistoryFilter(historyFilter);
      return;
    }

    // History expand
    const historyExpand = target.dataset.historyExpand;
    if (historyExpand) {
      event.preventDefault();
      actions.toggleHistoryExpand(historyExpand);
      return;
    }

    // Safety plan step toggle
    const safetyStep = target.dataset.safetyStep;
    if (safetyStep !== undefined) {
      event.preventDefault();
      actions.toggleSafetyStep(parseInt(safetyStep));
      return;
    }

    // Patient memory filter
    const pmemFilter = target.dataset.pmemFilter;
    if (pmemFilter) {
      event.preventDefault();
      actions.setPatientMemoryFilter(pmemFilter);
      return;
    }

    // Patient memory expand
    const pmemExpand = target.dataset.pmemExpand;
    if (pmemExpand) {
      event.preventDefault();
      actions.togglePatientMemoryExpand(pmemExpand);
      return;
    }

    // Evidence filter
    const evidenceFilter = target.dataset.evidenceFilter;
    if (evidenceFilter) {
      event.preventDefault();
      actions.setEvidenceFilter(evidenceFilter);
      return;
    }

    // Evidence expand
    const evidenceExpand = target.dataset.evidenceExpand;
    if (evidenceExpand) {
      event.preventDefault();
      actions.toggleEvidenceExpand(evidenceExpand);
      return;
    }

    // Journal prompt filter
    const journalFilterVal = target.dataset.journalFilter;
    if (journalFilterVal) {
      event.preventDefault();
      actions.setJournalFilter(journalFilterVal);
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

    if (target.id === 'patient-session-profile') {
      actions.setPatientSessionProfile(target.value);
      return;
    }

    // Session prep topic checkboxes
    const topicId = target.dataset.topicId;
    if (topicId) {
      actions.toggleSessionTopic(topicId);
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
