/**
 * Render Module - All render functions for updating the DOM
 * Clinical platform render functions
 */

import { state, baselinePatientProfiles, baselineSessionPrep, baselineProgressData, baselineResources, baselineSafetyPlan, baselineOnboardingSteps, baselineChatScript, baselineHistoryEntries, baselinePatientMemories, baselineJournalPrompts, baselineClinicianProfile, baselinePopulationHealth, baselineRegulatoryStatus, baselineSDOHData, baselineSessionNotes } from './state.js';
import {
  triageBadgeClass,
  memoryBadgeClass,
  planBadgeClass,
  mbcSeverityClass,
  mbcTrendIcon,
  adherenceBadgeClass,
  escalationBadgeClass,
  escalationTierClass,
  getSelectedTriageItem,
  getSelectedMemory,
  getSelectedPlan,
  getSelectedMBC,
  getSelectedAdherence,
  getSelectedEscalation,
  computeReadinessVerdict
} from './helpers.js';

// ─── XSS Protection (SEC-001) ────────────────────────────────────────
// Sanitize all HTML injected via innerHTML to prevent stored/reflected XSS.

const PURIFY_CONFIG = {
  ADD_ATTR: ['onclick', 'data-nav', 'data-action', 'data-topic-id',
    'data-resource-expand', 'data-resource-filter',
    'data-history-expand', 'data-history-filter',
    'data-safety-step', 'data-pmem-expand', 'data-pmem-filter',
    'data-patient-profile'],
  ADD_TAGS: ['canvas'],
  ALLOW_ARIA_ATTR: true,
  ALLOW_DATA_ATTR: true,
};

/**
 * Sanitize HTML string before assigning to innerHTML.
 * Falls back to passthrough if DOMPurify is not loaded.
 */
