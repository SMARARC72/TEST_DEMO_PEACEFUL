// ─── API-to-State Bridge ────────────────────────────────────────────
// Maps live API responses to the prototype state.js format so the
// existing render* functions continue to work unchanged.
// Falls back to baseline static data if the API is unavailable.

import {
  isApiAvailable, isAuthenticated, getMe, getCurrentUser,
  getPatients, getClinicianDashboard, getClinicianCaseload,
  getClinicianTriage, getEscalations, getAnalyticsOverview,
  getCompliancePosture, getAuditLog, getEnterpriseConfig,
  getAnalyticsMBC, getAnalyticsAdherence,
  aiChat as apiAiChat, aiSummarize as apiAiSummarize,
  apiFetch,
} from './api.js';

import { state } from './state.js';

// ─── Status ─────────────────────────────────────────────────────────

let liveMode = false;
let patientIdMap = {}; // name → UUID for API calls
let patientNameMap = {}; // UUID → name for display

export function isLiveMode() {
  return liveMode;
}

export function getPatientIdByName(name) {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(patientIdMap)) {
    if (k.toLowerCase().includes(key)) return v;
  }
  return null;
}

export function getPatientNameById(id) {
  return patientNameMap[id] || 'Unknown';
}

// ─── Toast helper (imported from DOM) ───────────────────────────────

function showLiveToast(msg) {
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = `🔴 LIVE: ${msg}`;
    el.classList.remove('hidden');
    el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 3000);
  }
}

// ─── Initialize Live Data ───────────────────────────────────────────

/**
 * Fetches all primary data from the API and populates the state object.
 * Call after successful login. Returns true if live data was loaded.
 */
export async function initializeLiveData() {
  if (!isApiAvailable() || !isAuthenticated()) {
    liveMode = false;
    return false;
  }

  try {
    // Fetch primary data in parallel
    const [patientsResp, dashboardResp, caseloadResp, triageResp, escalationsResp] =
      await Promise.allSettled([
        getPatients(),
        getClinicianDashboard(),
        getClinicianCaseload(),
        getClinicianTriage(),
        getEscalations(),
      ]);

    // ── Patient data ──
    if (patientsResp.status === 'fulfilled') {
      const patients = Array.isArray(patientsResp.value) ? patientsResp.value : patientsResp.value.data || [];
      mapPatients(patients);
    }

    // ── Dashboard ──
    if (dashboardResp.status === 'fulfilled') {
      mapDashboard(dashboardResp.value);
    }

    // ── Caseload ──
    if (caseloadResp.status === 'fulfilled') {
      mapCaseload(caseloadResp.value);
    }

    // ── Triage ──
    if (triageResp.status === 'fulfilled') {
      const triageData = triageResp.value.data || triageResp.value;
      mapTriage(triageData);
    }

    // ── Escalations ──
    if (escalationsResp.status === 'fulfilled') {
      const escData = escalationsResp.value.data || escalationsResp.value;
      mapEscalations(escData);
    }

    // Fetch MBC scores for each patient
    await loadMBCScores();

    liveMode = true;
    showLiveToast('Connected to live Neon database');
    return true;
  } catch (err) {
    console.error('[bridge] Failed to initialize live data:', err);
    liveMode = false;
    return false;
  }
}

// ─── Mappers ────────────────────────────────────────────────────────

function mapPatients(patients) {
  patientIdMap = {};
  patientNameMap = {};

  patients.forEach((p) => {
    const fullName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    patientIdMap[fullName] = p.id;
    patientNameMap[p.id] = fullName;

    // Map to baselinePatientProfiles format
    const profileKey = guessProfileKey(fullName);
    if (profileKey && state.patientProfiles) {
      // Not all state keys exist — update the ones from state.js baseline
    }
  });
}

function guessProfileKey(name) {
  const lower = name.toLowerCase();
  if (lower.includes('maria')) return 'maria';
  if (lower.includes('james')) return 'james';
  if (lower.includes('emma')) return 'emma';
  return null;
}

