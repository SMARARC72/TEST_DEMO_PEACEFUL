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
  mbcSeverityClass,
  mbcTrendIcon,
  adherenceBadgeClass,
  escalationBadgeClass,
  escalationTierClass,
  getSelectedTriageItem,
  getSelectedMemory,
  getSelectedPlan,
  getSelectedEnterprise,
  getSelectedMBC,
  getSelectedAdherence,
  getSelectedEscalation,
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
  const memoryEl = document.getElementById('patient-ai-memory');
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
  if (memoryEl) memoryEl.textContent = state.latestSubmission.patientReport.memoryReference || 'Memory retrieval uses clinician-approved, reviewed context only.';

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

// ============ CLINICIAN PATIENT PROFILE ============

export function renderClinicianPatientProfile() {
  const profiles = {
    maria: {
      initials: 'MR',
      name: 'Maria Rodriguez',
      meta: 'ID: PT-2847 • DOB: 03/15/1985',
      badges: [
        '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">T2 ALERT</span>',
        '<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Draft Summary</span>'
      ],
      stats: { total: '47', weekly: '12', alerts: '3' },
      activity: `
        <div class="p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-500">Today, 9:15 AM</span>
            <span class="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">T2</span>
          </div>
          <p class="font-medium text-slate-800">Voice Note: Safety Signal Detected</p>
          <p class="text-sm text-slate-600 mt-1">"I don't see the point anymore..."</p>
          <button data-nav="inbox-detail" class="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">View Alert</button>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">Yesterday, 8:00 PM</span></div>
          <p class="font-medium text-slate-800">Journal Entry</p>
          <p class="text-sm text-slate-600 mt-1">"Had a difficult day at work. The new project is overwhelming..."</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">Feb 23, 7:30 PM</span></div>
          <p class="font-medium text-slate-800">Daily Check-in</p>
          <p class="text-sm text-slate-600 mt-1">Mood: 2/5 • Stress: 4/5 • Sleep: Poor</p>
        </div>
      `,
      trends: `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-slate-700">7-Day Symptom Trend (Synthetic)</p><span class="text-xs text-slate-500">Updated: Today 09:18</span>
            </div>
            <div class="space-y-3 text-sm">
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Mood Stability</span><span>2.4 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-teal-500 h-2 rounded-full" style="width: 48%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Stress Load</span><span>4.1 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-amber-500 h-2 rounded-full" style="width: 82%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Sleep Disruption</span><span>3.8 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-red-500 h-2 rounded-full" style="width: 76%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Coping Adherence</span><span>2.9 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width: 58%"></div></div></div>
            </div>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p class="text-sm font-semibold text-slate-700 mb-3">Clinical Interpretation</p>
            <ul class="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>Primary risk concentration: sustained workload strain plus sleep disruption.</li>
              <li>Protective engagement remains visible through continued check-ins.</li>
              <li>Escalation gate activates when elevated hopelessness language is detected.</li>
            </ul>
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900"><strong>Immediate clinical priority:</strong> confirm intent, verify safety-plan access, and define a concrete next-24h support path.</div>
          </div>
        </div>
      `
    },
    james: {
      initials: 'JS',
      name: 'James Smith',
      meta: 'ID: PT-3192 • DOB: 08/21/1992',
      badges: [
        '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">ADHD</span>',
        '<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Draft Summary</span>'
      ],
      stats: { total: '39', weekly: '9', alerts: '2' },
      activity: `
        <div class="p-4 bg-amber-50 rounded-xl border-l-4 border-amber-500">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-500">Yesterday, 6:30 PM</span>
            <span class="px-2 py-1 bg-amber-600 text-white rounded text-xs font-bold">T2</span>
          </div>
          <p class="font-medium text-slate-800">Adherence Signal: Multiple Missed Check-ins</p>
          <p class="text-sm text-slate-600 mt-1">Missed evening check-ins during deadline period; stress language escalated.</p>
          <button data-nav="inbox-detail" class="mt-3 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200">View Alert</button>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">Yesterday, 8:00 PM</span></div>
          <p class="font-medium text-slate-800">Routine Prompt Response</p>
          <p class="text-sm text-slate-600 mt-1">"I started three tasks and finished none. I feel behind and scattered."</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">2 days ago, 9:10 PM</span></div>
          <p class="font-medium text-slate-800">Daily Check-in</p>
          <p class="text-sm text-slate-600 mt-1">Mood: 3/5 • Stress: 4/5 • Focus: 2/5</p>
        </div>
      `,
      trends: `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div class="flex items-center justify-between mb-3"><p class="text-sm font-semibold text-slate-700">7-Day Symptom Trend (Synthetic)</p><span class="text-xs text-slate-500">Updated: Today 09:20</span></div>
            <div class="space-y-3 text-sm">
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Task Initiation Consistency</span><span>2.1 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width: 42%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Stress Load</span><span>4.0 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-amber-500 h-2 rounded-full" style="width: 80%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Focus Fragmentation</span><span>4.2 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-red-500 h-2 rounded-full" style="width: 84%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Coping Adherence</span><span>2.8 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-teal-500 h-2 rounded-full" style="width: 56%"></div></div></div>
            </div>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p class="text-sm font-semibold text-slate-700 mb-3">Clinical Interpretation</p>
            <ul class="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>Pattern consistent with executive-function overload under time pressure.</li>
              <li>Supportive prompts improve engagement but task completion remains low.</li>
              <li>Review cadence benefits from short-interval check-ins and concrete task framing.</li>
            </ul>
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900"><strong>Immediate clinical priority:</strong> validate ADHD coping fit, reduce task scope, and confirm adherence strategy for next 48 hours.</div>
          </div>
        </div>
      `
    },
    emma: {
      initials: 'EW',
      name: 'Emma Wilson',
      meta: 'ID: PT-2251 • DOB: 11/04/1990',
      badges: [
        '<span class="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-bold">Mood/Anxiety</span>',
        '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Stable</span>'
      ],
      stats: { total: '52', weekly: '11', alerts: '1' },
      activity: `
        <div class="p-4 bg-teal-50 rounded-xl border-l-4 border-teal-500">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-500">Feb 23, 2:00 PM</span>
            <span class="px-2 py-1 bg-teal-600 text-white rounded text-xs font-bold">T1</span>
          </div>
          <p class="font-medium text-slate-800">Mood Trend Review Completed</p>
          <p class="text-sm text-slate-600 mt-1">Declining scores addressed with clinician follow-up and coping refresh plan.</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">Feb 23, 7:30 PM</span></div>
          <p class="font-medium text-slate-800">Daily Check-in</p>
          <p class="text-sm text-slate-600 mt-1">Mood: 3/5 • Stress: 3/5 • Sleep: Fair</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-xl">
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-500">Feb 22, 8:10 PM</span></div>
          <p class="font-medium text-slate-800">Journal Reflection</p>
          <p class="text-sm text-slate-600 mt-1">"I had a better afternoon after taking a short walk and pausing before work."</p>
        </div>
      `,
      trends: `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div class="flex items-center justify-between mb-3"><p class="text-sm font-semibold text-slate-700">7-Day Symptom Trend (Synthetic)</p><span class="text-xs text-slate-500">Updated: Today 09:12</span></div>
            <div class="space-y-3 text-sm">
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Mood Stability</span><span>3.6 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-teal-500 h-2 rounded-full" style="width: 72%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Stress Load</span><span>2.9 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-amber-500 h-2 rounded-full" style="width: 58%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Sleep Disruption</span><span>2.5 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width: 50%"></div></div></div>
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Coping Adherence</span><span>3.7 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-indigo-500 h-2 rounded-full" style="width: 74%"></div></div></div>
            </div>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p class="text-sm font-semibold text-slate-700 mb-3">Clinical Interpretation</p>
            <ul class="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>Trend indicates gradual stabilization after prior decline period.</li>
              <li>Protective routines are increasingly consistent across evenings.</li>
              <li>Residual sleep variability remains a watch area for relapse risk.</li>
            </ul>
            <div class="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-900"><strong>Immediate clinical priority:</strong> consolidate protective routines and maintain relapse-prevention check cadence.</div>
          </div>
        </div>
      `
    }
  };

  const profile = profiles[state.selectedPatientProfile] || profiles.maria;

  const initialsEl = document.getElementById('clinician-patient-initials');
  const nameEl = document.getElementById('clinician-patient-name');
  const metaEl = document.getElementById('clinician-patient-meta');
  const badgesEl = document.getElementById('clinician-patient-badges');
  const totalEl = document.getElementById('clinician-patient-total-entries');
  const weeklyEl = document.getElementById('clinician-patient-weekly-entries');
  const alertsEl = document.getElementById('clinician-patient-safety-alerts');
  const activityEl = document.getElementById('clinician-patient-activity-list');
  const trendsEl = document.getElementById('clinician-patient-trends-body');
  const chipMaria = document.getElementById('patient-chip-maria');
  const chipJames = document.getElementById('patient-chip-james');
  const chipEmma = document.getElementById('patient-chip-emma');

  if (initialsEl) initialsEl.textContent = profile.initials;
  if (nameEl) nameEl.textContent = profile.name;
  if (metaEl) metaEl.textContent = profile.meta;
  if (badgesEl) badgesEl.innerHTML = profile.badges.join('');
  if (totalEl) totalEl.textContent = profile.stats.total;
  if (weeklyEl) weeklyEl.textContent = profile.stats.weekly;
  if (alertsEl) alertsEl.textContent = profile.stats.alerts;
  if (activityEl) activityEl.innerHTML = profile.activity;
  if (trendsEl) trendsEl.innerHTML = profile.trends;

  const base = 'px-3 py-1.5 rounded-full text-xs font-semibold';
  if (chipMaria) chipMaria.className = `${base} ${state.selectedPatientProfile === 'maria' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`;
  if (chipJames) chipJames.className = `${base} ${state.selectedPatientProfile === 'james' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`;
  if (chipEmma) chipEmma.className = `${base} ${state.selectedPatientProfile === 'emma' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`;
}

