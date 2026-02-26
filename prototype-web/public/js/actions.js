/**
 * Actions Module - Event handlers and state update functions
 * Part of Peacefull.ai Demo technical debt cleanup
 */

import { 
  state,
  baselineSubmissionState,
  baselineTriageQueue,
  baselineMemoryItems,
  baselinePlanItems,
  baselineEnterpriseItems,
  baselineSecurityState,
  baselineDecisionRoomState
} from './state.js';
import { showToast, showScreen, computeReadinessVerdict, getSelectedTriageItem, getSelectedMemory, getSelectedPlan } from './helpers.js';
import { 
  renderSubmissionSurfaces, 
  renderTriageQueue, 
  renderMemoryReview, 
  renderTreatmentPlan, 
  renderEnterpriseGovernance, 
  renderSecurityCommandCenter,
  renderDecisionRoom,
  renderClinicianPatientProfile
} from './render.js';

// ============ DEMO PANEL ============

export function toggleDemoPanel() {
  const panel = document.getElementById('demo-panel');
  const chevron = document.getElementById('demo-chevron');
  if (panel) panel.classList.toggle('collapsed');
  if (chevron) chevron.style.transform = panel && panel.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0)';
}

// ============ CONSENT / JOURNAL ============

export function checkConsents() {
  const checks = document.querySelectorAll('.consent-check');
  const allChecked = Array.from(checks).every(c => c.checked);
  const btn = document.getElementById('consent-btn');
  if (btn) {
    btn.disabled = !allChecked;
    btn.className = allChecked ? 'w-full py-4 rounded-xl font-semibold btn-primary text-white transition-all' : 'w-full py-4 rounded-xl font-semibold bg-slate-300 text-slate-500 transition-all';
  }
}

export function checkJournal() {
  const textEl = document.getElementById('journal-text');
  const text = textEl ? textEl.value : '';
  const btn = document.getElementById('save-journal');
  const banner = document.getElementById('draft-banner');
  if (btn) {
    btn.disabled = text.length < 10;
    btn.className = text.length >= 10 ? 'w-full mt-6 py-4 rounded-xl font-semibold btn-primary text-white transition-all' : 'w-full mt-6 py-4 rounded-xl font-semibold bg-slate-300 text-slate-500 transition-all';
  }
  if (banner) banner.classList.toggle('hidden', text.length < 10);
}

// ============ SUBMISSION PROCESSING ============

export function processSubmission(source, patientPayload, clinicianPayload) {
  const now = new Date().toISOString();
  state.latestSubmission = {
    id: `sub-${now.slice(11,19).replace(/:/g,'')}`,
    source,
    status: 'CLINICIAN_VISIBLE',
    patientReport: patientPayload,
    clinicianReport: clinicianPayload,
  };
  renderSubmissionSurfaces();
  addSubmissionToTriage(source, patientPayload.summary, clinicianPayload.signalBand);
  showScreen('patient-submission-success');
}

export function saveJournal() {
  const textEl = document.getElementById('journal-text');
  const text = textEl ? textEl.value.trim() : '';
  processSubmission(
    'JOURNAL',
    {
      tone: 'Thanks for sharing this. Your reflection was received and prepared for clinician-supervised review.',
      summary: text ? `What I heard: ${text.slice(0, 110)}${text.length > 110 ? '…' : ''}` : 'What I heard: You shared an emotionally difficult day with continued effort to cope.',
      nextStep: 'Suggested next step: add one coping action you want to try before your next session.'
    },
    {
      signalBand: 'GUARDED',
      summary: 'Journal indicates elevated stress narrative with intact forward-looking engagement.',
      evidence: 'Journal segment ref #J-NEW-01 and lexical stress cues set #L-4.',
      unknowns: 'No concurrent voice corroboration yet; sleep impact not fully specified.'
    }
  );
  showToast('Journal entry saved and routed for clinician review');
}

// ============ SLIDERS / CHECK-IN ============

export function updateSlider(type, value) {
  const el = document.getElementById(type + '-value');
  if (el) el.textContent = value;
}