function mapDashboard(data) {
  // Update population health with live counts
  if (state.populationHealth) {
    state.populationHealth.totalPatients = data.totalPatients || state.populationHealth.totalPatients;
  }

  // Update clinician profile notifications badge
  if (state.clinicianProfile) {
    const newNotifs = [];
    if (data.escalations > 0) {
      newNotifs.push({
        id: 'live-esc', type: 'alert',
        message: `${data.escalations} active escalation(s) — review recommended`,
        time: 'Now', read: false,
      });
    }
    if (data.pendingDrafts > 0) {
      newNotifs.push({
        id: 'live-draft', type: 'draft',
        message: `${data.pendingDrafts} AI draft(s) pending review`,
        time: 'Now', read: false,
      });
    }
    if (data.triageItems > 0) {
      newNotifs.push({
        id: 'live-triage', type: 'reminder',
        message: `${data.triageItems} triage item(s) in queue`,
        time: 'Now', read: false,
      });
    }
    // Prepend live notifications
    state.clinicianProfile.notifications = [
      ...newNotifs,
      ...state.clinicianProfile.notifications.filter((n) => !n.id.startsWith('live-')),
    ];
  }
}

function mapCaseload(data) {
  if (!data.patients) return;

  // Map adherence items from caseload
  const adherenceFromAPI = [];
  data.patients.forEach((p) => {
    if (p.adherenceRate !== null && p.adherenceRate !== undefined) {
      adherenceFromAPI.push({
        id: `adh-live-${p.id.slice(0, 8)}`,
        patient: p.name,
        task: 'Overall treatment adherence',
        frequency: 'Ongoing',
        completed: Math.round((p.adherenceRate || 0) * 7),
        target: 7,
        streak: 0,
        lastLogged: p.lastContact || new Date().toISOString(),
        status: (p.adherenceRate || 0) >= 0.8 ? 'ON_TRACK' : (p.adherenceRate || 0) >= 0.5 ? 'PARTIAL' : 'AT_RISK',
      });
    }
  });

  // If we got live adherence data, merge it (keep baseline detail items, add live overview)
  if (adherenceFromAPI.length > 0) {
    // Keep baseline items but update their statuses based on live data
    // This preserves the detailed task-level view
  }
}

function mapTriage(items) {
  if (!Array.isArray(items) || items.length === 0) return;

  const mapped = items.map((t, i) => ({
    id: t.id || `triage-live-${i}`,
    patient: t.patient?.name || patientNameMap[t.patientId] || 'Unknown',
    tier: mapSignalBandToTier(t.signalBand),
    signal: t.signalBand || 'MODERATE',
    summary: t.summary || 'Pending review',
    status: t.status || 'PENDING',
    timestamp: formatTimestamp(t.createdAt),
    source: t.source || 'System',
  }));

  state.triageQueue = mapped;
  if (mapped.length > 0) {
    state.selectedTriageId = mapped[0].id;
  }
}

function mapSignalBandToTier(band) {
  switch (band) {
    case 'ELEVATED': return 'T2';
    case 'MODERATE': return 'T1';
    case 'GUARDED': return 'T1';
    case 'LOW': return 'T0';
    default: return 'T1';
  }
}

function mapEscalations(items) {
  if (!Array.isArray(items) || items.length === 0) return;

  const mapped = items.map((e) => ({
    id: e.id,
    patient: e.patient?.name || patientNameMap[e.patientId] || 'Unknown',
    tier: e.tier || 'T2',
    trigger: e.summary || 'Escalation detected',
    detectedAt: formatTimestamp(e.detectedAt),
    acknowledgedAt: e.acknowledgedAt ? formatTimestamp(e.acknowledgedAt) : '',
    resolvedAt: e.resolvedAt ? formatTimestamp(e.resolvedAt) : '',
    clinicianAction: e.clinicianAction || '',
    status: e.status || 'OPEN',
    auditTrail: (e.auditTrail || []).map((a) =>
      `${formatTimestamp(a.at)} — ${a.by === 'SYSTEM' ? 'System' : 'Clinician'}: ${a.note || a.action}`
    ),
  }));

  state.escalationItems = mapped;
  if (mapped.length > 0) {
    state.selectedEscalationId = mapped[0].id;
  }
}