// ============ MBC DASHBOARD (F1) ============

export function renderMBCDashboard() {
  const tbody = document.getElementById('mbc-table-body');
  const detail = document.getElementById('mbc-detail');
  if (!tbody || !detail) return;

  tbody.innerHTML = state.mbcScores.map(item => `
    <tr onclick="selectMBC('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedMBCId ? 'bg-teal-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.instrument}</td>
      <td class="py-2 pr-2 font-semibold">${item.score}</td>
      <td class="py-2 pr-2"><span class="px-2 py-1 rounded text-xs font-semibold ${mbcSeverityClass(item.severity)}">${item.severity}</span></td>
      <td class="py-2 pr-2 text-sm">${mbcTrendIcon(item.trend)}</td>
      <td class="py-2 text-sm text-slate-500">${item.date}</td>
    </tr>`).join('');

  const selected = getSelectedMBC();
  const sparkline = selected.priorScores.map((s, i) => `T${i + 1}: ${s}`).join(' → ');
  detail.innerHTML = `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Instrument:</strong> ${selected.instrument}</p>
    <p><strong>Current Score:</strong> ${selected.score} (${selected.severity})</p>
    <p><strong>Trend:</strong> ${mbcTrendIcon(selected.trend)}</p>
    <p><strong>Score History:</strong> ${sparkline} → <strong>${selected.score}</strong></p>
    <p><strong>Date:</strong> ${selected.date}</p>
    ${selected.clinicianNote ? `<p><strong>Clinician Note:</strong> ${selected.clinicianNote}</p>` : '<p class="text-sm text-slate-500 italic">No clinician note yet.</p>'}
  `;

  // Update summary counts
  const worsening = state.mbcScores.filter(i => i.trend === 'worsening').length;
  const improving = state.mbcScores.filter(i => i.trend === 'improving').length;
  const worseEl = document.getElementById('mbc-worsening-count');
  const improveEl = document.getElementById('mbc-improving-count');
  if (worseEl) worseEl.textContent = String(worsening);
  if (improveEl) improveEl.textContent = String(improving);
}

