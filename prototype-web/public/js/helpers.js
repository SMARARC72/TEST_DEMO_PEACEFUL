/**
 * Helpers Module - Utility functions
 * Clinical platform utilities
 */

import { state } from './state.js';

// ============ BADGE CLASS HELPERS ============

export function triageBadgeClass(status) {
  if (status === 'ACK') return 'bg-blue-100 text-blue-700';
  if (status === 'IN_REVIEW') return 'bg-amber-100 text-amber-700';
  if (status === 'ESCALATED') return 'bg-red-100 text-red-700';
  if (status === 'RESOLVED') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}

export function memoryBadgeClass(status) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'CONFLICT_FLAGGED') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

export function planBadgeClass(status) {
  if (status === 'REVIEWED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'HOLD') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export function mbcSeverityClass(severity) {
  if (severity === 'Minimal' || severity === 'None') return 'bg-emerald-100 text-emerald-700';
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
  if (status === 'ON_TRACK') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700';
  if (status === 'AT_RISK') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function escalationBadgeClass(status) {
  if (status === 'RESOLVED') return 'bg-emerald-100 text-emerald-700';
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

export function enterpriseBadgeClass(status) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'CONDITIONAL') return 'bg-amber-100 text-amber-700';
  if (status === 'REVIEW_REQUIRED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

// ============ COMPUTATION HELPERS ============

export function computeRiskPosture() {
  const tierEl = document.getElementById('safety-tier');
  const tier = tierEl ? tierEl.value : 'T0';
  if (tier === 'T3') return 'Elevated';
  const hasEscalation = state.triageQueue.some(
    item => item.status === 'ESCALATED' || item.signalBand === 'ELEVATED'
  );
  if (hasEscalation) return 'Elevated';
  if (tier === 'T2') return 'Moderate';
  return 'Guarded';
}

export function computePilotExpansionScore() {
  const timeEl = document.getElementById('roi-metric-1');
  const readinessEl = document.getElementById('enterprise-readiness-signal');
  const timeSaved = timeEl ? parseFloat(timeEl.textContent) || 0 : 0;
  const readiness = readinessEl ? parseInt(readinessEl.textContent) || 0 : 0;
  const unresolvedElevated = state.triageQueue.filter(
    item => item.signalBand === 'ELEVATED' && item.status !== 'RESOLVED'
  ).length;
  return timeSaved + readiness * 0.2 + unresolvedElevated * 5;
}

export function computeReadinessVerdict() {
  const signalEl = document.getElementById('enterprise-readiness-signal');
  const signal = signalEl ? parseInt(signalEl.textContent) || 0 : 0;
  if (signal >= 70) return 'APPROVED';
  if (signal >= 40) return 'CONDITIONAL';
  return 'REVIEW_REQUIRED';
}

// ============ UI HELPERS ============

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
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

  // Guard: skip if already showing this screen (prevents hashchange re-entry thrash)
  if (screen.classList.contains('active')) {
    // Still ensure scroll is at top
    window.scrollTo(0, 0);
    return;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
  setQuickNavActive(screenId);

  // Use replaceState to update the URL hash without triggering native scroll-to-anchor
  if (updateHash) {
    const newHash = `#${screenId}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  }

  // Force synchronous scroll reset (override smooth behavior)
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  
  // Focus management for accessibility
  const heading = screen.querySelector('h1, h2, [role="heading"]');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
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
      // showScreen already guards against re-entry
      showScreen(hashScreen, { updateHash: false });
    }
  });

  // Also handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const hashScreen = window.location.hash.replace('#', '').trim();
    if (hashScreen && document.getElementById(hashScreen)) {
      showScreen(hashScreen, { updateHash: false });
    }
  });

  openFromHash();
}
