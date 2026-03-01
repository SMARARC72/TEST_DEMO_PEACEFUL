/**
 * Main Entry Point - Exposes functions globally for onclick handlers
 */

// Import all modules
import { state } from './state.js';
import { showScreen, showToast, initScreenRouting } from './helpers.js';
import {
  renderSubmissionSurfaces,
  renderTriageQueue,
  renderMemoryReview,
  renderTreatmentPlan,
  renderClinicianPatientProfile,
  renderMBCDashboard,
  renderAdherenceTracker,
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
  renderClinicianAnalytics,
  renderPopulationHealth,
  renderSessionNotes,
  renderRegulatoryHub,
  renderSDOHAssessment,
  renderCaregiverView
} from './render.js';
import * as actions from './actions.js';
import { initEventDelegation } from './events.js';

// ─── API Integration ──────────────────────────────────────────────
import {
  checkApiAvailability, isApiAvailable, isAuthenticated,
  login, verifyMfa, logout, clearAuth, getAccessToken, register,
  API_BASE,
} from './api.js';
import {
  initializeLiveData, isLiveMode, sendLiveChatMessage,
  generateLiveSummary, refreshTriage, refreshEscalations,
} from './api-bridge.js';

// Expose to global scope for inline onclick handlers
window.showScreen = showScreen;
window.showToast = showToast;

// Consent/journal
window.checkConsents = actions.checkConsents;
window.checkJournal = actions.checkJournal;
window.saveJournal = actions.saveJournal;

// Sliders/check-in
window.updateSlider = actions.updateSlider;
window.submitCheckin = actions.submitCheckin;

// Voice recording
window.toggleRecording = actions.toggleRecording;
window.uploadVoice = actions.uploadVoice;

// MFA
window.checkMFA = actions.checkMFA;

// Demo controls
window.updateSystemStatus = actions.updateSystemStatus;
window.updateSafetyTier = actions.updateSafetyTier;
window.updateInboxStatus = actions.updateInboxStatus;
window.updateSummaryStatus = actions.updateSummaryStatus;
window.updateRecStatus = actions.updateRecStatus;
window.updateExportStatus = actions.updateExportStatus;
window.updateVoiceStatus = actions.updateVoiceStatus;

// Triage queue
window.selectTriageItem = actions.selectTriageItem;
window.selectPatientProfile = actions.selectPatientProfile;
window.updateTriageStatus = actions.updateTriageStatus;
window.resetTriageQueue = actions.resetTriageQueueAction;

// Memory review
window.selectMemory = actions.selectMemory;
window.updateMemoryStatus = actions.updateMemoryStatus;
window.resetMemoryReview = actions.resetMemoryReviewAction;

// Treatment plan
window.selectPlan = actions.selectPlan;
window.updatePlanStatus = actions.updatePlanStatus;
window.resetTreatmentPlan = actions.resetTreatmentPlanAction;

// Inbox/draft actions
window.acknowledgeAlert = actions.acknowledgeAlert;
window.resolveAlert = actions.resolveAlert;
window.escalateAlert = actions.escalateAlert;
window.markReviewed = actions.markReviewed;
window.useWithCaution = actions.useWithCaution;
window.retainDraft = actions.retainDraft;
window.rejectSummary = actions.rejectSummary;
window.escalateSummary = actions.escalateSummary;

// Export
window.showExportConfirmation = actions.showExportConfirmation;
window.hideExportConfirmation = actions.hideExportConfirmation;
window.generateExport = actions.generateExport;

// MBC Dashboard (F1)
window.selectMBC = actions.selectMBC;
window.addMBCNote = actions.addMBCNote;
window.resetMBCDashboard = actions.resetMBCDashboardAction;

// Adherence Tracker (F2)
window.selectAdherence = actions.selectAdherence;
window.logAdherenceCompletion = actions.logAdherenceCompletion;
window.resetAdherence = actions.resetAdherenceAction;

