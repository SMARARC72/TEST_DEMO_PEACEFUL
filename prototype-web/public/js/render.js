/**
 * Render Module - All render functions for updating the DOM
 * Part of Peacefull.ai Demo technical debt cleanup
 */

import { state } from './state.js';
import {
  triageBadgeClass,
  memoryBadgeClass,
  planBadgeClass,
  enterpriseBadgeClass,
  getSelectedTriageItem,
  getSelectedMemory,
  getSelectedPlan,
  getSelectedEnterprise,
  computeRiskPosture,
  computeReadinessVerdict,
  computePilotExpansionScore
} from './helpers.js';

// ============ SUBMISSION SURFACES ============

export function renderSubmissionSurfaces() {
  const patientMode = state.latestSubmission.source === 'VOICE_MEMO' ? 'Voice memo processed' : 'Journal entry processed';
  const titleEl = document.getElementById('submission-success-title');
  const toneEl = document.getElementById('patient-ai-tone');
  const summaryEl = document.getElementById('patient-ai-summary');
  const nextEl = document.getElementById('patient-ai-next-step');
  const cpm = document.getElementById('compare-patient-mode');
  const cps = document.getElementById('compare-patient-summary');
  const cpn = document.getElementById('compare-patient-next');
  const ccs = document.getElementById('compare-clinician-signal');
  const csum = document.getElementById('compare-clinician-summary');
  const cev = document.getElementById('compare-clinician-evidence');
  const cunk = document.getElementById('compare-clinician-unknowns');
  const stat = document.getElementById('submission-status-badge');
  const src = document.getElementById('submission-source');

  if (titleEl) titleEl.textContent = `${patientMode}.`;
  if (toneEl) toneEl.textContent = state.latestSubmission.patientReport.tone;
  if (summaryEl) summaryEl.textContent = state.latestSubmission.patientReport.summary;
  if (nextEl) nextEl.textContent = state.latestSubmission.patientReport.nextStep;

  if (cpm) cpm.textContent = patientMode;
  if (cps) cps.textContent = state.latestSubmission.patientReport.summary;
  if (cpn) cpn.textContent = state.latestSubmission.patientReport.nextStep;
  if (ccs) ccs.textContent = `Signal Band: ${state.latestSubmission.clinicianReport.signalBand}`;
  if (csum) csum.textContent = state.latestSubmission.clinicianReport.summary;
  if (cev) cev.textContent = `Evidence: ${state.latestSubmission.clinicianReport.evidence}`;
  if (cunk) cunk.textContent = `Known unknowns: ${state.latestSubmission.clinicianReport.unknowns}`;
  if (stat) stat.textContent = state.latestSubmission.status;
  if (src) src.textContent = state.latestSubmission.source;
}

// ============ TRIAGE QUEUE ============