function sanitize(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, PURIFY_CONFIG);
  }
  return html;
}

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

  tbody.innerHTML = sanitize(state.triageQueue.map(item => `
    <tr onclick="selectTriageItem('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedTriageId ? 'bg-fuchsia-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.source}</td>
      <td class="py-2 pr-2">${item.signalBand}</td>
      <td class="py-2 pr-2">${item.summary}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${triageBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join(''));

  const selected = getSelectedTriageItem();
  detail.innerHTML = sanitize(selected ? `
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Submission Source:</strong> ${selected.source}</p>
    <p><strong>Signal Band:</strong> ${selected.signalBand}</p>
    <p><strong>Summary:</strong> ${selected.summary}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Updated:</strong> ${selected.updatedAt}</p>
  ` : '<p>No triage items available.</p>');

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

  tbody.innerHTML = sanitize(state.memoryItems.map(item => `
    <tr onclick="selectMemory('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedMemoryId ? 'bg-indigo-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.category}</td>
      <td class="py-2 pr-2">${item.statement}</td>
      <td class="py-2 pr-2"><span class="signal-band signal-${(item.signalBand || 'GUARDED').toLowerCase()}">${item.signalBand || 'GUARDED'}</span></td>
      <td class="py-2 pr-2">${item.conflict ? 'Flagged' : 'None'}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${memoryBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join(''));

  const selected = getSelectedMemory();
  detail.innerHTML = sanitize(`
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Proposed Memory:</strong> ${selected.statement}</p>
    ${selected.existing ? `<p><strong>Conflicting Existing Memory:</strong> ${selected.existing}</p>` : ''}
    <p><strong>Signal Band:</strong> ${selected.signalBand || 'GUARDED'}</p>
    <p><strong>Evidence:</strong> ${selected.evidence.join(', ')}</p>
    <p><strong>Known Unknowns:</strong> ${selected.uncertainty}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Audit Entry:</strong> ${selected.audit[selected.audit.length - 1]}</p>
  `);

  const approved = state.memoryItems.filter(item => item.status === 'APPROVED');
  approvedList.innerHTML = sanitize(approved.length
    ? approved.map(item => `<li>${item.patient}: ${item.statement}</li>`).join('')
    : '<li>No approved memory yet.</li>');

  const prepReduction = `${Math.min(12 + approved.length * 3, 24)}%`;
  const linkEl = document.getElementById('memory-roi-link');
  const profileList = document.getElementById('clinician-profile-memory');
  if (linkEl) linkEl.textContent = prepReduction;
  if (profileList) {
    profileList.innerHTML = sanitize(approved.length
      ? approved.map(item => `<li>${item.patient}: ${item.statement}</li>`).join('')
      : '<li>No approved memory yet.</li>');
  }
}

// ============ TREATMENT PLAN ============

export function renderTreatmentPlan() {
  const tbody = document.getElementById('treatment-plan-table-body');
  const detail = document.getElementById('treatment-plan-detail');
  if (!tbody || !detail) return;

  tbody.innerHTML = sanitize(state.planItems.map(item => `
    <tr onclick="selectPlan('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedPlanId ? 'bg-emerald-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.goal}</td>
      <td class="py-2 pr-2">${item.intervention}</td>
      <td class="py-2 pr-2">${item.owner}</td>
      <td class="py-2 pr-2">${item.target}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${planBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join(''));

  const selected = getSelectedPlan();
  detail.innerHTML = sanitize(`
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Goal:</strong> ${selected.goal}</p>
    <p><strong>Intervention:</strong> ${selected.intervention}</p>
    <p><strong>Evidence Links:</strong> ${selected.evidence.join(', ')}</p>
    <p><strong>Known Unknowns:</strong> ${selected.uncertainty}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
    <p><strong>Last Audit Entry:</strong> ${selected.audit[selected.audit.length - 1]}</p>
  `);

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
    profilePlan.innerHTML = sanitize(reviewed.length
      ? reviewed.map(item => `<li>${item.patient}: ${item.goal}</li>`).join('')
      : '<li>No reviewed treatment plan items yet.</li>');
  }
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
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Mood Stability</span><span>2.4 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-emerald-600 h-2 rounded-full" style="width: 48%"></div></div></div>
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
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Coping Adherence</span><span>2.8 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-emerald-600 h-2 rounded-full" style="width: 56%"></div></div></div>
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
        <div class="p-4 bg-emerald-50 rounded-xl border-l-4 border-emerald-500">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-500">Feb 23, 2:00 PM</span>
            <span class="px-2 py-1 bg-emerald-700 text-white rounded text-xs font-bold">T1</span>
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
              <div><div class="flex items-center justify-between text-slate-600 mb-1"><span>Mood Stability</span><span>3.6 / 5</span></div><div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-emerald-600 h-2 rounded-full" style="width: 72%"></div></div></div>
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
  if (badgesEl) badgesEl.innerHTML = sanitize(profile.badges.join(''));
  if (totalEl) totalEl.textContent = profile.stats.total;
  if (weeklyEl) weeklyEl.textContent = profile.stats.weekly;
  if (alertsEl) alertsEl.textContent = profile.stats.alerts;
  if (activityEl) activityEl.innerHTML = sanitize(profile.activity);
  if (trendsEl) trendsEl.innerHTML = sanitize(profile.trends);

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

  tbody.innerHTML = sanitize(state.mbcScores.map(item => `
    <tr onclick="selectMBC('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedMBCId ? 'bg-emerald-50' : ''}">
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2">${item.instrument}</td>
      <td class="py-2 pr-2 font-semibold">${item.score}</td>
      <td class="py-2 pr-2"><span class="px-2 py-1 rounded text-xs font-semibold ${mbcSeverityClass(item.severity)}">${item.severity}</span></td>
      <td class="py-2 pr-2 text-sm">${mbcTrendIcon(item.trend)}</td>
      <td class="py-2 text-sm text-slate-500">${item.date}</td>
    </tr>`).join(''));

  const selected = getSelectedMBC();
  const sparkline = selected.priorScores.map((s, i) => `T${i + 1}: ${s}`).join(' → ');
  detail.innerHTML = sanitize(`
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Instrument:</strong> ${selected.instrument}</p>
    <p><strong>Current Score:</strong> ${selected.score} (${selected.severity})</p>
    <p><strong>Trend:</strong> ${mbcTrendIcon(selected.trend)}</p>
    <p><strong>Score History:</strong> ${sparkline} → <strong>${selected.score}</strong></p>
    <p><strong>Date:</strong> ${selected.date}</p>
    ${selected.clinicianNote ? `<p><strong>Clinician Note:</strong> ${selected.clinicianNote}</p>` : '<p class="text-sm text-slate-500 italic">No clinician note yet.</p>'}
  `);

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

  tbody.innerHTML = sanitize(state.adherenceItems.map(item => {
    const pct = Math.round((item.completed / item.target) * 100));
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
  detail.innerHTML = sanitize(`
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Task:</strong> ${selected.task}</p>
    <p><strong>Frequency:</strong> ${selected.frequency}</p>
    <p><strong>Progress:</strong> ${selected.completed}/${selected.target} (${pct}%)</p>
    <div class="w-full bg-slate-200 rounded-full h-3 my-2"><div class="h-3 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}" style="width: ${pct}%"></div></div>
    <p><strong>Current Streak:</strong> ${selected.streak} days</p>
    <p><strong>Last Logged:</strong> ${selected.lastLogged}</p>
    <p><strong>Status:</strong> ${selected.status}</p>
  `);

  const onTrack = state.adherenceItems.filter(i => i.status === 'ON_TRACK').length;
  const atRisk = state.adherenceItems.filter(i => i.status === 'AT_RISK').length;
  const onEl = document.getElementById('adherence-on-track-count');
  const riskEl = document.getElementById('adherence-at-risk-count');
  if (onEl) onEl.textContent = String(onTrack);
  if (riskEl) riskEl.textContent = String(atRisk);
}

// ============ ESCALATION PROTOCOLS (F5) ============

export function renderEscalationProtocols() {
  const tbody = document.getElementById('escalation-table-body');
  const detail = document.getElementById('escalation-detail');
  const auditEl = document.getElementById('escalation-audit-trail');
  if (!tbody || !detail) return;

  tbody.innerHTML = sanitize(state.escalationItems.map(item => `
    <tr onclick="selectEscalation('${item.id}')" class="border-b cursor-pointer ${item.id === state.selectedEscalationId ? 'bg-amber-50' : ''}">
      <td class="py-2 pr-2"><span class="px-2 py-1 rounded text-xs font-bold ${escalationTierClass(item.tier)}">${item.tier}</span></td>
      <td class="py-2 pr-2">${item.patient}</td>
      <td class="py-2 pr-2 text-sm">${item.trigger}</td>
      <td class="py-2 pr-2 text-sm">${item.detectedAt}</td>
      <td class="py-2"><span class="px-2 py-1 rounded text-xs font-semibold ${escalationBadgeClass(item.status)}">${item.status}</span></td>
    </tr>`).join(''));

  const selected = getSelectedEscalation();
  detail.innerHTML = sanitize(`
    <p><strong>Patient:</strong> ${selected.patient}</p>
    <p><strong>Tier:</strong> <span class="px-2 py-1 rounded text-xs font-bold ${escalationTierClass(selected.tier)}">${selected.tier}</span></p>
    <p><strong>Trigger:</strong> ${selected.trigger}</p>
    <p><strong>Detected:</strong> ${selected.detectedAt}</p>
    ${selected.acknowledgedAt ? `<p><strong>Acknowledged:</strong> ${selected.acknowledgedAt}</p>` : ''}
    ${selected.resolvedAt ? `<p><strong>Resolved:</strong> ${selected.resolvedAt}</p>` : ''}
    ${selected.clinicianAction ? `<p><strong>Clinician Action:</strong> ${selected.clinicianAction}</p>` : ''}
    <p><strong>Status:</strong> ${selected.status}</p>
  `);

  if (auditEl) {
    auditEl.innerHTML = sanitize(selected.auditTrail.map(e => `<div class="py-2 border-b text-sm text-slate-700">${e}</div>`).join(''));
  }

  const openCount = state.escalationItems.filter(i => i.status === 'OPEN').length;
  const resolvedCount = state.escalationItems.filter(i => i.status === 'RESOLVED').length;
  const openEl = document.getElementById('escalation-open-count');
  const resolvedEl = document.getElementById('escalation-resolved-count');
  if (openEl) openEl.textContent = String(openCount);
  if (resolvedEl) resolvedEl.textContent = String(resolvedCount);
}

// ============ PATIENT PROFILE (F-P1) ============

export function renderPatientHome() {
  const profile = baselinePatientProfiles[state.selectedPatientProfile] || baselinePatientProfiles.maria;
  const progress = baselineProgressData[state.selectedPatientProfile] || baselineProgressData.maria;
  const session = state.sessionTopics[state.selectedPatientProfile] || state.sessionTopics.maria;
  
  const nameEl = document.getElementById('patient-home-name');
  if (nameEl) nameEl.textContent = profile.name.split(' ')[0];
  
  const sessionDateEl = document.getElementById('patient-home-session-date');
  if (sessionDateEl) sessionDateEl.textContent = `${session.date} at ${session.time} · ${session.format}`;
  
  const streakEl = document.getElementById('patient-home-streak');
  if (streakEl) streakEl.textContent = `${progress.streak} days`;
  
  const levelEl = document.getElementById('patient-home-level');
  if (levelEl) levelEl.textContent = progress.levelName;
  
  const badgesEl = document.getElementById('patient-home-badges');
  if (badgesEl) badgesEl.textContent = String(progress.badges.filter(b => b.earned).length);
}

export function renderPatientProfile() {
  const el = document.getElementById('patient-profile-content');
  if (!el) return;
  const p = baselinePatientProfiles[state.selectedPatientProfile] || baselinePatientProfiles.maria;
  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-800">${p.name.charAt(0)}</div>
        <div>
          <h2 class="text-xl font-bold text-slate-800">${p.name}</h2>
          <p class="text-sm text-slate-500">${p.age} y/o · ${p.pronouns} · ${p.language}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-500 mb-1">Diagnosis</p><p class="font-semibold text-slate-800">${p.diagnosis.primary}</p><p class="text-xs text-slate-500">${p.diagnosis.code}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-500 mb-1">Treatment Start</p><p class="font-semibold text-slate-800">${p.treatmentStart}</p></div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Medications</h3>
      <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">${p.medications.map(m => `<li>${m}</li>`).join('')}</ul>
      <p class="text-xs text-slate-500 mt-2">Allergies: ${p.allergies}</p>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Care Team</h3>
      <div class="space-y-3">${p.careTeam.map(c => `<div class="flex items-center gap-3"><div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700">${c.name.split(' ').map(w => w[0]).join('')}</div><div><p class="font-semibold text-slate-800 text-sm">${c.name}</p><p class="text-xs text-slate-500">${c.role} · ${c.credentials}</p></div></div>`).join('')}</div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Emergency Contact</h3>
      <p class="text-sm text-slate-700">${p.emergencyContact.name}</p>
      <p class="text-sm text-slate-500">${p.emergencyContact.phone}</p>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Preferences</h3>
      <div class="grid grid-cols-3 gap-3 text-sm">
        <div><p class="text-xs text-slate-500">Contact</p><p class="font-semibold text-slate-800">${p.preferences.contact}</p></div>
        <div><p class="text-xs text-slate-500">Reminders</p><p class="font-semibold text-slate-800">${p.preferences.reminderTime}</p></div>
        <div><p class="text-xs text-slate-500">Session alert</p><p class="font-semibold text-slate-800">${p.preferences.sessionAlert}</p></div>
      </div>
    </div>
  `);
}

// ============ SESSION PREP (F-P2) ============

export function renderSessionPrep() {
  const el = document.getElementById('patient-session-prep-content');
  if (!el) return;
  const s = state.sessionTopics[state.selectedPatientProfile] || state.sessionTopics.maria;
  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">📅</div>
        <div>
          <p class="font-semibold text-slate-800">Next Session: ${s.date} at ${s.time}</p>
          <p class="text-sm text-slate-500">${s.duration} min · ${s.format} · ${s.therapist.name}</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Discussion Topics</h3>
      <div class="space-y-2">
        ${s.topics.map(t => `
          <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" data-topic-id="${t.id}" ${t.checked ? 'checked' : ''} class="w-5 h-5 text-emerald-700 rounded">
            <span class="text-sm text-slate-700">${t.label}</span>
          </label>
        `).join('')}
      </div>
      <div class="mt-3">
        <input type="text" id="custom-topic-input" placeholder="Add a custom topic…" class="w-full p-2 border border-slate-200 rounded-lg text-sm">
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-2">Goals for This Session</h3>
      <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">${s.goals.map(g => `<li>${g}</li>`).join('')}</ul>
    </div>
    <div class="bg-slate-50 rounded-xl p-4">
      <h3 class="font-semibold text-slate-800 mb-2">Previous Session Summary</h3>
      <p class="text-sm text-slate-700">${s.previousSummary}</p>
    </div>
  `);
}

// ============ PROGRESS & GAMIFICATION (F-P3) ============

export function renderProgress() {
  const el = document.getElementById('patient-progress-content');
  if (!el) return;
  const p = baselineProgressData[state.selectedPatientProfile] || baselineProgressData.maria;
  const moodDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const moodEmojis = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
  const pct = Math.round((p.xp / p.xpToNext) * 100);
  const streakPct = Math.round((p.streak / p.streakTarget) * 100);

  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <div class="flex items-center justify-between mb-3">
        <div>
          <p class="text-xs text-slate-500">Level ${p.level}</p>
          <p class="font-bold text-lg text-slate-800">${p.levelName}</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-slate-500">${p.xp} / ${p.xpToNext} XP</p>
        </div>
      </div>
      <div class="w-full bg-slate-200 rounded-full h-2 mb-1"><div class="bg-indigo-500 h-2 rounded-full" style="width:${pct}%"></div></div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">🔥 Streak</h3>
      <div class="flex items-center gap-4">
        <div class="streak-ring relative w-20 h-20">
          <svg viewBox="0 0 36 36" class="w-20 h-20">
            <path class="text-slate-200" stroke="currentColor" stroke-width="3" fill="none" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="text-emerald-600" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="${streakPct}, 100" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center font-bold text-lg text-emerald-800">${p.streak}</div>
        </div>
        <div>
          <p class="font-semibold text-slate-800">${p.streak} of ${p.streakTarget} days</p>
          <p class="text-sm text-slate-500">${p.streakTarget - p.streak} more to earn ⭐ 7-Day Streak badge</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Weekly Mood</h3>
      <div class="flex justify-between">
        ${p.weeklyMood.map((m, i) => `
          <div class="text-center">
            <div class="text-xl mb-1">${m !== null ? (moodEmojis[m] || '😐') : '—'}</div>
            <p class="text-xs text-slate-500">${moodDays[i]}</p>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Badges</h3>
      <div class="grid grid-cols-4 gap-3">
        ${p.badges.map(b => `
          <div class="badge-card text-center p-2 rounded-xl ${b.earned ? 'bg-amber-50' : 'bg-slate-100 locked'}">
            <div class="text-2xl mb-1">${b.earned ? b.icon : '🔒'}</div>
            <p class="text-xs font-semibold ${b.earned ? 'text-slate-800' : 'text-slate-400'}">${b.label}</p>
            ${b.earned ? `<p class="text-[10px] text-slate-500">${b.earnedDate}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-5">
      <h3 class="font-semibold text-slate-800 mb-3">Milestones</h3>
      <div class="space-y-2">
        ${p.milestones.map(m => `
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${m.achieved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}">${m.achieved ? '✓' : '○'}</div>
            <div>
              <p class="text-sm ${m.achieved ? 'text-slate-800' : 'text-slate-400'}">${m.label}</p>
              ${m.date ? `<p class="text-xs text-slate-500">${m.date}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `);
}

// ============ RESOURCES (F-P4) ============

export function renderResources() {
  const el = document.getElementById('patient-resources-content');
  if (!el) return;
  const filter = state.resourceFilter;
  const items = filter === 'All' ? baselineResources : baselineResources.filter(r => r.category === filter);
  
  el.innerHTML = sanitize(items.map(r => `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button data-resource-expand="${r.id}" class="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50">
        <div class="text-2xl">${r.icon}</div>
        <div class="flex-1">
          <p class="font-semibold text-slate-800">${r.title}</p>
          <p class="text-sm text-slate-500">${r.description}</p>
          <p class="text-xs text-slate-400 mt-1">Source: ${r.source}</p>
        </div>
        <svg class="w-5 h-5 text-slate-400 transition-transform ${state.expandedResourceId === r.id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      ${state.expandedResourceId === r.id ? `<div class="px-4 pb-4 pt-0 border-t"><p class="text-sm text-slate-700 mt-3">${r.expandedContent}</p></div>` : ''}
    </div>
  `).join(''));

  // update filter bar active state
  document.querySelectorAll('[data-resource-filter]').forEach(btn => {
    if (btn.dataset.resourceFilter === filter) {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white';
    } else {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700';
    }
  });
}

// ============ CHAT SIMULATION (F-P5) ============

export function renderChat() {
  const el = document.getElementById('patient-chat-messages');
  if (!el) return;
  el.innerHTML = sanitize(state.chatMessages.map(m => {
    if (m.sender === 'system') {
      return `<div class="chat-bubble chat-bubble-system text-center"><p class="text-xs text-slate-500 italic">${m.text}</p></div>`);
    }
    const isAI = m.sender === 'ai';
    const bubbleClass = isAI ? 'chat-bubble chat-bubble-ai' : 'chat-bubble chat-bubble-patient';
    const memoryChipHTML = m.memoryRef ? `<div class="memory-chip mt-2 inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs"><span>🧠</span><span>${m.memoryRef.strategy}</span><span class="text-indigo-400">· Approved by ${m.memoryRef.approvedBy}</span></div>` : '';
    return `<div class="${bubbleClass}"><p class="text-sm">${m.text}</p>${memoryChipHTML}</div>`;
  }).join('');

  if (state.chatTyping) {
    el.innerHTML += sanitize(`<div class="chat-bubble chat-bubble-ai flex items-center gap-1"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`);
  }

  el.scrollTop = el.scrollHeight;
}

// ============ HISTORY (F-P6) ============

export function renderHistory() {
  const el = document.getElementById('patient-history-content');
  if (!el) return;
  const entries = baselineHistoryEntries[state.selectedPatientProfile] || baselineHistoryEntries.maria;
  const filter = state.historyFilter;
  const filtered = filter === 'All' ? entries : entries.filter(e => e.type === filter);

  const typeIcons = { CHECKIN: '📋', JOURNAL: '✍️', VOICE: '🎤' };
  const typeColors = { CHECKIN: 'emerald', JOURNAL: 'blue', VOICE: 'purple' };

  el.innerHTML = sanitize(filtered.map(e => {
    const color = typeColors[e.type] || 'slate');
    const date = new Date(e.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const expanded = state.expandedHistoryId === e.id;

    let details = '';
    if (e.type === 'CHECKIN') {
      details = `<div class="grid grid-cols-3 gap-2 text-sm mt-2"><div><span class="text-xs text-slate-500">Mood</span><p class="font-semibold">${e.mood}/5</p></div><div><span class="text-xs text-slate-500">Stress</span><p class="font-semibold">${e.stress}/5</p></div><div><span class="text-xs text-slate-500">Sleep</span><p class="font-semibold">${e.sleep}/5</p></div></div>`;
    } else {
      details = `<p class="text-sm text-slate-600 mt-2 italic">"${e.snippet}"</p>`;
    }

    return `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button data-history-expand="${e.id}" class="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50">
          <div class="w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center text-xl">${typeIcons[e.type]}</div>
          <div class="flex-1">
            <p class="font-semibold text-slate-800 text-sm">${e.type === 'CHECKIN' ? 'Daily Check-in' : e.type === 'JOURNAL' ? 'Journal Entry' : 'Voice Note'}</p>
            <p class="text-xs text-slate-500">${dateStr} · ${timeStr}</p>
          </div>
          <svg class="w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        ${expanded ? `
          <div class="px-4 pb-4 border-t">
            ${details}
            <div class="mt-3 bg-indigo-50 rounded-lg p-3">
              <p class="text-xs font-semibold text-indigo-700 mb-1">AI Reflection</p>
              <p class="text-sm text-indigo-900">${e.aiReflection.tone}</p>
              <p class="text-xs text-indigo-700 mt-1">${e.aiReflection.summary}</p>
              <p class="text-xs text-indigo-600 mt-1"><strong>Next step:</strong> ${e.aiReflection.nextStep}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // update filter bar
  document.querySelectorAll('[data-history-filter]').forEach(btn => {
    if (btn.dataset.historyFilter === filter) {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white';
    } else {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700';
    }
  });
}

// ============ SAFETY PLAN (F-P7) ============

export function renderSafetyPlan() {
  const el = document.getElementById('patient-safety-plan-content');
  if (!el) return;
  const plan = baselineSafetyPlan[state.selectedPatientProfile] || baselineSafetyPlan.maria;
  const stepIcons = ['⚠️', '🧘', '🏖️', '👥', '📞', '🔒'];

  el.innerHTML = sanitize(plan.steps.map((step, i) => {
    const expanded = state.expandedSafetySteps.includes(i));
    return `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button data-safety-step="${i}" class="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50">
          <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">${stepIcons[i] || '📋'}</div>
          <div class="flex-1">
            <p class="font-semibold text-slate-800 text-sm">Step ${i + 1}: ${step.title}</p>
            <p class="text-xs text-slate-500">${step.items.length} items</p>
          </div>
          <svg class="w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        ${expanded ? `
          <div class="px-4 pb-4 border-t">
            <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1 mt-2">${step.items.map(item => `<li>${item}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ============ ONBOARDING (F-P8) ============

export function renderOnboarding() {
  const contentEl = document.getElementById('onboarding-content');
  const progressEl = document.getElementById('onboarding-progress');
  const backBtn = document.getElementById('onboarding-back-btn');
  const nextBtn = document.getElementById('onboarding-next-btn');
  if (!contentEl) return;

  const step = baselineOnboardingSteps[state.onboardingStep] || baselineOnboardingSteps[0];
  contentEl.innerHTML = sanitize(`
    <div class="text-5xl mb-4">${step.icon}</div>
    <h2 class="text-xl font-bold text-slate-800 mb-3">${step.title}</h2>
    <p class="text-sm text-slate-600">${step.description}</p>
  `);

  if (progressEl) {
    progressEl.innerHTML = sanitize(baselineOnboardingSteps.map((_, i) => `<div class="w-8 h-1 rounded ${i <= state.onboardingStep ? 'bg-emerald-700' : 'bg-slate-200'}"></div>`).join(''));
  }

  if (backBtn) backBtn.classList.toggle('hidden', state.onboardingStep === 0);
  if (nextBtn) {
    nextBtn.textContent = state.onboardingStep >= baselineOnboardingSteps.length - 1 ? 'Get Started' : 'Next';
  }
}

// ============ PATIENT MEMORY VIEW (F-M1) ============

export function renderPatientMemoryView() {
  const el = document.getElementById('patient-memory-view-content');
  if (!el) return;
  const memories = baselinePatientMemories[state.selectedPatientProfile] || baselinePatientMemories.maria;
  const filter = state.patientMemoryFilter;
  const filtered = filter === 'All' ? memories : memories.filter(m => m.category === filter);

  el.innerHTML = sanitize(filtered.map(m => {
    const expanded = state.expandedPatientMemoryId === m.id);
    return `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button data-pmem-expand="${m.id}" class="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50">
          <div class="memory-chip px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">🧠 ${m.category}</div>
          <div class="flex-1">
            <p class="font-semibold text-slate-800 text-sm">${m.strategy}</p>
            <p class="text-xs text-slate-500">Approved by ${m.approvedBy} · ${m.approvedDate}</p>
          </div>
          <svg class="w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        ${expanded ? `<div class="px-4 pb-4 border-t"><p class="text-sm text-slate-700 mt-2">${m.description}</p><div class="mt-2 inline-block px-2 py-1 bg-green-50 text-green-700 rounded text-xs">${m.status}</div></div>` : ''}
      </div>
    `;
  }).join('');

  // update filter bar
  document.querySelectorAll('[data-pmem-filter]').forEach(btn => {
    if (btn.dataset.pmemFilter === filter) {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white';
    } else {
      btn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700';
    }
  });
}

// ============ CLINICIAN ANALYTICS ============

export function renderClinicianAnalytics() {
  const el = document.getElementById('clinician-analytics-content');
  if (!el) return;
  const p = state.clinicianProfile;
  const ph = state.populationHealth;

  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">SC</div>
        <div>
          <h2 class="text-xl font-bold text-slate-800">${p.name}</h2>
          <p class="text-sm text-slate-500">${p.credentials}</p>
          <p class="text-xs text-slate-400">NPI: ${p.npi} • Active since ${p.activeSince}</p>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-3 mb-4">
        <div class="bg-emerald-50 rounded-xl p-3 text-center"><p class="text-2xl font-bold text-emerald-800">${p.caseloadSize}</p><p class="text-xs text-slate-500">Active Patients</p></div>
        <div class="bg-blue-50 rounded-xl p-3 text-center"><p class="text-2xl font-bold text-blue-700">${p.avgSessionsPerWeek}</p><p class="text-xs text-slate-500">Sessions/Week</p></div>
        <div class="bg-green-50 rounded-xl p-3 text-center"><p class="text-2xl font-bold text-green-700">${ph.engagementRate}%</p><p class="text-xs text-slate-500">Engagement Rate</p></div>
        <div class="bg-amber-50 rounded-xl p-3 text-center"><p class="text-2xl font-bold text-amber-700">${ph.noShowRate}%</p><p class="text-xs text-slate-500">No-Show Rate</p></div>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${p.certifications.map(c => `<span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">${c}</span>`).join('')}
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 class="font-semibold text-slate-800 mb-4">Notifications</h3>
      <div class="space-y-2">
        ${p.notifications.map(n => `
          <div class="flex items-center gap-3 p-3 ${n.read ? 'bg-slate-50' : 'bg-blue-50'} rounded-xl">
            <div class="w-2 h-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-blue-500'}"></div>
            <div class="flex-1">
              <p class="text-sm ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}">${n.message}</p>
              <p class="text-xs text-slate-400">${n.time}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-xs font-semibold ${n.type === 'alert' ? 'bg-red-100 text-red-700' : n.type === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}">${n.type}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <h3 class="font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 gap-3">
        <button data-nav="population-health" class="p-3 bg-emerald-50 rounded-xl text-sm font-medium text-emerald-800 hover:bg-emerald-100">Population Health Dashboard</button>
        <button data-nav="supervisor-cosign" class="p-3 bg-purple-50 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-100">Supervisor Co-Sign Queue</button>
        <button data-nav="mbc-dashboard" class="p-3 bg-blue-50 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100">MBC Dashboard</button>
        <button data-nav="escalation-protocols" class="p-3 bg-red-50 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100">Escalation Protocols</button>
      </div>
    </div>
  `);
}

// ============ POPULATION HEALTH DASHBOARD ============

export function renderPopulationHealth() {
  const el = document.getElementById('population-health-content');
  if (!el) return;
  const ph = state.populationHealth;

  el.innerHTML = sanitize(`
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 text-center"><p class="text-3xl font-bold text-slate-800">${ph.totalPatients}</p><p class="text-sm text-slate-500">Total Patients</p></div>
      <div class="bg-white rounded-xl p-4 text-center"><p class="text-3xl font-bold text-emerald-700">${ph.engagementRate}%</p><p class="text-sm text-slate-500">Engagement</p></div>
      <div class="bg-white rounded-xl p-4 text-center"><p class="text-3xl font-bold text-blue-600">${ph.avgPHQ9}</p><p class="text-sm text-slate-500">Avg PHQ-9</p></div>
      <div class="bg-white rounded-xl p-4 text-center"><p class="text-3xl font-bold text-amber-600">${ph.avgGAD7}</p><p class="text-sm text-slate-500">Avg GAD-7</p></div>
    </div>
    <div class="grid grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <h3 class="font-semibold text-slate-800 mb-4">Outcome Distribution</h3>
        <div style="position:relative;height:240px"><canvas id="chart-outcomes"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <h3 class="font-semibold text-slate-800 mb-4">Risk Distribution</h3>
        <div style="position:relative;height:240px"><canvas id="chart-risk"></canvas></div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <h3 class="font-semibold text-slate-800 mb-4">Diagnosis Mix</h3>
      <div class="space-y-2">
        ${ph.diagnosisMix.map(d => `
          <div class="flex items-center gap-3">
            <span class="w-16 text-sm font-medium text-slate-700">${d.label}</span>
            <div class="flex-1 h-4 bg-slate-100 rounded-full"><div class="h-4 bg-emerald-600 rounded-full" style="width:${d.pct}%"></div></div>
            <span class="text-sm text-slate-600">${d.count} (${d.pct}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `);

  // Render Chart.js charts if available
  if (typeof Chart !== 'undefined') {
    const outcomesCtx = document.getElementById('chart-outcomes');
    if (outcomesCtx) {
      new Chart(outcomesCtx, {
        type: 'doughnut',
        data: {
          labels: ['Improving', 'Stable', 'Worsening'],
          datasets: [{ data: [ph.improvingPct, ph.stablePct, ph.worseningPct], backgroundColor: ['#6C5CE7', '#00B4D8', '#FF6B6B'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } } } }
      });
    }
    const riskCtx = document.getElementById('chart-risk');
    if (riskCtx) {
      const riskLabels = Object.keys(ph.riskDistribution).map(l => l.charAt(0).toUpperCase() + l.slice(1));
      const riskValues = Object.values(ph.riskDistribution);
      new Chart(riskCtx, {
        type: 'bar',
        data: {
          labels: riskLabels,
          datasets: [{ data: riskValues, backgroundColor: ['#6C5CE7', '#00B4D8', '#FFB347', '#FF6B6B'], borderRadius: 6, barPercentage: 0.6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } }, x: { grid: { display: false } } } }
      });
    }
  }
}

// ============ SESSION NOTES ============

export function renderSessionNotes() {
  const el = document.getElementById('session-notes-content');
  if (!el) return;
  const profile = state.currentSessionNoteProfile;
  const note = state.sessionNotes[profile];
  if (!note) return;
  const patientName = baselinePatientProfiles[profile]?.name || profile;

  el.innerHTML = sanitize(`
    <div class="flex gap-2 mb-4">
      ${['maria', 'james', 'emma'].map(p => `
        <button data-action="select-session-note-${p}" class="px-3 py-1.5 rounded-lg text-sm font-medium ${state.currentSessionNoteProfile === p ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}">${baselinePatientProfiles[p]?.name?.split(' ')[0] || p}</button>
      `).join('')}
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">${patientName}</h3>
          <p class="text-sm text-slate-500">Session: ${note.date} • Format: ${note.format}</p>
        </div>
        <span class="px-3 py-1 rounded-lg text-sm font-semibold ${note.signed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${note.signed ? 'SIGNED' : 'DRAFT'}</span>
      </div>
      <div class="space-y-4">
        <div class="p-4 bg-blue-50 rounded-xl"><p class="text-xs font-semibold text-blue-600 mb-1">SUBJECTIVE</p><p class="text-sm text-slate-700">${note.subjective}</p></div>
        <div class="p-4 bg-green-50 rounded-xl"><p class="text-xs font-semibold text-green-600 mb-1">OBJECTIVE</p><p class="text-sm text-slate-700">${note.objective}</p></div>
        <div class="p-4 bg-amber-50 rounded-xl"><p class="text-xs font-semibold text-amber-600 mb-1">ASSESSMENT</p><p class="text-sm text-slate-700">${note.assessment}</p></div>
        <div class="p-4 bg-purple-50 rounded-xl"><p class="text-xs font-semibold text-purple-600 mb-1">PLAN</p><p class="text-sm text-slate-700">${note.plan}</p></div>
      </div>
      <div class="flex gap-3 mt-6">
        <button data-action="sign-session-note" class="px-4 py-2 ${note.signed ? 'bg-slate-300 text-slate-500' : 'bg-emerald-700 text-white'} rounded-xl text-sm font-semibold">${note.signed ? 'Already Signed' : 'Sign Note'}</button>
        <button data-nav="supervisor-cosign" class="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold">Send to Supervisor</button>
        <button data-nav="sdoh-assessment" class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold">SDOH Assessment</button>
      </div>
    </div>
  `);
}

// ============ REGULATORY COMPLIANCE HUB ============

export function renderRegulatoryHub() {
  const el = document.getElementById('regulatory-hub-content');
  if (!el) return;
  const r = state.regulatoryStatus;

  el.innerHTML = sanitize(`
    <div class="grid grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">🏛️</div>
          <div><h3 class="font-semibold text-slate-800">FDA SaMD</h3><p class="text-xs text-slate-500">${r.fdaSamd.status}</p></div>
        </div>
        <div class="space-y-2 text-sm">
          <p><span class="text-slate-500">Classification:</span> <span class="font-medium">${r.fdaSamd.classification}</span></p>
          <p><span class="text-slate-500">Risk Level:</span> <span class="font-medium">${r.fdaSamd.riskLevel}</span></p>
          <p><span class="text-slate-500">Clinical Use:</span> <span class="font-medium">${r.fdaSamd.clinicalUse}</span></p>
          <p><span class="text-slate-500">Timeline:</span> <span class="font-medium">${r.fdaSamd.timeline}</span></p>
        </div>
      </div>
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">🔒</div>
          <div><h3 class="font-semibold text-slate-800">HIPAA</h3><p class="text-xs text-slate-500">${r.hipaa.status}</p></div>
        </div>
        <div class="space-y-2 text-sm">
          <p><span class="text-slate-500">Last Audit:</span> <span class="font-medium">${r.hipaa.lastAudit}</span></p>
          <p><span class="text-slate-500">Controls:</span> <span class="font-medium">${r.hipaa.implemented}/${r.hipaa.controls} implemented</span></p>
          <p><span class="text-slate-500">BAAs Executed:</span> <span class="font-medium">${r.hipaa.baaCount}</span></p>
          <div class="h-2 bg-slate-100 rounded-full mt-2"><div class="h-2 bg-green-500 rounded-full" style="width:${(r.hipaa.implemented/r.hipaa.controls)*100}%"></div></div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <h4 class="font-semibold text-slate-800 text-sm mb-2">42 CFR Part 2</h4>
        <span class="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">${r.cfr42.status}</span>
        <div class="mt-3 space-y-1 text-xs text-slate-600">
          <p>SUD Data Isolation: ${r.cfr42.substanceDataIsolation ? '✅' : '❌'}</p>
          <p>Consent Tracking: ${r.cfr42.consentTracking ? '✅' : '❌'}</p>
          <p>Breach Protocol: ${r.cfr42.breachProtocol}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <h4 class="font-semibold text-slate-800 text-sm mb-2">SOC 2</h4>
        <span class="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">${r.soc2.status}</span>
        <div class="mt-3 space-y-1 text-xs text-slate-600">
          <p>Type: ${r.soc2.type}</p>
          <p>Auditor: ${r.soc2.auditor}</p>
          <p>Target: ${r.soc2.targetDate}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <h4 class="font-semibold text-slate-800 text-sm mb-2">Accessibility</h4>
        <span class="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">WCAG ${r.accessibility.wcag}</span>
        <div class="mt-3 space-y-1 text-xs text-slate-600">
          <p>Automated: ${r.accessibility.automated}%</p>
          <p>Manual: ${r.accessibility.manual}%</p>
          <p>Status: ${r.accessibility.status}</p>
        </div>
      </div>
    </div>
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <p class="text-sm text-emerald-900"><strong>Evidence:</strong> FDA SaMD framework (ev-55), HIPAA Security Rule (ev-56), 42 CFR Part 2 (ev-57).</p>
    </div>
  `);
}

// ============ SDOH ASSESSMENT ============

export function renderSDOHAssessment() {
  const el = document.getElementById('sdoh-assessment-content');
  if (!el) return;
  const profile = state.selectedPatientProfile;
  const sdoh = state.sdohData[profile];
  if (!sdoh) { el.innerHTML = sanitize('<p class="text-slate-500 text-center py-8">No SDOH data for this patient.</p>'; return; }
  const patientName = baselinePatientProfiles[profile]?.name || profile);

  const riskColor = (r) => r === 'Low' ? 'green' : r === 'Moderate' ? 'amber' : 'red';
  const domains = [
    { label: 'Housing', data: sdoh.housing, icon: '🏠' },
    { label: 'Food Security', data: sdoh.food, icon: '🍎' },
    { label: 'Transportation', data: sdoh.transportation, icon: '🚌' },
    { label: 'Employment', data: sdoh.employment, icon: '💼' },
    { label: 'Social Support', data: sdoh.socialSupport, icon: '👥' },
    { label: 'Education', data: sdoh.education, icon: '📚' }
  ];

  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">${patientName}</h3>
          <p class="text-sm text-slate-500">Screened: ${sdoh.screenedDate}</p>
        </div>
        <div class="flex gap-2">
          ${['maria', 'james', 'emma'].map(p => `<button data-patient-profile="${p}" class="px-3 py-1 rounded-lg text-xs font-medium ${profile === p ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}">${baselinePatientProfiles[p]?.name?.split(' ')[0] || p}</button>`).join('')}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${domains.map(d => `
          <div class="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <span class="text-2xl">${d.icon}</span>
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-800">${d.label}</p>
              <p class="text-xs text-slate-500">${d.data.status}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-${riskColor(d.data.risk)}-100 text-${riskColor(d.data.risk)}-700">${d.data.risk}</span>
          </div>
        `).join('')}
      </div>
      ${sdoh.notes ? `<div class="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-900"><strong>Notes:</strong> ${sdoh.notes}</div>` : ''}
    </div>
    <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <p class="text-sm text-indigo-900"><strong>Evidence:</strong> Social determinants framework (Marmot & Wilkinson, 2006), ev-52.</p>
    </div>
  `);
}

// ============ CAREGIVER VIEW ============

export function renderCaregiverView() {
  const el = document.getElementById('caregiver-view-content');
  if (!el) return;
  const profile = state.selectedPatientProfile;
  const p = baselinePatientProfiles[profile];
  const prog = baselineProgressData[profile];
  if (!p || !prog) return;

  el.innerHTML = sanitize(`
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">${p.name}'s Wellness Summary</h3>
      <p class="text-sm text-slate-500 mb-4">This view is shared with your consent. Your clinician controls what is visible.</p>
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-emerald-50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-emerald-800">${prog.streak}</p>
          <p class="text-xs text-slate-500">Day Streak</p>
        </div>
        <div class="bg-blue-50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-blue-700">Level ${prog.level}</p>
          <p class="text-xs text-slate-500">${prog.levelName}</p>
        </div>
        <div class="bg-green-50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-green-700">${prog.badges.filter(b => b.earned).length}</p>
          <p class="text-xs text-slate-500">Badges Earned</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h4 class="font-semibold text-slate-800 mb-3">Weekly Mood Trend</h4>
      <div style="position:relative;height:160px"><canvas id="chart-caregiver-mood"></canvas></div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <h4 class="font-semibold text-slate-800 mb-3">How You Can Help</h4>
      <div class="space-y-2 text-sm text-slate-700">
        <p>• Encourage ${p.name.split(' ')[0]} to complete their daily check-in</p>
        <p>• Be available for the coping strategies they've been practicing</p>
        <p>• If you notice warning signs, contact the care team at 555-0300</p>
        <p>• <strong>Crisis Line:</strong> 988 Suicide & Crisis Lifeline (available 24/7)</p>
      </div>
    </div>
  `);

  // Chart.js mood trend line chart
  if (typeof Chart !== 'undefined') {
    const ctx = document.getElementById('chart-caregiver-mood');
    if (ctx) {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: dayNames,
          datasets: [{
            label: 'Mood (1-5)',
            data: prog.weeklyMood,
            borderColor: '#6C5CE7',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#6C5CE7'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
      });
    }
  }
}