// Escalation Protocols (F5)
window.selectEscalation = actions.selectEscalation;
window.acknowledgeEscalation = actions.acknowledgeEscalation;
window.resolveEscalation = actions.resolveEscalation;
window.resetEscalation = actions.resetEscalationAction;

// Session Notes
window.selectSessionNote = actions.selectSessionNote;
window.signSessionNote = actions.signSessionNote;

// Breathing Exercise
window.startBreathing = actions.startBreathing;
window.stopBreathing = actions.stopBreathing;

// ─── Live API Actions ─────────────────────────────────────────────

// MFA challenge state (stored between login and MFA verify screens)
let mfaChallengeState = null;

/**
 * Handle sign-out — clears auth state and navigates to landing.
 */
window.handleSignOut = async function handleSignOut() {
  try {
    if (isApiAvailable() && isAuthenticated()) {
      await logout();
    } else {
      clearAuth();
    }
  } catch {
    clearAuth();
  }
  showScreen('landing');
  showToast('Signed out successfully');
};

/**
 * Handle self-service registration.
 */
window.handleRegister = async function handleRegister() {
  const firstName = document.getElementById('register-first-name')?.value?.trim();
  const lastName = document.getElementById('register-last-name')?.value?.trim();
  const email = document.getElementById('register-email')?.value?.trim();
  const password = document.getElementById('register-password')?.value;
  const confirmPassword = document.getElementById('register-confirm-password')?.value;
  const role = document.getElementById('register-role')?.value || 'PATIENT';
  const errorEl = document.getElementById('register-error');
  const btn = document.getElementById('register-btn');

  // Validation
  if (!firstName || !lastName || !email || !password) {
    if (errorEl) { errorEl.textContent = 'All fields are required.'; errorEl.classList.remove('hidden'); }
    return;
  }
  if (password !== confirmPassword) {
    if (errorEl) { errorEl.textContent = 'Passwords do not match.'; errorEl.classList.remove('hidden'); }
    return;
  }
  if (password.length < 12) {
    if (errorEl) { errorEl.textContent = 'Password must be at least 12 characters.'; errorEl.classList.remove('hidden'); }
    return;
  }
  const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;
  if (!complexityRegex.test(password)) {
    if (errorEl) {
      errorEl.textContent = 'Password must contain uppercase, lowercase, digit, and special character.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');
  if (btn) { btn.textContent = 'Creating account...'; btn.disabled = true; }

  try {
    if (!isApiAvailable()) {
      // Demo fallback
      showToast('Registration requires a live API connection. Running in demo mode.');
      showScreen('clinician-login');
      return;
    }

    const result = await register({ email, password, firstName, lastName, role });

    if (result.status === 'PENDING_APPROVAL') {
      showToast('Registration submitted! Awaiting admin approval.');
      showScreen('clinician-login');
      return;
    }

    // Auto-logged-in (patient)
    if (result.accessToken) {
      showToast(`Welcome, ${firstName}! Account created successfully.`);
      if (role === 'PATIENT') {
        showScreen('patient-welcome');
      } else {
        await loadLiveDataAndNavigate();
      }
    }
  } catch (err) {
    console.error('[register] Error:', err);
    if (errorEl) {
      errorEl.textContent = err.message || 'Registration failed. Please try again.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
  }
};

/**
 * Handle clinician login — calls live API if available, falls back to offline flow.
 */
window.handleLogin = async function handleLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    if (errorEl) { errorEl.textContent = 'Please enter email and password.'; errorEl.classList.remove('hidden'); }
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }

  try {
    if (isApiAvailable()) {
      // ── Live API login ──
      const result = await login(email, password);

      if (result.mfaRequired) {
        mfaChallengeState = result;
        if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
        showScreen('clinician-mfa');
        // Show MFA hint in dev mode
        const hint = document.getElementById('mfa-hint');
        if (hint) { hint.textContent = 'Dev mode: check API console for MFA code'; hint.classList.remove('hidden'); }
        return;
      }

      // No MFA → load live data and navigate
      await loadLiveDataAndNavigate();
    } else {
      // ── Offline / demo fallback ──
      showScreen('clinician-mfa');
    }
  } catch (err) {
    console.error('[login] Error:', err);
    if (errorEl) {
      errorEl.textContent = err.message || 'Login failed. Check credentials.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
  }
};

/**
 * Handle MFA verification — calls live API if available.
 */
window.handleMfaVerify = async function handleMfaVerify() {
  const inputs = document.querySelectorAll('#clinician-mfa input');
  const code = Array.from(inputs).map(i => i.value).join('');
  const errorEl = document.getElementById('mfa-error');
  const btn = document.getElementById('mfa-btn');

  if (code.length !== 6) return;

  if (errorEl) errorEl.classList.add('hidden');
  if (btn) { btn.textContent = 'Verifying...'; btn.disabled = true; }

  try {
    if (isApiAvailable() && mfaChallengeState) {
      await verifyMfa(mfaChallengeState.userId, code);
      mfaChallengeState = null;
      await loadLiveDataAndNavigate();
    } else {
      // Demo fallback — any 6 digits works
      showScreen('clinician-caseload');
      showToast('Clinician authenticated (offline mode)');
    }
  } catch (err) {
    console.error('[mfa] Error:', err);
    if (errorEl) {
      errorEl.textContent = err.message || 'Invalid code. Try again.';
      errorEl.classList.remove('hidden');
    }
    // Clear inputs
    inputs.forEach(i => { i.value = ''; });
    if (inputs[0]) inputs[0].focus();
  } finally {
    if (btn) { btn.textContent = 'Verify'; btn.disabled = false; }
  }
};

/**
 * After successful auth, load live data from API and navigate to caseload.
 */
async function loadLiveDataAndNavigate() {
  showToast('Authenticated — loading live data...');
  
  const loaded = await initializeLiveData();
  
  if (loaded) {
    // Re-render screens with live data
    renderTriageQueue();
    renderMBCDashboard();
    renderEscalationProtocols();
    renderAdherenceTracker();
    showToast('Live data loaded from Neon database');
    
    // Update live chat panel status
    updateLiveChatStatus(true);
  }

  showScreen('clinician-caseload');
}

/**
 * Update live chat panel indicators.
 */
function updateLiveChatStatus(online) {
  const statusEl = document.getElementById('live-chat-status');
  if (statusEl) {
    if (online) {
      statusEl.textContent = 'Live — Claude Sonnet 4';
      statusEl.className = 'px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold';
    } else {
      statusEl.textContent = 'Offline';
      statusEl.className = 'px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold';
    }
  }
  const msgArea = document.getElementById('live-chat-messages');
  if (msgArea && online) {
    msgArea.innerHTML = `<div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
      <strong>Connected</strong> — You're chatting with Claude Sonnet 4 via the live API.
      Patient context is loaded from the Neon database.
    </div>`;
  }
}

/**
 * Send a live chat message to Claude AI.
 */
window.sendLiveMessage = async function sendLiveMessage() {
  const input = document.getElementById('live-chat-input');
  const msgArea = document.getElementById('live-chat-messages');
  if (!input || !msgArea) return;

  const text = input.value.trim();
  if (!text) return;

  if (!isApiAvailable() || !isAuthenticated()) {
    showToast('Sign in via Clinician Portal to use live chat');
    return;
  }

  // Add user message
  const userBubble = document.createElement('div');
  userBubble.className = 'p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-sm ml-8';
  userBubble.innerHTML = `<strong class="text-cyan-800">You:</strong> ${escapeHtml(text)}`;
  msgArea.appendChild(userBubble);

  input.value = '';
  input.disabled = true;

  // Add typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm mr-8 animate-pulse';
  typingEl.innerHTML = '<strong class="text-emerald-800">Claude:</strong> Thinking...';
  msgArea.appendChild(typingEl);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    const result = await sendLiveChatMessage(text, state.selectedPatientProfile || 'maria');
    
    if (result && result.text) {
      typingEl.className = 'p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm mr-8';
      typingEl.innerHTML = `<strong class="text-emerald-800">Claude:</strong> ${escapeHtml(result.text)}`;
      if (result.usage) {
        const costEl = document.createElement('p');
        costEl.className = 'text-[10px] text-slate-400 mt-1';
        costEl.textContent = `${result.usage.input_tokens || '?'} in / ${result.usage.output_tokens || '?'} out tokens`;
        typingEl.appendChild(costEl);
      }
    } else {
      typingEl.className = 'p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm mr-8';
      typingEl.innerHTML = '<strong class="text-amber-800">System:</strong> Unable to get AI response. Check API connection.';
    }
  } catch (err) {
    typingEl.className = 'p-3 rounded-lg bg-red-50 border border-red-200 text-sm mr-8';
    typingEl.innerHTML = `<strong class="text-red-800">Error:</strong> ${escapeHtml(err.message)}`;
  }

  input.disabled = false;
  input.focus();
  msgArea.scrollTop = msgArea.scrollHeight;
};