// ============ ADHERENCE TRACKER (F2) ============

export function renderAdherenceTracker() {
  const tbody = document.getElementById('adherence-table-body');
  const detail = document.getElementById('adherence-detail');
  if (!tbody || !detail) return;

  tbody.innerHTML = state.adherenceItems.map(item => {
    const pct = Math.round((item.completed / item.target) * 100);
    return `
    <tr onclick="selectAdherence('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedAdherenceId ? 'bg-emerald-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.task}</td>
      <td class="py-2 pr-2">${item.completed}/${item.target} (${pct}%)</td>
      <td class="py-2 pr-2">${item.streak}d</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${adherenceBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`;
  }).join('');

  const selected = getSelectedAdherence();
  const pct = Math.round((selected.completed / selected.target) * 100);
  detail.innerHTML = `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Task:</strong> ${selected.task}</p>
    <p><strong>Frequency:</strong> ${selected.frequency}</p>
    <p><strong>Progress:</strong> ${selected.completed}/${selected.target} (${pct}%)</p>
    <div class="w-full bg-slate-200 rounded-full h-3 my-2"><div class="h-3 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}" style="width: ${pct}%"></div></div>
    <p><strong>Current Streak:</strong> ${selected.streak} days</p>
    <p><strong>Last Logged:</strong> ${selected.lastLogged}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
  `;

  const onTrack = state.adherenceItems.filter(i => i.status === 'ON_TRACK').length;
  const atRisk = state.adherenceItems.filter(i => i.status === 'AT_RISK').length;
  const onEl = document.getElementById('adherence-on-track-count');
  const riskEl = document.getElementById('adherence-at-risk-count');
  if (onEl) onEl.textContent = String(onTrack);
  if (riskEl) riskEl.textContent = String(atRisk);
}

// ============ GUIDED DEMO (F3) ============

