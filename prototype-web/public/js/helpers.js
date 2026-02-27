/**
 * Helpers Module - Utility functions for the demo
 * Part of Peacefull.ai Demo technical debt cleanup
 */

import { state } from './state.js';

// ============ BADGE CLASS HELPERS ============

export function triageBadgeClass(status) {
  if (status === 'ACK') return 'bg-blue-100 text-blue-700';
  if (status === 'IN_REVIEW') return 'bg-amber-100 text-amber-700';
  if (status === 'ESCALATED') return 'bg-red-100 text-red-700';
  if (status === 'RESOLVED') return 'bg-green-100 text-green-700';
  return 'bg-slate-100 text-slate-700';
}

export function memoryBadgeClass(status) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'CONFLICT_FLAGGED') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

export function planBadgeClass(status) {
  if (status === 'REVIEWED') return 'bg-green-100 text-green-700';
  if (status === 'HOLD') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export function enterpriseBadgeClass(status) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700';
  if (status === 'CONDITIONAL') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function mbcSeverityClass(severity) {
  if (severity === 'Minimal' || severity === 'None') return 'bg-green-100 text-green-700';
  if (severity === 'Mild') return 'bg-blue-100 text-blue-700';
  if (severity === 'Moderate') return 'bg-amber-100 text-amber-700';
  if (severity === 'Moderately Severe' || severity === 'Severe') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function mbcTrendIcon(trend) {
  if (trend === 'improving') return '↓ Improving';
  if (trend === 'worsening') return '↑ Worsening';
  return '→ Stable';
}

export function adherenceBadgeClass(status) {
  if (status === 'ON_TRACK') return 'bg-green-100 text-green-700';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700';
  if (status === 'AT_RISK') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function escalationBadgeClass(status) {
  if (status === 'RESOLVED') return 'bg-green-100 text-green-700';
  if (status === 'ACK') return 'bg-blue-100 text-blue-700';
  if (status === 'OPEN') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function escalationTierClass(tier) {
  if (tier === 'T3') return 'bg-red-600 text-white';
  if (tier === 'T2') return 'bg-amber-500 text-white';
  return 'bg-blue-500 text-white';
}

export function getSelectedMBC() {
  return state.mbcScores.find(i => i.id === state.selectedMBCId) || state.mbcScores[0];
}

export function getSelectedAdherence() {
  return state.adherenceItems.find(i => i.id === state.selectedAdherenceId) || state.adherenceItems[0];
}

export function getSelectedEscalation() {
  return state.escalationItems.find(i => i.id === state.selectedEscalationId) || state.escalationItems[0];
}

// ============ SELECTION GETTERS ============

export function getSelectedTriageItem() {
  return state.triageQueue.find(item => item.id === state.selectedTriageId) || state.triageQueue[0] || null;
}

export function getSelectedMemory() {
  return state.memoryItems.find(item => item.id === state.selectedMemoryId) || state.memoryItems[0];
}

export function getSelectedPlan() {
  return state.planItems.find(item => item.id === state.selectedPlanId) || state.planItems[0];
}

export function getSelectedEnterprise() {
  return state.enterpriseItems.find(i => i.id === state.selectedEnterpriseId) || state.enterpriseItems[0];
}

// ============ COMPUTATION HELPERS ============

export function computeRiskPosture() {
  const tierEl = document.getElementById('safety-tier');
  const tier = tierEl ? tierEl.value : 'T2';
  const escalated = state.triageQueue.some(i => i.status === 'ESCALATED' || i.signalBand === 'ELEVATED');
  if (tier === 'T3' || escalated) return 'Elevated';
  if (tier === 'T2') return 'Moderate';
  return 'Guarded';
}

export function computeReadinessVerdict() {
  const signalEl = document.getElementById('enterprise-readiness-signal');
  const signal = signalEl ? parseInt(signalEl.textContent) || 0 : 0;
  if (signal >= 70) return 'APPROVED';
  if (signal >= 40) return 'CONDITIONAL';
  return 'REVIEW_REQUIRED';
}

export function computePilotExpansionScore() {
  const timeSavedEl = document.getElementById('roi-metric-1');
  const readinessEl = document.getElementById('enterprise-readiness-signal');
  const timeSaved = timeSavedEl ? parseFloat(timeSavedEl.textContent) || 0 : 0;
  const readinessSignal = readinessEl ? parseInt(readinessEl.textContent) || 0 : 0;
  const unresolvedHigh = state.triageQueue.filter(item => item.status !== 'RESOLVED' && item.signalBand === 'ELEVATED').length;
  return Math.round(timeSaved + readinessSignal * 0.2 + unresolvedHigh * 5);
}

// ============ UI HELPERS ============

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

export function setQuickNavActive(screenId) {
  document.querySelectorAll('[data-quick-nav]').forEach((button) => {
    const isActive = button.dataset.quickNav === screenId;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

export function showScreen(screenId, options = {}) {
  const { updateHash = true } = options;
  const screen = document.getElementById(screenId);
  if (!screen) {
    showToast(`Navigation target not found: ${screenId}`);
    return;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
  setQuickNavActive(screenId);

  if (updateHash && window.location.hash !== `#${screenId}`) {
    window.location.hash = screenId;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  // Trigger render for decision room
  if (screenId === 'decision-room' && typeof window.renderDecisionRoom === 'function') {
    window.renderDecisionRoom();
  }
}

export function initScreenRouting() {
  const openFromHash = () => {
    const hashScreen = window.location.hash.replace('#', '').trim();
    if (hashScreen && document.getElementById(hashScreen)) {
      showScreen(hashScreen, { updateHash: false });
      return;
    }
    showScreen('landing', { updateHash: false });
  };

  window.addEventListener('hashchange', () => {
    const hashScreen = window.location.hash.replace('#', '').trim();
    if (hashScreen && document.getElementById(hashScreen)) {
      showScreen(hashScreen, { updateHash: false });
    }
  });

  openFromHash();
}