/**
 * Clear the live chat panel.
 */
window.clearLiveChat = function clearLiveChat() {
  const msgArea = document.getElementById('live-chat-messages');
  if (!msgArea) return;
  if (isLiveMode()) {
    updateLiveChatStatus(true);
  } else {
    msgArea.innerHTML = `<div class="text-center text-sm text-slate-400 py-8">
      <p>Sign in via Clinician Portal to enable live Claude AI chat.</p>
      <p class="text-xs mt-1">Messages are powered by Claude Sonnet 4 via the live API.</p>
    </div>`;
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize event delegation (Step 2 tech debt)
  initEventDelegation();
  
  // ── Check API availability (non-blocking) ──
  checkApiAvailability().then(available => {
    console.log(`[init] API ${available ? 'ONLINE' : 'offline'} at ${API_BASE}`);
    
    // Show live badges if API is available
    const landingBadge = document.getElementById('landing-live-badge');
    const loginBadge = document.getElementById('login-live-badge');
    if (available) {
      if (landingBadge) landingBadge.classList.remove('hidden');
      if (loginBadge) loginBadge.classList.remove('hidden');
    }

    // If already authenticated (token in localStorage), auto-load live data
    if (available && isAuthenticated()) {
      initializeLiveData().then(loaded => {
        if (loaded) {
          renderTriageQueue();
          renderMBCDashboard();
          renderEscalationProtocols();
          renderAdherenceTracker();
          updateLiveChatStatus(true);
          console.log('[init] Live data loaded from previous session');
        }
      });
    }
  });

  // Initial renders
  renderSubmissionSurfaces();
  renderTriageQueue();
  renderMemoryReview();
  renderTreatmentPlan();
  renderClinicianPatientProfile();
  renderMBCDashboard();
  renderAdherenceTracker();
  renderEscalationProtocols();

  // Phase 2+ renders
  renderPatientHome();
  renderPatientProfile();
  renderSessionPrep();
  renderProgress();
  renderResources();
  renderHistory();
  renderSafetyPlan();
  renderOnboarding();
  renderPatientMemoryView();
  renderChat();

  // Phase 6+ renders
  renderClinicianAnalytics();
  renderPopulationHealth();
  renderSessionNotes();
  renderRegulatoryHub();
  renderSDOHAssessment();
  renderCaregiverView();

  const patientSel = document.getElementById('patient-session-profile');
  if (patientSel) patientSel.value = state.patientSessionProfile;

  // Initialize hash-aware routing and active quick-nav state
  initScreenRouting();
  
  // MFA input navigation
  const mfaInputs = document.querySelectorAll('#clinician-mfa input');
  mfaInputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      if (input.value.length === 1 && i < mfaInputs.length - 1) {
        mfaInputs[i + 1].focus();
      }
    });
  });
  
  console.log('Peacefull.ai Clinical Platform initialized');
});