async function loadMBCScores() {
  // Try to load MBC from clinician route for each known patient
  const mbcAll = [];

  for (const [name, id] of Object.entries(patientIdMap)) {
    try {
      const scores = await apiFetch(`/clinician/patients/${id}/mbc`);
      const items = Array.isArray(scores) ? scores : scores.data || [];
      items.forEach((s) => {
        mbcAll.push({
          id: s.id || `mbc-live-${mbcAll.length}`,
          patient: name,
          instrument: mapInstrument(s.instrument),
          score: s.score,
          severity: s.severity || deriveSeverity(s.instrument, s.score),
          date: s.date ? s.date.split('T')[0] : new Date().toISOString().split('T')[0],
          trend: mapTrend(s.trend),
          priorScores: s.priorScores || [],
          clinicianNote: s.clinicianNote || '',
        });
      });
    } catch {
      // Patient may not have MBC scores — that's fine
    }
  }

  if (mbcAll.length > 0) {
    state.mbcScores = mbcAll;
    state.selectedMBCId = mbcAll[0].id;
  }
}

function mapInstrument(raw) {
  if (!raw) return 'PHQ-9';
  const upper = raw.toUpperCase();
  if (upper.includes('PHQ')) return 'PHQ-9';
  if (upper.includes('GAD')) return 'GAD-7';
  return raw;
}

function mapTrend(raw) {
  if (!raw) return 'stable';
  const lower = raw.toLowerCase();
  if (lower === 'up' || lower === 'worsening') return 'worsening';
  if (lower === 'down' || lower === 'improving') return 'improving';
  return 'stable';
}

function deriveSeverity(instrument, score) {
  const upper = (instrument || '').toUpperCase();
  if (upper.includes('PHQ')) {
    if (score <= 4) return 'Minimal';
    if (score <= 9) return 'Mild';
    if (score <= 14) return 'Moderate';
    if (score <= 19) return 'Moderately severe';
    return 'Severe';
  }
  if (upper.includes('GAD')) {
    if (score <= 4) return 'Minimal';
    if (score <= 9) return 'Mild';
    if (score <= 14) return 'Moderate';
    return 'Severe';
  }
  return 'Unknown';
}

function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false 
    });
  } catch {
    return iso;
  }
}

// ─── Live AI Chat ───────────────────────────────────────────────────

let currentChatSessionId = null;

/**
 * Send a chat message through the live Claude API.
 * Returns the AI response text.
 */
export async function sendLiveChatMessage(text, patientKey) {
  if (!isApiAvailable() || !isAuthenticated()) return null;

  const patientId = patientIdMap[Object.keys(patientIdMap).find(
    (k) => k.toLowerCase().includes(patientKey)
  )] || Object.values(patientIdMap)[0];

  if (!patientId) return null;

  try {
    const resp = await apiAiChat(text, patientId, currentChatSessionId);
    currentChatSessionId = resp.sessionId || currentChatSessionId;
    return {
      text: resp.response || resp.message || resp.content,
      sessionId: resp.sessionId,
      usage: resp.usage,
    };
  } catch (err) {
    console.error('[bridge] AI chat failed:', err);
    return null;
  }
}

/**
 * Generate a live clinical summary.
 */
export async function generateLiveSummary(patientKey) {
  if (!isApiAvailable() || !isAuthenticated()) return null;

  const patientId = patientIdMap[Object.keys(patientIdMap).find(
    (k) => k.toLowerCase().includes(patientKey || 'maria')
  )] || Object.values(patientIdMap)[0];

  if (!patientId) return null;

  try {
    return await apiAiSummarize(patientId);
  } catch (err) {
    console.error('[bridge] AI summarize failed:', err);
    return null;
  }
}

// ─── Refresh Helpers ────────────────────────────────────────────────

/**
 * Refresh triage queue from API.
 */
export async function refreshTriage() {
  if (!liveMode) return;
  try {
    const resp = await getClinicianTriage();
    mapTriage(resp.data || resp);
  } catch (err) {
    console.warn('[bridge] Triage refresh failed:', err);
  }
}

/**
 * Refresh escalations from API.
 */
export async function refreshEscalations() {
  if (!liveMode) return;
  try {
    const resp = await getEscalations();
    mapEscalations(resp.data || resp);
  } catch (err) {
    console.warn('[bridge] Escalation refresh failed:', err);
  }
}

/**
 * Refresh dashboard from API.
 */
export async function refreshDashboard() {
  if (!liveMode) return;
  try {
    const resp = await getClinicianDashboard();
    mapDashboard(resp);
  } catch (err) {
    console.warn('[bridge] Dashboard refresh failed:', err);
  }
}
