// ─── Peacefull.ai API Client ────────────────────────────────────────
// Lightweight fetch wrapper with JWT auth, token refresh, and all
// API endpoint methods. Works alongside the static baseline data —
// when the API is unavailable, the frontend falls back gracefully.

// ─── Configuration ──────────────────────────────────────────────────

/** API base URL — configurable via query param or localStorage */
const DEFAULT_API_URL = 'http://localhost:3001/api/v1';

function getApiBaseUrl() {
  // Check query param first: ?api=https://my-api.render.com/api/v1
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api');
  if (fromQuery) {
    localStorage.setItem('peacefull_api_url', fromQuery);
    return fromQuery;
  }
  // Then localStorage (persists across reloads)
  const stored = localStorage.getItem('peacefull_api_url');
  if (stored) return stored;
  return DEFAULT_API_URL;
}

export const API_BASE = getApiBaseUrl();

// ─── Token Management ───────────────────────────────────────────────

let accessToken = localStorage.getItem('peacefull_access_token') || null;
let refreshToken = localStorage.getItem('peacefull_refresh_token') || null;
let currentUser = null;
let tokenRefreshPromise = null;

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem('peacefull_access_token', access);
  else localStorage.removeItem('peacefull_access_token');
  if (refresh) localStorage.setItem('peacefull_refresh_token', refresh);
  else localStorage.removeItem('peacefull_refresh_token');
}

export function getAccessToken() {
  return accessToken;
}

export function clearAuth() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem('peacefull_access_token');
  localStorage.removeItem('peacefull_refresh_token');
  localStorage.removeItem('peacefull_user');
}

export function isAuthenticated() {
  return !!accessToken;
}

export function getCurrentUser() {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem('peacefull_user');
  if (stored) {
    try { currentUser = JSON.parse(stored); } catch { /* ignore */ }
  }
  return currentUser;
}

function setCurrentUser(user) {
  currentUser = user;
  localStorage.setItem('peacefull_user', JSON.stringify(user));
}

// ─── API Connectivity ───────────────────────────────────────────────

let apiAvailable = null; // null = not checked, true/false

export async function checkApiAvailability() {
  try {
    const resp = await fetch(`${API_BASE.replace('/api/v1', '')}/health`, {
      signal: AbortSignal.timeout(3000)
    });
    apiAvailable = resp.ok;
  } catch {
    apiAvailable = false;
  }
  return apiAvailable;
}

export function isApiAvailable() {
  return apiAvailable === true;
}

// ─── Fetch Wrapper ──────────────────────────────────────────────────

async function refreshAccessToken() {
  if (!refreshToken) throw new Error('No refresh token');
  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!resp.ok) {
    clearAuth();
    throw new Error('Token refresh failed');
  }
  const data = await resp.json();
  setTokens(data.accessToken, data.refreshToken || refreshToken);
  return data.accessToken;
}

/**
 * Authenticated fetch with automatic token refresh on 401.
 * @param {string} path - API path (e.g. '/patients')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let resp = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (resp.status === 401 && refreshToken) {
    try {
      // Deduplicate concurrent refresh attempts
      if (!tokenRefreshPromise) {
        tokenRefreshPromise = refreshAccessToken();
      }
      await tokenRefreshPromise;
      tokenRefreshPromise = null;

      headers['Authorization'] = `Bearer ${accessToken}`;
      resp = await fetch(url, { ...options, headers });
    } catch {
      tokenRefreshPromise = null;
      throw new Error('Authentication expired — please log in again');
    }
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const msg = body.error?.message || body.message || resp.statusText;
    throw new Error(`API ${resp.status}: ${msg}`);
  }

  return resp.json();
}

// ─── Auth Endpoints ─────────────────────────────────────────────────

/**
 * Login with email/password.
 * @returns {{ accessToken, refreshToken, user, mfaRequired, mfaChallengeId }}
 */
export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.mfaRequired) {
    // MFA flow — store user ID for verification step, don't set tokens yet
    return { mfaRequired: true, userId: data.userId, email };
  }

  setTokens(data.accessToken, data.refreshToken);
  if (data.user) setCurrentUser(data.user);
  return data;
}

/**
 * Verify MFA code.
 */
