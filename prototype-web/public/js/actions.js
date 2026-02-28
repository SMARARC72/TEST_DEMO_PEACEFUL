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
  baselineDecisionRoomState,
  baselineMBCScores,
  baselineAdherenceItems,
  baselineGuidedDemoState,
  baselineKPIData,
  baselineEscalationItems,
  baselineSessionPrep,
  baselineChatScript,
  baselineOnboardingSteps,
  baselineClinicianProfile,
  baselineSessionNotes,
  baselinePatientProfiles
} from './state.js';
import { showToast, showScreen, computeReadinessVerdict, getSelectedTriageItem, getSelectedMemory, getSelectedPlan, getSelectedMBC, getSelectedAdherence, getSelectedEscalation } from './helpers.js';
import { 
  renderSubmissionSurfaces, 
  renderTriageQueue, 
  renderMemoryReview, 
  renderTreatmentPlan, 
  renderEnterpriseGovernance, 
  renderSecurityCommandCenter,
  renderDecisionRoom,
  renderClinicianPatientProfile,
  renderMBCDashboard,
  renderAdherenceTracker,
  renderGuidedDemo,
  renderKPIPanel,
  renderEscalationProtocols,
  renderPatientHome,
  renderPatientProfile,
  renderSessionPrep,
  renderProgress,
  renderResources,
  renderChat,
  renderHistory,
  renderSafetyPlan,
  renderOnboarding,
  renderPatientMemoryView,
  renderEvidenceBase,
  renderClinicianAnalytics,
  renderPopulationHealth,
  renderSessionNotes,
  renderInvestorFinancials,
  renderRegulatoryHub,
  renderSDOHAssessment,
  renderCaregiverView
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

export function setPatientSessionProfile(profileId) {
  state.patientSessionProfile = profileId || 'maria';
  state.selectedPatientProfile = profileId || 'maria';
  // Re-render all patient-facing screens with new profile data
  renderPatientHome();
  renderPatientProfile();
  renderSessionPrep();
  renderProgress();
  renderHistory();
  renderSafetyPlan();
  renderPatientMemoryView();
  // Reset chat for new profile
  state.chatMessages = [];
  state.chatTyping = false;
  state.chatMessageIndex = 0;
  renderChat();
  showToast(`Active patient demo profile: ${state.patientSessionProfile.toUpperCase()}`);
}

export function applyJournalPrompt(promptText) {
  const textEl = document.getElementById('journal-text');
  if (!textEl) return;
  const prefix = textEl.value.trim().length ? '\n\n' : '';
  textEl.value = `${textEl.value}${prefix}${promptText}`;
  checkJournal();
  textEl.focus();
}

function getPatientMemoryContext() {
  const map = {
    maria: {
      label: 'Maria (stress/anxiety pathway)',
      moodPattern: 'evening stress spikes after commute and poor sleep nights',
      workedBefore: ['4-6 breathing cadence', 'short evening check-in', 'structured next-day plan'],
      supportFrame: 'grounding + gentle planning',
      signalBand: 'GUARDED'
    },
    james: {
      label: 'James (ADHD + anxiety pathway)',
      moodPattern: 'task-initiation overload during deadline clusters with focus fragmentation',
      workedBefore: ['micro-task breakdown (5-minute start)', 'single-priority planning', 'timed reset prompts'],
      supportFrame: 'task simplification + adherence cueing',
      signalBand: 'MODERATE'
    },
    emma: {
      label: 'Emma (mood/anxiety stabilization pathway)',
      moodPattern: 'low mood and sleep variability under sustained stress',
      workedBefore: ['brief walk reset', 'reflective journaling', 'consistent evening routine'],
      supportFrame: 'stabilization + relapse-prevention cues',
      signalBand: 'GUARDED'
    }
  };
  return map[state.patientSessionProfile] || map.maria;
}

function buildPatientAwareSubmission(source, rawText = '', checkinMeta = '') {
  const memory = getPatientMemoryContext();
  const normalized = rawText.trim();
  const summaryBase = normalized
    ? `What I heard: ${normalized.slice(0, 130)}${normalized.length > 130 ? '…' : ''}`
    : `What I heard: today's update reflects ${memory.moodPattern}.`;
  const memoryLine = `From your clinician-approved plan, what has helped before includes ${memory.workedBefore[0]} and ${memory.workedBefore[1]}.`;
  const checkinLine = checkinMeta ? `Current check-in context: ${checkinMeta}.` : '';

  return {
    patientPayload: {
      tone: `Thanks for sharing this update. I used your reviewed support memory (${memory.label}) to keep this response personalized and safe.`,
      summary: `${summaryBase} ${memoryLine}`.trim(),
      nextStep: `${checkinLine} Suggested next step: try ${memory.workedBefore[0]} now, then log whether it helped so your clinician can review.`.trim(),
      memoryReference: `Clinician-approved memory retrieved: previous helpful strategies include ${memory.workedBefore.join(', ')}.`
    },
    clinicianPayload: {
      signalBand: memory.signalBand,
      summary: `${source} update aligned to ${memory.label}; trend context indicates ${memory.moodPattern}.`,
      evidence: `Patient-submitted ${source.toLowerCase()} + reviewed memory references: ${memory.workedBefore.join(', ')}.`,
      unknowns: 'Response remains assistive; clinician confirmation required for risk interpretation and plan adjustment.'
    }
  };
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
  const payload = buildPatientAwareSubmission('JOURNAL', text);
  processSubmission('JOURNAL', payload.patientPayload, payload.clinicianPayload);
  showToast('Journal entry saved and routed for clinician review');
}

// ============ SLIDERS / CHECK-IN ============

export function updateSlider(type, value) {
  const el = document.getElementById(type + '-value');
  if (el) el.textContent = value;
}

export function submitCheckin() {
  const mood = document.getElementById('mood-value')?.textContent || '3';
  const stress = document.getElementById('stress-value')?.textContent || '3';
  const sleep = document.getElementById('sleep-value')?.textContent || '3';
  const focus = Array.from(document.querySelectorAll('input[name="checkin-focus"]:checked')).map((item) => item.value);
  const note = document.getElementById('checkin-note')?.value?.trim() || '';
  const checkinMeta = `Mood ${mood}/5, Stress ${stress}/5, Sleep ${sleep}/5${focus.length ? `, focus areas: ${focus.join(', ')}` : ''}`;
  const payload = buildPatientAwareSubmission('CHECKIN', note || checkinMeta, checkinMeta);
  processSubmission('CHECKIN', payload.patientPayload, payload.clinicianPayload);
  showToast('Check-in submitted and routed for clinician review');
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
  const voiceFocus = Array.from(document.querySelectorAll('input[name="voice-focus"]:checked')).map((item) => item.value).join(', ');
  const payload = buildPatientAwareSubmission('VOICE_MEMO', `Voice focus topics: ${voiceFocus || 'general emotional update'}`);
  processSubmission('VOICE_MEMO', payload.patientPayload, payload.clinicianPayload);
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

export function acknowledgeAlert() {
  const badge = document.getElementById('inbox-detail-status-badge');
  if (badge) { badge.textContent = 'ACKNOWLEDGED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700'; }
  showToast('Alert acknowledged — status updated');
}
export function resolveAlert() {
  const badge = document.getElementById('inbox-detail-status-badge');
  if (badge) { badge.textContent = 'RESOLVED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-green-100 text-green-700'; }
  showToast('Alert resolved');
}
export function escalateAlert() {
  const badge = document.getElementById('inbox-detail-status-badge');
  if (badge) { badge.textContent = 'ESCALATED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-red-100 text-red-700'; }
  showToast('Alert escalated to supervisor');
}
export function markReviewed() {
  const badge = document.getElementById('draft-review-status-badge');
  if (badge) { badge.textContent = 'REVIEWED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-green-100 text-green-700'; }
  const banner = document.getElementById('draft-review-banner');
  if (banner) { banner.textContent = '✓ REVIEWED — Clinician approved'; banner.className = 'bg-green-100 border-l-4 border-green-600 p-3 rounded-lg text-sm font-semibold text-green-800'; }
  showToast('Summary marked as reviewed');
}
export function useWithCaution() {
  const badge = document.getElementById('draft-review-status-badge');
  if (badge) { badge.textContent = 'USE WITH CAUTION'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700'; }
  showToast('Summary flagged: Use with caution');
}
export function retainDraft() {
  showToast('Summary retained as draft');
}
export function rejectSummary() {
  const badge = document.getElementById('draft-review-status-badge');
  if (badge) { badge.textContent = 'REJECTED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-red-100 text-red-700'; }
  const banner = document.getElementById('draft-review-banner');
  if (banner) { banner.textContent = '✘ REJECTED — Clinician rejected this summary'; banner.className = 'bg-red-100 border-l-4 border-red-600 p-3 rounded-lg text-sm font-semibold text-red-800'; }
  showToast('Summary rejected');
}
export function escalateSummary() {
  const badge = document.getElementById('draft-review-status-badge');
  if (badge) { badge.textContent = 'ESCALATED'; badge.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-purple-100 text-purple-700'; }
  showToast('Summary escalated for review');
}

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

// ============ MBC DASHBOARD (F1) ============

export function selectMBC(id) {
  state.selectedMBCId = id;
  renderMBCDashboard();
}

export function addMBCNote() {
  const noteEl = document.getElementById('mbc-clinician-note');
  const note = noteEl ? noteEl.value.trim() : '';
  if (!note) { showToast('Please enter a clinician note'); return; }
  state.mbcScores = state.mbcScores.map(item => item.id === state.selectedMBCId ? { ...item, clinicianNote: note } : item);
  showToast('Clinician note saved on MBC score');
  renderMBCDashboard();
  if (noteEl) noteEl.value = '';
}

export function resetMBCDashboardAction() {
  state.mbcScores = JSON.parse(JSON.stringify(baselineMBCScores));
  state.selectedMBCId = state.mbcScores[0].id;
  renderMBCDashboard();
}

// ============ ADHERENCE TRACKER (F2) ============

export function selectAdherence(id) {
  state.selectedAdherenceId = id;
  renderAdherenceTracker();
}

export function logAdherenceCompletion() {
  const selected = getSelectedAdherence();
  if (!selected) return;
  state.adherenceItems = state.adherenceItems.map(item => {
    if (item.id !== state.selectedAdherenceId) return item;
    const newCompleted = Math.min(item.completed + 1, item.target);
    const newStreak = item.streak + 1;
    const newStatus = (newCompleted / item.target) >= 0.7 ? 'ON_TRACK' : (newCompleted / item.target) >= 0.4 ? 'PARTIAL' : 'AT_RISK';
    return { ...item, completed: newCompleted, streak: newStreak, status: newStatus, lastLogged: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  });
  showToast('Adherence completion logged');
  renderAdherenceTracker();
}

export function resetAdherenceAction() {
  state.adherenceItems = JSON.parse(JSON.stringify(baselineAdherenceItems));
  state.selectedAdherenceId = state.adherenceItems[0].id;
  renderAdherenceTracker();
}

// ============ GUIDED DEMO (F3) ============

export function startGuidedDemo() {
  state.guidedDemoState.active = true;
  state.guidedDemoState.currentStep = 0;
  state.guidedDemoState.completedSteps = [];
  renderGuidedDemo();
  showToast('Guided demo started — follow the highlighted steps');
}

export function advanceGuidedDemo() {
  const gs = state.guidedDemoState;
  if (!gs.active) return;
  if (!gs.completedSteps.includes(gs.currentStep)) {
    gs.completedSteps.push(gs.currentStep);
  }
  if (gs.currentStep < gs.steps.length - 1) {
    gs.currentStep++;
  } else {
    gs.active = false;
    showToast('Guided demo complete! All steps covered.');
  }
  renderGuidedDemo();
}

export function resetGuidedDemoAction() {
  state.guidedDemoState = JSON.parse(JSON.stringify(baselineGuidedDemoState));
  renderGuidedDemo();
}

// ============ ESCALATION PROTOCOLS (F5) ============

export function selectEscalation(id) {
  state.selectedEscalationId = id;
  renderEscalationProtocols();
}

export function acknowledgeEscalation() {
  state.escalationItems = state.escalationItems.map(item => {
    if (item.id !== state.selectedEscalationId || item.status !== 'OPEN') return item;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return { ...item, status: 'ACK', acknowledgedAt: now, auditTrail: [...item.auditTrail, `${now} — Clinician: Acknowledged escalation.`] };
  });
  showToast('Escalation acknowledged');
  renderEscalationProtocols();
}

export function resolveEscalation() {
  const noteEl = document.getElementById('escalation-resolve-note');
  const note = noteEl ? noteEl.value.trim() : '';
  state.escalationItems = state.escalationItems.map(item => {
    if (item.id !== state.selectedEscalationId) return item;
    if (item.status === 'RESOLVED') return item;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return { ...item, status: 'RESOLVED', resolvedAt: now, clinicianAction: note || item.clinicianAction || 'Resolved by clinician', auditTrail: [...item.auditTrail, `${now} — Clinician: Resolved. ${note || ''}`] };
  });
  showToast('Escalation resolved');
  renderEscalationProtocols();
  if (noteEl) noteEl.value = '';
}

export function resetEscalationAction() {
  state.escalationItems = JSON.parse(JSON.stringify(baselineEscalationItems));
  state.selectedEscalationId = state.escalationItems[0].id;
  renderEscalationProtocols();
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
  state.patientSessionProfile = 'maria';
  const patientSel = document.getElementById('patient-session-profile');
  if (patientSel) patientSel.value = 'maria';

  // Reset new feature states
  state.mbcScores = JSON.parse(JSON.stringify(baselineMBCScores));
  state.selectedMBCId = state.mbcScores[0].id;
  renderMBCDashboard();

  state.adherenceItems = JSON.parse(JSON.stringify(baselineAdherenceItems));
  state.selectedAdherenceId = state.adherenceItems[0].id;
  renderAdherenceTracker();

  state.guidedDemoState = JSON.parse(JSON.stringify(baselineGuidedDemoState));
  renderGuidedDemo();

  state.kpiData = JSON.parse(JSON.stringify(baselineKPIData));
  renderKPIPanel();

  state.escalationItems = JSON.parse(JSON.stringify(baselineEscalationItems));
  state.selectedEscalationId = state.escalationItems[0].id;
  renderEscalationProtocols();

  // Reset new Phase 2+ states
  state.sessionTopics = JSON.parse(JSON.stringify(baselineSessionPrep));
  state.resourceFilter = 'All';
  state.expandedResourceId = null;
  state.expandedSafetySteps = [];
  state.onboardingStep = 0;
  state.onboardingComplete = false;
  state.chatMessages = [];
  state.chatTyping = false;
  state.chatMessageIndex = 0;
  state.historyFilter = 'All';
  state.expandedHistoryId = null;
  state.journalFilter = 'All';
  state.selectedJournalPrompt = null;
  state.patientMemoryFilter = 'All';
  state.expandedPatientMemoryId = null;
  state.evidenceFilter = 'All';
  state.expandedEvidenceId = null;

  // Reset new Phase 6+ states
  state.clinicianProfile = JSON.parse(JSON.stringify(baselineClinicianProfile));
  state.sessionNotes = JSON.parse(JSON.stringify(baselineSessionNotes));
  state.currentSessionNoteProfile = 'maria';
  state.expandedRegSection = null;
  state.breathingActive = false;
  state.breathingPhase = 'idle';
  
  // Re-render new screens after state reset
  renderClinicianAnalytics();
  renderPopulationHealth();
  renderSessionNotes();
  renderInvestorFinancials();
  renderRegulatoryHub();
  renderSDOHAssessment();
  renderCaregiverView();

  showToast('Demo reset to defaults');
}

// ============ SESSION PREP ACTIONS (F-P2) ============

export function toggleSessionTopic(topicId) {
  const profile = state.selectedPatientProfile;
  const prepData = state.sessionTopics[profile];
  if (!prepData) return;
  const topic = prepData.topics.find(t => t.id === topicId);
  if (topic) {
    topic.checked = !topic.checked;
    renderSessionPrep();
  }
}

export function addCustomTopic() {
  const input = document.getElementById('custom-topic-input');
  if (!input || !input.value.trim()) return;
  const profile = state.selectedPatientProfile;
  const prepData = state.sessionTopics[profile];
  if (!prepData) return;
  const newId = 'ct-' + Date.now();
  prepData.topics.push({ id: newId, label: input.value.trim(), checked: true });
  input.value = '';
  renderSessionPrep();
  showToast('Topic added');
}

// ============ RESOURCE ACTIONS (F-P4) ============

export function setResourceFilter(filter) {
  state.resourceFilter = filter;
  renderResources();
}

export function toggleResourceExpand(id) {
  state.expandedResourceId = state.expandedResourceId === id ? null : id;
  renderResources();
}

// ============ CHAT ACTIONS (F-P5) ============

export function advanceChat() {
  const script = baselineChatScript[state.selectedPatientProfile] || baselineChatScript.maria;
  if (state.chatMessageIndex >= script.length) return;

  const nextMsg = script[state.chatMessageIndex];
  
  if (nextMsg.sender === 'ai' || nextMsg.sender === 'system') {
    // Show typing indicator first
    state.chatTyping = true;
    renderChat();
    setTimeout(() => {
      state.chatTyping = false;
      state.chatMessages.push(nextMsg);
      state.chatMessageIndex++;
      renderChat();
    }, 800);
  } else {
    state.chatMessages.push(nextMsg);
    state.chatMessageIndex++;
    renderChat();
  }
}

export function resetChatAction() {
  state.chatMessages = [];
  state.chatTyping = false;
  state.chatMessageIndex = 0;
  renderChat();
}

// ============ HISTORY ACTIONS (F-P6) ============

export function setHistoryFilter(filter) {
  state.historyFilter = filter;
  renderHistory();
}

export function toggleHistoryExpand(id) {
  state.expandedHistoryId = state.expandedHistoryId === id ? null : id;
  renderHistory();
}

// ============ SAFETY PLAN ACTIONS (F-P7) ============

export function toggleSafetyStep(index) {
  const idx = state.expandedSafetySteps.indexOf(index);
  if (idx >= 0) {
    state.expandedSafetySteps.splice(idx, 1);
  } else {
    state.expandedSafetySteps.push(index);
  }
  renderSafetyPlan();
}

// ============ ONBOARDING ACTIONS (F-P8) ============

export function onboardingNext() {
  if (state.onboardingStep >= baselineOnboardingSteps.length - 1) {
    state.onboardingComplete = true;
    showScreen('patient-consent');
    return;
  }
  state.onboardingStep++;
  renderOnboarding();
}

export function onboardingBack() {
  if (state.onboardingStep > 0) {
    state.onboardingStep--;
    renderOnboarding();
  }
}

// ============ PATIENT MEMORY VIEW ACTIONS (F-M1) ============

export function setPatientMemoryFilter(filter) {
  state.patientMemoryFilter = filter;
  renderPatientMemoryView();
}

export function togglePatientMemoryExpand(id) {
  state.expandedPatientMemoryId = state.expandedPatientMemoryId === id ? null : id;
  renderPatientMemoryView();
}

// ============ EVIDENCE ACTIONS (F-E1) ============

export function setEvidenceFilter(filter) {
  state.evidenceFilter = filter;
  renderEvidenceBase();
}

export function toggleEvidenceExpand(id) {
  state.expandedEvidenceId = state.expandedEvidenceId === id ? null : id;
  renderEvidenceBase();
}

// ============ JOURNAL FILTER ACTIONS (F-PE2) ============

export function setJournalFilter(filter) {
  state.journalFilter = filter;
  // Filter journal prompts in the UI
  const promptList = document.getElementById('journal-prompts-list');
  if (!promptList) return;
  
  const promptCategories = { 'Emotion peak': 'Mood', 'What helped': 'Coping', 'Next-24h support': 'Coping', 'Thought record': 'Mood', 'Small win': 'Coping', 'Gratitude': 'Gratitude', 'Body scan': 'Mood', 'Sleep reflection': 'Sleep' };
  
  const buttons = promptList.querySelectorAll('[data-journal-prompt]');
  buttons.forEach(btn => {
    const label = btn.textContent.trim();
    const cat = promptCategories[label];
    btn.style.display = (filter === 'All' || cat === filter) ? '' : 'none';
  });

  // Update filter bar styling
  document.querySelectorAll('[data-journal-filter]').forEach(btn => {
    if (btn.dataset.journalFilter === filter) {
      btn.className = 'px-2 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white';
    } else {
      btn.className = 'px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600';
    }
  });
}

// ============ SESSION NOTE ACTIONS ============

export function selectSessionNote(profile) {
  state.currentSessionNoteProfile = profile;
  renderSessionNotes();
}

export function signSessionNote() {
  const profile = state.currentSessionNoteProfile;
  const note = state.sessionNotes[profile];
  if (!note || note.signed) return;
  note.signed = true;
  renderSessionNotes();
  showToast(`Session note for ${baselinePatientProfiles[profile]?.name || profile} signed`);
}

// ============ BREATHING EXERCISE ACTIONS ============

let breathingInterval = null;

export function startBreathing() {
  if (state.breathingActive) return;
  state.breathingActive = true;
  const circle = document.getElementById('breathing-circle');
  const label = document.getElementById('breathing-label');
  if (!circle || !label) return;

  let phase = 'inhale';
  let seconds = 4;
  label.textContent = 'Inhale...';
  circle.style.transform = 'scale(1.3)';

  breathingInterval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      if (phase === 'inhale') {
        phase = 'exhale';
        seconds = 6;
        label.textContent = 'Exhale...';
        circle.style.transform = 'scale(1)';
      } else {
        phase = 'inhale';
        seconds = 4;
        label.textContent = 'Inhale...';
        circle.style.transform = 'scale(1.3)';
      }
    }
  }, 1000);
}

export function stopBreathing() {
  state.breathingActive = false;
  clearInterval(breathingInterval);
  breathingInterval = null;
  const circle = document.getElementById('breathing-circle');
  const label = document.getElementById('breathing-label');
  if (circle) circle.style.transform = 'scale(1)';
  if (label) label.textContent = 'Ready';
}