export function submitCheckin() {
  showToast('Check-in submitted');
  setTimeout(() => showScreen('patient-home'), 1000);
}

// ============ VOICE RECORDING ============

export function toggleRecording() {
  state.recording = !state.recording;
  const btn = document.getElementById('record-btn');
  const recordIcon = document.getElementById('record-icon');
  const stopIcon = document.getElementById('stop-icon');
  const text = document.getElementById('record-text');
  const time = document.getElementById('record-time');
  const waveform = document.getElementById('waveform');
  const uploadBtn = document.getElementById('upload-btn');
  
  if (state.recording) {
    if (btn) btn.classList.add('recording-active');
    if (recordIcon) recordIcon.classList.add('hidden');
    if (stopIcon) stopIcon.classList.remove('hidden');
    if (text) text.textContent = 'Recording...';
    if (waveform) waveform.classList.remove('hidden');
    state.recordSeconds = 0;
    state.recordInterval = setInterval(() => {
      state.recordSeconds++;
      const mins = Math.floor(state.recordSeconds / 60);
      const secs = state.recordSeconds % 60;
      if (time) time.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  } else {
    if (btn) btn.classList.remove('recording-active');
    if (recordIcon) recordIcon.classList.remove('hidden');
    if (stopIcon) stopIcon.classList.add('hidden');
    if (text) text.textContent = 'Recording complete';
    if (waveform) waveform.classList.add('hidden');
    if (uploadBtn) uploadBtn.classList.remove('hidden');
    clearInterval(state.recordInterval);
  }
}

export function uploadVoice() {
  processSubmission(
    'VOICE_MEMO',
    {
      tone: 'Voice memo received. A supportive summary is now available while your clinician view updates internally.',
      summary: 'What I heard: you described feeling overwhelmed today while still seeking support and structure.',
      nextStep: 'Suggested next step: complete a brief check-in later today to track whether stress intensity changes.'
    },
    {
      signalBand: 'MODERATE',
      summary: 'Voice memo indicates high emotional load with coherent speech and help-seeking language.',
      evidence: 'Voice transcript segment #V-NEW-01, pacing marker set #P-3.',
      unknowns: 'Context for trigger onset timing remains incomplete; follow-up prompt suggested.'
    }
  );
  showToast('Voice note uploaded and routed for clinician review');
}

// ============ MFA ============

export function checkMFA() {
  const inputs = document.querySelectorAll('#clinician-mfa input');
  const allFilled = Array.from(inputs).every(i => i.value.length === 1);
  const btn = document.getElementById('mfa-btn');
  if (btn) {
    btn.disabled = !allFilled;
    btn.className = allFilled ? 'w-full max-w-sm py-4 rounded-xl font-semibold btn-coral text-white transition-all' : 'w-full max-w-sm py-4 rounded-xl font-semibold bg-slate-700 text-slate-500 transition-all';
  }
}

// ============ DEMO CONTROLS ============

export function updateSystemStatus() {
  const statusEl = document.getElementById('system-status');
  const status = statusEl ? statusEl.value : 'normal';
  const banner = document.getElementById('degraded-banner');
  if (banner) {
    banner.classList.toggle('hidden', status !== 'degraded');
  }
  showToast('System status: ' + status.toUpperCase());
}

export function updateSafetyTier() { showToast('Safety tier updated'); }
export function updateInboxStatus() { showToast('Inbox status updated'); }
export function updateSummaryStatus() { showToast('Summary status updated'); }
export function updateRecStatus() { showToast('Recommendation status updated'); }
export function updateExportStatus() { showToast('Export status updated'); }
export function updateVoiceStatus() { showToast('Voice status updated'); }

// ============ TRIAGE QUEUE ============

export function selectTriageItem(id) {
  state.selectedTriageId = id;
  renderTriageQueue();
}

export function updateTriageStatus(status) {
  const selected = getSelectedTriageItem();
  if (!selected) {
    showToast('No triage item selected');
    return;
  }
  selected.status = status;
  selected.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  renderTriageQueue();
  showToast(`Triage status updated: ${status}`);
}

export function addSubmissionToTriage(source, summary, signalBand) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const nextId = `triage-${Date.now()}`;
  const item = {
    id: nextId,
    patient: 'Current Patient Session',
    source,
    signalBand,
    summary,
    status: 'ACK',
    updatedAt: now
  };
  state.triageQueue.unshift(item);
  state.selectedTriageId = nextId;
  renderTriageQueue();
}

export function resetTriageQueueAction() {
  state.triageQueue = JSON.parse(JSON.stringify(baselineTriageQueue));
  state.selectedTriageId = state.triageQueue[0].id;
  renderTriageQueue();
}

// ============ MEMORY REVIEW ============

export function selectMemory(id) {
  state.selectedMemoryId = id;
  renderMemoryReview();
}

export function updateMemoryStatus(status) {
  state.memoryItems = state.memoryItems.map(item => item.id === state.selectedMemoryId
    ? { ...item, status, conflict: status === 'CONFLICT_FLAGGED', audit: [...item.audit, `Clinician set status to ${status} at ${new Date().toISOString()}.`] }
    : item
  );
  showToast(`Memory status updated: ${status}`);
  renderMemoryReview();
}

export function resetMemoryReviewAction() {
  state.memoryItems = JSON.parse(JSON.stringify(baselineMemoryItems));
  state.selectedMemoryId = state.memoryItems[0].id;
  renderMemoryReview();
}

// ============ TREATMENT PLAN ============

export function selectPlan(id) {
  state.selectedPlanId = id;
  renderTreatmentPlan();
}

export function updatePlanStatus(status) {
  state.planItems = state.planItems.map(item => item.id === state.selectedPlanId
    ? { ...item, status, audit: [...item.audit, `Clinician set plan status to ${status} at ${new Date().toISOString()}.`] }
    : item
  );
  showToast(`Treatment plan status updated: ${status}`);
  renderTreatmentPlan();
}

export function resetTreatmentPlanAction() {
  state.planItems = JSON.parse(JSON.stringify(baselinePlanItems));
  state.selectedPlanId = state.planItems[0].id;
  renderTreatmentPlan();
}

// ============ ENTERPRISE GOVERNANCE ============

export function selectEnterprise(id) {
  state.selectedEnterpriseId = id;
  renderEnterpriseGovernance();
}

export function updateEnterpriseStatus(status) {
  state.enterpriseItems = state.enterpriseItems.map(item => item.id === state.selectedEnterpriseId
    ? { ...item, status, auditLog: [...item.auditLog, `Enterprise reviewer set status to ${status} at ${new Date().toISOString()}.`] }
    : item
  );
  showToast(`Enterprise package status: ${status}`);
  renderEnterpriseGovernance();
}

export function resetEnterpriseGovernanceAction() {
  state.enterpriseItems = JSON.parse(JSON.stringify(baselineEnterpriseItems));
  state.selectedEnterpriseId = state.enterpriseItems[0].id;
  renderEnterpriseGovernance();
}

// ============ CLINICIAN PATIENT PROFILE ============

export function selectPatientProfile(profileId) {
  state.selectedPatientProfile = profileId || 'maria';
  renderClinicianPatientProfile();
}

// ============ INBOX / DRAFT ACTIONS ============

export function acknowledgeAlert() { showToast('Alert acknowledged'); }
export function resolveAlert() { showToast('Alert resolved'); }
export function escalateAlert() { showToast('Alert escalated to supervisor'); }
export function markReviewed() { showToast('Summary marked as reviewed'); }
export function useWithCaution() { showToast('Summary flagged: Use with caution'); }
export function retainDraft() { showToast('Summary retained as draft'); }
export function rejectSummary() { showToast('Summary rejected'); }
export function escalateSummary() { showToast('Summary escalated for review'); }

// ============ EXPORT ============

export function showExportConfirmation() {
  const el = document.getElementById('export-confirmation');
  if (el) el.classList.remove('hidden');
}

export function hideExportConfirmation() {
  const el = document.getElementById('export-confirmation');
  if (el) el.classList.add('hidden');
}

export function generateExport() {
  const confirmEl = document.getElementById('segmentation-confirm');
  const confirmed = confirmEl ? confirmEl.checked : false;
  if (!confirmed) {
    showToast('Please confirm segmentation');
    return;
  }
  showToast('Export generated successfully');
  hideExportConfirmation();
}

// ============ ROI ============

export function setROIMode(mode) {
  state.roiMode = mode;
  const pilotBtn = document.getElementById('roi-toggle-pilot');
  const projBtn = document.getElementById('roi-toggle-proj');
  if (pilotBtn) pilotBtn.className = mode === 'pilot' ? 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-amber-200 text-amber-800 rounded-lg text-sm font-medium';
  if (projBtn) projBtn.className = mode === 'projection' ? 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-amber-200 text-amber-800 rounded-lg text-sm font-medium';
  
  const m1 = document.getElementById('roi-metric-1');
  const m2 = document.getElementById('roi-metric-2');
  const m3 = document.getElementById('roi-metric-3');
  if (mode === 'pilot') {
    if (m1) m1.textContent = '5.2';
    if (m2) m2.textContent = '340%';
    if (m3) m3.textContent = '$1.6M';
  } else {
    if (m1) m1.textContent = '4.0';
    if (m2) m2.textContent = '250%';
    if (m3) m3.textContent = '$1.2M';
  }
}

export function toggleAssumption(id) {
  const el = document.getElementById('assumption-' + id);
  if (el) el.classList.toggle('hidden');
}

// ============ SECURITY COMMAND CENTER ============

export function appendSecurityAuditEvent(event) {
  state.securityState.auditLog.unshift({ ts: new Date().toISOString(), event });
  if (state.securityState.auditLog.length > 200) state.securityState.auditLog.length = 200;
  renderSecurityCommandCenter();
}

export function updateMfaMethod() {
  const sel = document.getElementById('mfa-method');
  if (!sel) return;
  state.securityState.mfaMethod = sel.value;
  appendSecurityAuditEvent(`MFA method set to ${sel.value}`);
  renderSecurityCommandCenter();
  showToast(`MFA method set to ${sel.value} (demo)`);
}

export function validateBackupCode() {
  const input = document.getElementById('backup-code');
  if (!input) return;
  const v = input.value.trim();
  const ok = v === state.securityState.backupCode || v === 'DEMO-0000';
  appendSecurityAuditEvent(`Backup code validation attempted: ${ok ? 'ACCEPTED' : 'REJECTED'}`);
  showToast(`Backup code ${ok ? 'accepted' : 'rejected'} (demo)`);
  renderSecurityCommandCenter();
}

export function triggerStepUpAuth(reason) {
  state.securityState.lastStepUp = { ts: new Date().toISOString(), reason };
  appendSecurityAuditEvent(`Step-up auth triggered for ${reason}`);
  showToast('Step-up authentication (simulated)');
  renderSecurityCommandCenter();
}

export function validateSmartContractArtifact() {
  const versionEl = document.getElementById('contract-version');
  const signatureEl = document.getElementById('signature-hash');
  const version = versionEl ? versionEl.value : '';
  const signature = signatureEl ? signatureEl.value : '';
  let status = 'REVIEW_REQUIRED';
  if (/00$/.test(signature)) status = 'VALID';
  if (/ff$/.test(signature)) status = 'INVALID';
  state.securityState.contractValidation = { version, signature, status, evidence: `Simulated check on ${new Date().toISOString()}` };
  appendSecurityAuditEvent(`Contract validation: ${status} (v${version})`);
  renderSecurityCommandCenter();
  showToast(`Contract ${status} (simulated)`);
}

export function verifyMerkleRootPath() {
  const leafEl = document.getElementById('merkle-leaf');
  const rootEl = document.getElementById('merkle-root');
  const pathEl = document.getElementById('merkle-path');
  const leaf = leafEl ? leafEl.value : '';
  const root = rootEl ? rootEl.value : '';
  const path = pathEl ? pathEl.value : '';
  let result = 'UNKNOWN';
  if (leaf && root && root.indexOf(leaf.slice(0,4)) !== -1) result = 'VALID';
  else if (leaf && root && root.indexOf('dead') !== -1) result = 'INVALID';
  else result = 'REVIEW_REQUIRED';
  state.securityState.merkleVerification = { leaf, root, path, result };
  appendSecurityAuditEvent(`Merkle verification: ${result}`);
  renderSecurityCommandCenter();
  showToast(`Merkle verification: ${result} (simulated)`);
}

export function resetSecurityStateAction() {
  state.securityState = JSON.parse(JSON.stringify(baselineSecurityState));
  renderSecurityCommandCenter();
  appendSecurityAuditEvent('Security demo state reset to baseline');
}

// ============ DECISION ROOM ============

export function generateProcurementPacket() {
  const packet = {
    controlsChecklist: ['MFA enabled', 'Audit logging', 'BAA-compliant cloud', 'Segregation enforced'],
    latestAuditHighlights: state.securityState.auditLog.slice(0,3).map(e => e.event),
    knownUnknowns: ['Regulatory approval timing', 'Third-party contract reviews pending'],
    decisionRecommendation: computeReadinessVerdict()
  };
  state.decisionRoomState.packet = packet;
  renderDecisionRoom();
  showToast('Procurement packet generated (demo)');
}

export function resetDecisionRoomStateAction() {
  state.decisionRoomState = JSON.parse(JSON.stringify(baselineDecisionRoomState));
  renderDecisionRoom();
}

// ============ FULL DEMO RESET ============

export function resetDemo() {
  const sysEl = document.getElementById('system-status'); if (sysEl) sysEl.value = 'normal';
  const tierEl = document.getElementById('safety-tier'); if (tierEl) tierEl.value = 'T2';
  const inboxEl = document.getElementById('inbox-status'); if (inboxEl) inboxEl.value = 'OPEN';
  const summaryEl = document.getElementById('summary-status'); if (summaryEl) summaryEl.value = 'DRAFT';
  const recEl = document.getElementById('rec-status'); if (recEl) recEl.value = 'SUPPRESSED';
  const exportEl = document.getElementById('export-status'); if (exportEl) exportEl.value = 'BLOCKED_POLICY';
  const voiceEl = document.getElementById('voice-status'); if (voiceEl) voiceEl.value = 'PROCESSING';
  const banner = document.getElementById('degraded-banner');
  if (banner) banner.classList.add('hidden');
  
  // Reset all state modules
  state.latestSubmission = JSON.parse(JSON.stringify(baselineSubmissionState));
  renderSubmissionSurfaces();
  
  state.triageQueue = JSON.parse(JSON.stringify(baselineTriageQueue));
  state.selectedTriageId = state.triageQueue[0].id;
  renderTriageQueue();
  
  state.memoryItems = JSON.parse(JSON.stringify(baselineMemoryItems));
  state.selectedMemoryId = state.memoryItems[0].id;
  renderMemoryReview();
  
  state.planItems = JSON.parse(JSON.stringify(baselinePlanItems));
  state.selectedPlanId = state.planItems[0].id;
  renderTreatmentPlan();
  
  state.enterpriseItems = JSON.parse(JSON.stringify(baselineEnterpriseItems));
  state.selectedEnterpriseId = state.enterpriseItems[0].id;
  renderEnterpriseGovernance();
  
  state.securityState = JSON.parse(JSON.stringify(baselineSecurityState));
  renderSecurityCommandCenter();
  appendSecurityAuditEvent('Security demo state reset to baseline');
  
  state.decisionRoomState = JSON.parse(JSON.stringify(baselineDecisionRoomState));
  renderDecisionRoom();

  state.selectedPatientProfile = 'maria';
  renderClinicianPatientProfile();
  
  showToast('Demo reset to defaults');
}