export async function verifyMfa(userId, code) {
  const data = await apiFetch('/auth/mfa-verify', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  });
  setTokens(data.accessToken, data.refreshToken);
  if (data.user) setCurrentUser(data.user);
  return data;
}

/**
 * Get current user profile.
 */
export async function getMe() {
  const data = await apiFetch('/auth/me');
  setCurrentUser(data.user || data);
  return data.user || data;
}

/**
 * Logout — clear tokens.
 */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch { /* ignore logout failures */ }
  clearAuth();
}

// ─── Patient Endpoints ──────────────────────────────────────────────

export async function getPatients() {
  return apiFetch('/patients');
}

export async function getPatient(id) {
  return apiFetch(`/patients/${id}`);
}

export async function getPatientTriage(patientId) {
  return apiFetch(`/patients/${patientId}/triage`);
}

export async function getPatientMBC(patientId) {
  return apiFetch(`/patients/${patientId}/mbc`);
}

export async function getPatientSafetyPlan(patientId) {
  return apiFetch(`/patients/${patientId}/safety-plan`);
}

export async function getPatientProgress(patientId) {
  return apiFetch(`/patients/${patientId}/progress`);
}

export async function getPatientSDOH(patientId) {
  return apiFetch(`/patients/${patientId}/sdoh`);
}

// ─── Clinician Endpoints ────────────────────────────────────────────

export async function getClinicianDashboard() {
  return apiFetch('/clinician/dashboard');
}

export async function getClinicianCaseload() {
  return apiFetch('/clinician/caseload');
}

export async function getClinicianTriage() {
  return apiFetch('/clinician/triage');
}

export async function getAIDrafts() {
  return apiFetch('/clinician/ai-drafts');
}

export async function getMemoryProposals() {
  return apiFetch('/clinician/memory-proposals');
}

export async function approveMemory(id) {
  return apiFetch(`/clinician/memory-proposals/${id}/approve`, { method: 'POST' });
}

export async function rejectMemory(id) {
  return apiFetch(`/clinician/memory-proposals/${id}/reject`, { method: 'POST' });
}

export async function getSessionNotes(patientId) {
  return apiFetch(`/clinician/session-notes/${patientId}`);
}

export async function saveSessionNotes(patientId, notes) {
  return apiFetch(`/clinician/session-notes/${patientId}`, {
    method: 'POST',
    body: JSON.stringify(notes),
  });
}

export async function getEscalations() {
  return apiFetch('/clinician/escalations');
}

export async function acknowledgeEscalation(id) {
  return apiFetch(`/clinician/escalations/${id}/acknowledge`, { method: 'POST' });
}

// ─── AI Endpoints ───────────────────────────────────────────────────

/**
 * Send a chat message to Claude-powered AI companion.
 * @param {string} message - User message
 * @param {string} patientId - Patient context ID
 * @param {string} [sessionId] - Existing session ID for continuity
 */
export async function aiChat(message, patientId, sessionId) {
  return apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, patientId, sessionId }),
  });
}

/**
 * Generate a clinical summary for a patient.
 */
export async function aiSummarize(patientId) {
  return apiFetch('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

/**
 * Assess risk for a patient submission.
 */
export async function aiRiskAssess(patientId, submissionData) {
  return apiFetch('/ai/risk-assess', {
    method: 'POST',
    body: JSON.stringify({ patientId, ...submissionData }),
  });
}

/**
 * Generate session prep data.
 */
export async function aiSessionPrep(patientId) {
  return apiFetch('/ai/session-prep', {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

// ─── Analytics Endpoints ────────────────────────────────────────────

export async function getAnalyticsOverview() {
  return apiFetch('/analytics/overview');
}

export async function getAnalyticsTrends(range) {
  return apiFetch(`/analytics/trends${range ? `?range=${range}` : ''}`);
}

export async function getAnalyticsMBC() {
  return apiFetch('/analytics/mbc');
}

export async function getAnalyticsAdherence() {
  return apiFetch('/analytics/adherence');
}

// ─── Compliance Endpoints ───────────────────────────────────────────

export async function getAuditLog(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/compliance/audit-log${qs ? `?${qs}` : ''}`);
}