export function renderTriageQueue() {
  const tbody = document.getElementById('triage-queue-body');
  const detail = document.getElementById('triage-detail');
  const openCount = document.getElementById('triage-open-count');
  const closedCount = document.getElementById('triage-closed-count');
  if (!tbody || !detail || !openCount || !closedCount) return;

  tbody.innerHTML = state.triageQueue.map(item => `
    <tr onclick="selectTriageItem('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedTriageId ? 'bg-fuchsia-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.source}</td>
      <td class="py-2 pr-2">${item.signalBand}</td>
      <td class="py-2 pr-2">${item.summary}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${triageBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');

  const selected = getSelectedTriageItem();
  detail.innerHTML = selected ? `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Submission Source:</strong> ${selected.source}</p>
    <p><strong>Signal Band:</strong> ${selected.signalBand}</p>
    <p><strong>Summary:</strong> ${selected.summary}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Updated:</strong> ${selected.updatedAt}</p>
  ` : '<p>No triage items available.</p>';

  const open = state.triageQueue.filter(item => item.status !== 'RESOLVED').length;
  openCount.textContent = String(open);
  closedCount.textContent = String(state.triageQueue.length - open);
}

// ============ MEMORY REVIEW ============

export function renderMemoryReview() {
  const tbody = document.getElementById('memory-table-body');
  const detail = document.getElementById('memory-detail');
  const approvedList = document.getElementById('approved-memory-list');
  if (!tbody || !detail || !approvedList) return;

  tbody.innerHTML = state.memoryItems.map(item => `
    <tr onclick="selectMemory('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedMemoryId ? 'bg-indigo-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.category}</td>
      <td class="py-2 pr-2">${item.statement}</td>
      <td class="py-2 pr-2">${item.confidence}</td>
      <td class="py-2 pr-2">${item.conflict ? 'Flagged' : 'None'}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${memoryBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');

  const selected = getSelectedMemory();
  detail.innerHTML = `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Proposed Memory:</strong> ${selected.statement}</p>
    ${selected.existing ? `<p><strong>Conflicting Existing Memory:</strong> ${selected.existing}</p>` : ''}
    <p><strong>Evidence:</strong> ${selected.evidence.join(', ')}</p>
    <p><strong>Known Unknowns:</strong> ${selected.uncertainty}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Audit Entry:</strong> ${selected.audit[selected.audit.length - 1]}</p>
  `;

  const approved = state.memoryItems.filter(item => item.status === 'APPROVED');
  approvedList.innerHTML = approved.length
    ? approved.map(item => `<li>${item.patient}: ${item.statement}</li>`).join('')
    : '<li>No approved memory yet.</li>';

  const prepReduction = `${Math.min(12 + approved.length * 3, 24)}%`;
  const linkEl = document.getElementById('memory-roi-link');
  const roiSignal = document.querySelector('#roi-dashboard #roi-memory-signal');
  const profileList = document.getElementById('clinician-profile-memory');
  if (linkEl) linkEl.textContent = prepReduction;
  if (roiSignal) roiSignal.textContent = prepReduction;
  if (profileList) {
    profileList.innerHTML = approved.length
      ? approved.map(item => `<li>${item.patient}: ${item.statement}</li>`).join('')
      : '<li>No approved memory yet.</li>';
  }
}

// ============ TREATMENT PLAN ============

export function renderTreatmentPlan() {
  const tbody = document.getElementById('treatment-plan-table-body');
  const detail = document.getElementById('treatment-plan-detail');
  if (!tbody || !detail) return;

  tbody.innerHTML = state.planItems.map(item => `
    <tr onclick="selectPlan('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedPlanId ? 'bg-emerald-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.goal}</td>
      <td class="py-2 pr-2">${item.intervention}</td>
      <td class="py-2 pr-2">${item.owner}</td>
      <td class="py-2 pr-2">${item.target}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${planBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');

  const selected = getSelectedPlan();
  detail.innerHTML = `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Goal:</strong> ${selected.goal}</p>
    <p><strong>Intervention:</strong> ${selected.intervention}</p>
    <p><strong>Evidence Links:</strong> ${selected.evidence.join(', ')}</p>
    <p><strong>Known Unknowns:</strong> ${selected.uncertainty}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Audit Entry:</strong> ${selected.audit[selected.audit.length - 1]}</p>
  `;

  const reviewedCount = state.planItems.filter(item => item.status === 'REVIEWED').length;
  const readiness = `${Math.min(28 + reviewedCount * 8, 52)}%`;
  const reviewedEl = document.getElementById('plan-reviewed-count');
  const readinessEl = document.getElementById('plan-readiness-signal');
  const roiPlanEl = document.getElementById('roi-plan-signal');
  const profilePlan = document.getElementById('clinician-profile-plan');
  if (reviewedEl) reviewedEl.textContent = String(reviewedCount);
  if (readinessEl) readinessEl.textContent = readiness;
  if (roiPlanEl) roiPlanEl.textContent = readiness;
  if (profilePlan) {
    const reviewed = state.planItems.filter(item => item.status === 'REVIEWED');
    profilePlan.innerHTML = reviewed.length
      ? reviewed.map(item => `<li>${item.patient}: ${item.goal}</li>`).join('')
      : '<li>No reviewed treatment plan items yet.</li>';
  }
}

// ============ ENTERPRISE GOVERNANCE ============

export function renderEnterpriseGovernance() {
  const tbody = document.getElementById('enterprise-table-body');
  const detail = document.getElementById('enterprise-detail');
  if (!tbody || !detail) return;

  tbody.innerHTML = state.enterpriseItems.map(item => `
    <tr onclick="selectEnterprise('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedEnterpriseId ? 'bg-sky-50' : ''}">
      <td class="py-2 pr-2">${item.tenant}</td>
      <td class="py-2 pr-2">${item.sso}</td>
      <td class="py-2 pr-2">${item.rbac}</td>
      <td class="py-2 pr-2">${item.audit}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${enterpriseBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');

  const selected = getSelectedEnterprise();
  detail.innerHTML = `
    <p><strong>Tenant:</strong> ${selected.tenant}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Notes:</strong> ${selected.notes}</p>
    <p><strong>Evidence:</strong> ${selected.evidence.join(', ')}</p>
    <p><strong>Last Audit Entry:</strong> ${selected.auditLog[selected.auditLog.length - 1]}</p>
  `;

  const approvedCount = state.enterpriseItems.filter(i => i.status === 'APPROVED').length;
  const readiness = `${Math.min(35 + approvedCount * 15, 80)}%`;
  const countEl = document.getElementById('enterprise-approved-count');
  const signalEl = document.getElementById('enterprise-readiness-signal');
  const roiEl = document.getElementById('roi-enterprise-signal');
  if (countEl) countEl.textContent = String(approvedCount);
  if (signalEl) signalEl.textContent = readiness;
  if (roiEl) roiEl.textContent = readiness;
}

// ============ SECURITY COMMAND CENTER ============

export function renderSecurityCommandCenter() {
  const logEl = document.getElementById('security-audit-log');
  if (logEl) {
    logEl.innerHTML = state.securityState.auditLog.map(e => `<div class="py-2 border-b"><div class="text-xs text-slate-500">${e.ts}</div><div class="text-sm text-slate-800">${e.event}</div></div>`).join('');
  }
  const contractResult = document.getElementById('contract-result');
  if (contractResult) contractResult.textContent = `Status: ${state.securityState.contractValidation.status}`;
  const merkleResult = document.getElementById('merkle-result');
  if (merkleResult) merkleResult.textContent = `Result: ${state.securityState.merkleVerification.result}`;
  const idPost = document.getElementById('posture-identity'); 
  if (idPost) idPost.textContent = String(state.securityState.posture.identity);
  const cPost = document.getElementById('posture-contract'); 
  if (cPost) cPost.textContent = String(state.securityState.posture.contract);
  const dPost = document.getElementById('posture-data'); 
  if (dPost) dPost.textContent = String(state.securityState.posture.data);
  const mfaSelect = document.getElementById('mfa-method'); 
  if (mfaSelect) mfaSelect.value = state.securityState.mfaMethod;
  const backupInput = document.getElementById('backup-code'); 
  if (backupInput) backupInput.value = '';
}

// ============ DECISION ROOM ============

export function renderDecisionRoom() {
  const riskEl = document.getElementById('risk-posture');
  if (riskEl) riskEl.textContent = computeRiskPosture();
  const suppEl = document.getElementById('suppression-reasons');
  if (suppEl) {
    const recEl = document.getElementById('rec-status');
    const sup = recEl ? recEl.value : '';
    suppEl.textContent = sup === 'SUPPRESSED' ? 'Recommendation suppressed due to open T2 items' : '';
  }
  const govEl = document.getElementById('governance-audits');
  if (govEl) govEl.textContent = state.enterpriseItems.map(i => i.auditLog.slice(-1)[0] || '').join('; ');
  const verdictEl = document.getElementById('readiness-verdict');
  if (verdictEl) verdictEl.textContent = computeReadinessVerdict();
  const timeEl = document.getElementById('roi-time-saved');
  const roiMetricEl = document.getElementById('roi-metric-1');
  if (timeEl) timeEl.textContent = roiMetricEl ? roiMetricEl.textContent : '0';
  const scoreEl = document.getElementById('pilot-score');
  if (scoreEl) scoreEl.textContent = computePilotExpansionScore();
  const packetEl = document.getElementById('procurement-packet');
  if (packetEl) packetEl.textContent = state.decisionRoomState.packet ? JSON.stringify(state.decisionRoomState.packet, null, 2) : '';
}