export function renderGuidedDemo() {
  const stepsEl = document.getElementById('guided-demo-steps');
  const progressEl = document.getElementById('guided-demo-progress');
  const currentLabel = document.getElementById('guided-demo-current-label');
  if (!stepsEl) return;

  const gs = state.guidedDemoState;
  const totalSteps = gs.steps.length;
  const completedCount = gs.completedSteps.length;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (progressEl) progressEl.style.width = `${pct}%`;
  if (currentLabel) currentLabel.textContent = gs.active && gs.currentStep < totalSteps ? gs.steps[gs.currentStep].label : (completedCount === totalSteps ? 'Demo Complete' : 'Not Started');

  stepsEl.innerHTML = gs.steps.map((step, i) => {
    const isCompleted = gs.completedSteps.includes(i);
    const isCurrent = gs.active && gs.currentStep === i;
    const dotClass = isCompleted ? 'completed' : (isCurrent ? 'active' : '');
    return `
      <div class="script-step">
        <div class="script-dot ${dotClass}">${isCompleted ? '✓' : i + 1}</div>
        <div class="bg-white rounded-xl shadow-sm p-4 ${isCurrent ? 'ring-2 ring-teal-500' : ''}">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-slate-800">${step.label}</h3>
            <span class="text-sm text-slate-500">${step.duration}</span>
          </div>
          <p class="text-sm text-slate-600 mb-3">${step.description}</p>
          ${isCurrent ? `<button data-nav="${step.screen}" class="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200">Go to Screen →</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ============ KPI PANEL (F4) ============

export function renderKPIPanel() {
  const container = document.getElementById('kpi-metrics-container');
  if (!container) return;

  container.innerHTML = state.kpiData.metrics.map(m => `
    <div class="bg-white rounded-2xl shadow-sm p-6 border-l-4 ${m.confidence === 'High' ? 'border-green-500' : m.confidence.startsWith('Low') ? 'border-red-400' : 'border-amber-400'}">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-slate-800 text-sm">${m.label}</h3>
        <span class="px-2 py-1 rounded text-xs font-semibold ${m.confidence === 'High' ? 'bg-green-100 text-green-700' : m.confidence.startsWith('Low') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${m.confidence}</span>
      </div>
      <p class="text-2xl font-bold text-slate-900 mb-1">${m.value}</p>
      <p class="text-sm text-slate-500 mb-3">Baseline: ${m.baseline}</p>
      <div class="assumptions-drawer">
        <p class="text-xs font-semibold text-slate-500 uppercase mb-1">Assumption</p>
        <p class="text-sm text-slate-700">${m.assumption}</p>
        <p class="text-xs text-slate-500 mt-2">Source: ${m.source}</p>
      </div>
    </div>`).join('');
}

// ============ ESCALATION PROTOCOLS (F5) ============

export function renderEscalationProtocols() {
  const tbody = document.getElementById('escalation-table-body');
  const detail = document.getElementById('escalation-detail');
  const auditEl = document.getElementById('escalation-audit-trail');
  if (!tbody || !detail) return;

  tbody.innerHTML = state.escalationItems.map(item => `
    <tr onclick="selectEscalation('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedEscalationId ? 'bg-orange-50' : ''}">
      <td class="py-2 pr-2"><span class="px-2 py-1 rounded text-xs font-bold ${escalationTierClass(item.tier)}">${item.tier}</span></td>
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2 text-sm">${item.trigger}</td>
      <td class="py-2 pr-2 text-sm">${item.detectedAt}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${escalationBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');

  const selected = getSelectedEscalation();
  detail.innerHTML = `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Tier:</strong> <span class="px-2 py-1 rounded text-xs font-bold ${escalationTierClass(selected.tier)}">${selected.tier}</span></p>
    <p><strong>Trigger:</strong> ${selected.trigger}</p>
    <p><strong>Detected:</strong> ${selected.detectedAt}</p>
    ${selected.acknowledgedAt ? `<p><strong>Acknowledged:</strong> ${selected.acknowledgedAt}</p>` : ''}
    ${selected.resolvedAt ? `<p><strong>Resolved:</strong> ${selected.resolvedAt}</p>` : ''}
    ${selected.clinicianAction ? `<p><strong>Clinician Action:</strong> ${selected.clinicianAction}</p>` : ''}
    <p><strong>Status:</strong> ${selected.status}</p>
  `;

  if (auditEl) {
    auditEl.innerHTML = selected.auditTrail.map(e => `<div class="py-2 border-b text-sm text-slate-700">${e}</div>`).join('');
  }

  const openCount = state.escalationItems.filter(i => i.status === 'OPEN').length;
  const resolvedCount = state.escalationItems.filter(i => i.status === 'RESOLVED').length;
  const openEl = document.getElementById('escalation-open-count');
  const resolvedEl = document.getElementById('escalation-resolved-count');
  if (openEl) openEl.textContent = String(openCount);
  if (resolvedEl) resolvedEl.textContent = String(resolvedCount);
}
