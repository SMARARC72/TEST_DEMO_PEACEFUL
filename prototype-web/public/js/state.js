/**
 * State Module - Baseline states and mutable state initialization
 * Part of Peacefull.ai Demo technical debt cleanup
 */

// ============ BASELINE STATE OBJECTS ============

export const baselineSubmissionState = {
  id: 'sub-000',
  source: 'JOURNAL',
  status: 'SUBMITTED',
  patientReport: {
    tone: 'Supportive reflection generated in demo mode.',
    summary: 'You shared that today felt heavy and you still showed up for your routine.',
    nextStep: 'Consider a short breathing check-in tonight and add one follow-up journal line if helpful.'
  },
  clinicianReport: {
    signalBand: 'GUARDED',
    summary: 'Patient described elevated stress and fatigue with preserved engagement behavior.',
    evidence: 'Journal segment #J-114, sentiment cue set #S-9.',
    unknowns: 'Sleep quality detail missing; voice corroboration pending.'
  }
};

export const baselineTriageQueue = [
  {
    id: 'triage-1',
    patient: 'Maria Rodriguez',
    source: 'JOURNAL',
    signalBand: 'GUARDED',
    summary: 'Described evening stress spike after commute with preserved coping intent.',
    status: 'ACK',
    updatedAt: '2026-02-25 09:14'
  },
  {
    id: 'triage-2',
    patient: 'Emma Wilson',
    source: 'VOICE_MEMO',
    signalBand: 'MODERATE',
    summary: 'Reported overwhelm and interrupted sleep; requested structured follow-up prompt.',
    status: 'IN_REVIEW',
    updatedAt: '2026-02-25 09:32'
  },
  {
    id: 'triage-3',
    patient: 'Alex Kim',
    source: 'JOURNAL',
    signalBand: 'ELEVATED',
    summary: 'School-day routine disruption and rising anxiety language need clinician check.',
    status: 'ESCALATED',
    updatedAt: '2026-02-25 10:01'
  }
];

export const baselineMemoryItems = [
  { id: 'mem-1', patient: 'Maria Rodriguez', category: 'Trigger', statement: 'Crowded commute increases evening anxiety.', confidence: 'Moderate', conflict: false, status: 'PROPOSED', timestamp: '2026-02-24 09:14', evidence: ['Journal #J-114', 'Voice #V-23'], existing: '', uncertainty: 'May vary by sleep quality.', audit: ['Proposed by synthetic memory extraction model.'] },
  { id: 'mem-2', patient: 'Emma Wilson', category: 'Coping', statement: '4-6 breathing reduces panic escalation.', confidence: 'High', conflict: true, status: 'CONFLICT_FLAGGED', timestamp: '2026-02-24 10:02', evidence: ['Check-in #C-87', 'Draft summary #D-44'], existing: 'Prior memory suggested object-grounding was preferred.', uncertainty: 'Both strategies may be useful in different contexts.', audit: ['Conflict detected with existing clinician-approved memory.'] },
  { id: 'mem-3', patient: 'Alex Kim', category: 'Engagement', statement: 'Morning check-ins are often missed on school commute days.', confidence: 'Moderate', conflict: false, status: 'PROPOSED', timestamp: '2026-02-23 18:20', evidence: ['Check-in trend #T-08', 'Portal inbox #I-12'], existing: '', uncertainty: 'Could include intermittent connectivity issues.', audit: ['Proposed by continuity signal monitor.'] }
];

export const baselinePlanItems = [
  { id: 'plan-1', patient: 'Maria Rodriguez', goal: 'Reduce panic escalation events', intervention: 'Breathing cadence 4-6 + evening check-in reminder', owner: 'Clinician', target: '2 weeks', status: 'DRAFT', evidence: ['Memory mem-2', 'Check-in trend #C-87'], uncertainty: 'May require alternate grounding method on high-stress commute days.', audit: ['Plan drafted from memory and summary review context.'] },
  { id: 'plan-2', patient: 'Alex Kim', goal: 'Increase morning engagement consistency', intervention: 'School-day adaptive reminder with fallback text prompt', owner: 'Care Coordinator', target: '10 days', status: 'DRAFT', evidence: ['Memory mem-3', 'Portal inbox #I-12'], uncertainty: 'Missed check-ins may include connectivity constraints.', audit: ['Plan drafted for continuity readiness testing.'] },
  { id: 'plan-3', patient: 'Emma Wilson', goal: 'Stabilize between-session coping adherence', intervention: 'Structured coping preference review in next session', owner: 'Clinician', target: 'Next visit', status: 'HOLD', evidence: ['Conflict memory mem-2', 'Draft summary #D-44'], uncertainty: 'Conflicting coping signals require clinician adjudication.', audit: ['Placed on hold pending memory conflict resolution.'] }
];

export const baselineEnterpriseItems = [
  { id: 'ent-1', tenant: 'Northstar Behavioral Network', sso: 'Enabled', rbac: 'Clinical + Compliance', audit: 'Streaming', status: 'CONDITIONAL', notes: 'Awaiting annual access-review signoff.', evidence: ['Policy package v2.2', 'Audit dry run #A-18'], auditLog: ['Package imported for enterprise review.'] },
  { id: 'ent-2', tenant: 'Bridgeway Care Group', sso: 'Enabled', rbac: 'Clinical', audit: 'Streaming', status: 'REVIEW_REQUIRED', notes: 'SCIM role mapping mismatch detected.', evidence: ['SCIM sync check #S-12'], auditLog: ['Role mapping drift flagged for admin review.'] },
  { id: 'ent-3', tenant: 'Harbor Youth Clinics', sso: 'Pilot', rbac: 'Clinical + Supervisor', audit: 'Batch + Daily Verify', status: 'CONDITIONAL', notes: 'Pending supervisor override policy confirmation.', evidence: ['Override policy packet #P-6'], auditLog: ['Conditional package state assigned.'] }
];

export const baselineSecurityState = {
  mfaMethod: 'totp',
  backupCode: 'DEMO-0000',
  lastStepUp: null,
  contractValidation: { version: '', signature: '', status: 'REVIEW_REQUIRED', evidence: '' },
  merkleVerification: { leaf: '', root: '', path: '', result: 'UNKNOWN' },
  auditLog: [
    { ts: new Date().toISOString(), event: 'Security demo initialized' }
  ],
  posture: { identity: 42, contract: 58, data: 72 }
};

export const baselineDecisionRoomState = {
  readinessVerdict: 'REVIEW_REQUIRED',
  pilotScore: 0,
  packet: null
};

// ============ MBC (Measurement-Based Care) STATE ============

export const baselineMBCScores = [
  { id: 'mbc-1', patient: 'Maria Rodriguez', instrument: 'PHQ-9', score: 14, severity: 'Moderate', date: '2026-02-25', trend: 'worsening', priorScores: [10, 12, 14], clinicianNote: '' },
  { id: 'mbc-2', patient: 'Maria Rodriguez', instrument: 'GAD-7', score: 11, severity: 'Moderate', date: '2026-02-25', trend: 'stable', priorScores: [12, 11, 11], clinicianNote: '' },
  { id: 'mbc-3', patient: 'James Smith', instrument: 'PHQ-9', score: 8, severity: 'Mild', date: '2026-02-24', trend: 'improving', priorScores: [12, 10, 8], clinicianNote: '' },
  { id: 'mbc-4', patient: 'James Smith', instrument: 'GAD-7', score: 13, severity: 'Moderate', date: '2026-02-24', trend: 'worsening', priorScores: [9, 11, 13], clinicianNote: '' },
  { id: 'mbc-5', patient: 'Emma Wilson', instrument: 'PHQ-9', score: 6, severity: 'Mild', date: '2026-02-26', trend: 'improving', priorScores: [11, 8, 6], clinicianNote: '' },
  { id: 'mbc-6', patient: 'Emma Wilson', instrument: 'GAD-7', score: 7, severity: 'Mild', date: '2026-02-26', trend: 'improving', priorScores: [10, 9, 7], clinicianNote: '' }
];

// ============ ADHERENCE STATE ============

export const baselineAdherenceItems = [
  { id: 'adh-1', patient: 'Maria Rodriguez', task: 'Evening breathing exercise (4-6 cadence)', frequency: 'Daily', completed: 4, target: 7, streak: 2, lastLogged: '2026-02-25 21:30', status: 'PARTIAL' },
  { id: 'adh-2', patient: 'Maria Rodriguez', task: 'Mood journal entry', frequency: 'Daily', completed: 5, target: 7, streak: 3, lastLogged: '2026-02-25 20:00', status: 'ON_TRACK' },
  { id: 'adh-3', patient: 'James Smith', task: 'Single-priority task planning', frequency: 'Daily', completed: 3, target: 7, streak: 0, lastLogged: '2026-02-23 08:15', status: 'AT_RISK' },
  { id: 'adh-4', patient: 'James Smith', task: 'Timed reset prompt (5-min break)', frequency: '3x/day', completed: 8, target: 21, streak: 1, lastLogged: '2026-02-25 14:00', status: 'PARTIAL' },
  { id: 'adh-5', patient: 'Emma Wilson', task: 'Evening routine consistency', frequency: 'Daily', completed: 6, target: 7, streak: 5, lastLogged: '2026-02-26 21:45', status: 'ON_TRACK' },
  { id: 'adh-6', patient: 'Emma Wilson', task: 'Brief walk reset', frequency: '4x/week', completed: 3, target: 4, streak: 3, lastLogged: '2026-02-26 12:30', status: 'ON_TRACK' }
];

// ============ GUIDED DEMO STATE ============

export const baselineGuidedDemoState = {
  active: false,
  currentStep: 0,
  steps: [
    { label: 'Landing & Positioning', screen: 'landing', duration: '1 min', description: 'Platform overview and value proposition' },
    { label: 'Patient Experience', screen: 'patient-home', duration: '1.5 min', description: 'Patient check-in, journal, and voice flows' },
    { label: 'Clinician Inbox', screen: 'clinician-inbox', duration: '1 min', description: 'Triage queue and alert management' },
    { label: 'MBC Dashboard', screen: 'mbc-dashboard', duration: '1 min', description: 'PHQ-9/GAD-7 scoring and trend visualization' },
    { label: 'Memory Review', screen: 'memory-review', duration: '1 min', description: 'Clinician-approved memory and conflict resolution' },
    { label: 'Escalation Protocols', screen: 'escalation-protocols', duration: '1 min', description: 'T2/T3 escalation cards with audit trail' },
    { label: 'KPI & ROI', screen: 'kpi-panel', duration: '1 min', description: 'Transparent KPIs with assumption drawers' },
    { label: 'Decision Room', screen: 'decision-room', duration: '0.5 min', description: 'Procurement packet and readiness verdict' }
  ],
  completedSteps: []
};

// ============ KPI PANEL STATE ============

export const baselineKPIData = {
  metrics: [
    { id: 'kpi-1', label: 'Avg Clinician Prep Time Saved', value: '5.2 min/patient', baseline: '12.4 min', assumption: 'Based on 3-clinician pilot over 4 weeks. Prep includes chart review, memory retrieval, and triage scan.', source: 'Internal pilot data (synthetic)', confidence: 'Medium' },
    { id: 'kpi-2', label: 'Patient Engagement Rate', value: '78%', baseline: '42%', assumption: 'Measured as ≥3 check-ins per week. Baseline from comparable digital behavioral health tools.', source: 'Published benchmarks + pilot', confidence: 'Medium' },
    { id: 'kpi-3', label: 'Safety Signal Detection (T2+)', value: '< 4 min median', baseline: '> 24 hrs', assumption: 'Time from patient submission to clinician alert. Baseline from manual review cycles.', source: 'Platform telemetry (synthetic)', confidence: 'High' },
    { id: 'kpi-4', label: 'Memory Conflict Resolution Rate', value: '92%', baseline: 'N/A (manual)', assumption: 'Percentage of auto-flagged conflicts resolved within 48 hours by clinician.', source: 'Pilot memory review logs', confidence: 'Low-Medium' },
    { id: 'kpi-5', label: 'Between-Session Continuity Score', value: '3.8 / 5', baseline: '2.1 / 5', assumption: 'Clinician-rated continuity of care between sessions. 5-point Likert scale.', source: 'Clinician survey (n=3)', confidence: 'Low' },
    { id: 'kpi-6', label: 'Projected Annual Cost Savings', value: '$1.6M', baseline: 'N/A', assumption: 'Extrapolated from prep time savings × $180/hr loaded clinician cost × 50 patients × 48 weeks.', source: 'Financial model', confidence: 'Low (projection)' }
  ]
};

// ============ ESCALATION PROTOCOL STATE ============

export const baselineEscalationItems = [
  { id: 'esc-1', patient: 'Maria Rodriguez', tier: 'T2', trigger: 'Hopelessness language detected in voice note', detectedAt: '2026-02-25 09:15', acknowledgedAt: '', resolvedAt: '', clinicianAction: '', status: 'OPEN', auditTrail: ['2026-02-25 09:15 — System: T2 escalation triggered via NLP safety signal.', '2026-02-25 09:16 — System: Clinician notification dispatched.'] },
  { id: 'esc-2', patient: 'Alex Kim', tier: 'T2', trigger: 'Escalated anxiety language + missed check-ins (3 consecutive days)', detectedAt: '2026-02-25 10:01', acknowledgedAt: '2026-02-25 10:08', resolvedAt: '', clinicianAction: 'Outreach call scheduled', status: 'ACK', auditTrail: ['2026-02-25 10:01 — System: T2 escalation triggered via engagement drop + language analysis.', '2026-02-25 10:08 — Dr. Chen: Acknowledged. Outreach call scheduled for today.'] },
  { id: 'esc-3', patient: 'Maria Rodriguez', tier: 'T3', trigger: 'Explicit self-harm ideation detected', detectedAt: '2026-02-20 14:22', acknowledgedAt: '2026-02-20 14:23', resolvedAt: '2026-02-20 15:10', clinicianAction: 'Safety plan reviewed, emergency contact notified, session moved up', status: 'RESOLVED', auditTrail: ['2026-02-20 14:22 — System: T3 CRITICAL escalation triggered.', '2026-02-20 14:23 — Dr. Chen: Immediate acknowledgment.', '2026-02-20 14:30 — Dr. Chen: Safety plan reviewed with patient via call.', '2026-02-20 14:45 — System: Emergency contact notified per protocol.', '2026-02-20 15:10 — Dr. Chen: Resolved. Session moved to tomorrow AM.'] }
];

// ============ MUTABLE STATE (initialized from baselines) ============

export const state = {
  latestSubmission: JSON.parse(JSON.stringify(baselineSubmissionState)),
  triageQueue: JSON.parse(JSON.stringify(baselineTriageQueue)),
  selectedTriageId: 'triage-1',
  memoryItems: JSON.parse(JSON.stringify(baselineMemoryItems)),
  selectedMemoryId: 'mem-1',
  planItems: JSON.parse(JSON.stringify(baselinePlanItems)),
  selectedPlanId: 'plan-1',
  enterpriseItems: JSON.parse(JSON.stringify(baselineEnterpriseItems)),
  selectedEnterpriseId: 'ent-1',
  securityState: JSON.parse(JSON.stringify(baselineSecurityState)),
  decisionRoomState: JSON.parse(JSON.stringify(baselineDecisionRoomState)),
  mbcScores: JSON.parse(JSON.stringify(baselineMBCScores)),
  selectedMBCId: 'mbc-1',
  adherenceItems: JSON.parse(JSON.stringify(baselineAdherenceItems)),
  selectedAdherenceId: 'adh-1',
  guidedDemoState: JSON.parse(JSON.stringify(baselineGuidedDemoState)),
  kpiData: JSON.parse(JSON.stringify(baselineKPIData)),
  escalationItems: JSON.parse(JSON.stringify(baselineEscalationItems)),
  selectedEscalationId: 'esc-1',
  selectedPatientProfile: 'maria',
  patientSessionProfile: 'maria',
  roiMode: 'pilot',
  recording: false,
  recordInterval: null,
  recordSeconds: 0
};

// ============ STATE RESET FUNCTIONS ============

export function resetSubmissionState() {
  state.latestSubmission = JSON.parse(JSON.stringify(baselineSubmissionState));
}

export function resetTriageQueue() {
  state.triageQueue = JSON.parse(JSON.stringify(baselineTriageQueue));
  state.selectedTriageId = state.triageQueue[0].id;
}

export function resetMemoryItems() {
  state.memoryItems = JSON.parse(JSON.stringify(baselineMemoryItems));
  state.selectedMemoryId = state.memoryItems[0].id;
}

export function resetPlanItems() {
  state.planItems = JSON.parse(JSON.stringify(baselinePlanItems));
  state.selectedPlanId = state.planItems[0].id;
}

export function resetEnterpriseItems() {
  state.enterpriseItems = JSON.parse(JSON.stringify(baselineEnterpriseItems));
  state.selectedEnterpriseId = state.enterpriseItems[0].id;
}

export function resetSecurityState() {
  state.securityState = JSON.parse(JSON.stringify(baselineSecurityState));
}

export function resetDecisionRoomState() {
  state.decisionRoomState = JSON.parse(JSON.stringify(baselineDecisionRoomState));
}

export function resetMBCScores() {
  state.mbcScores = JSON.parse(JSON.stringify(baselineMBCScores));
  state.selectedMBCId = state.mbcScores[0].id;
}

export function resetAdherenceItems() {
  state.adherenceItems = JSON.parse(JSON.stringify(baselineAdherenceItems));
  state.selectedAdherenceId = state.adherenceItems[0].id;
}

export function resetGuidedDemoState() {
  state.guidedDemoState = JSON.parse(JSON.stringify(baselineGuidedDemoState));
}

export function resetKPIData() {
  state.kpiData = JSON.parse(JSON.stringify(baselineKPIData));
}

export function resetEscalationItems() {
  state.escalationItems = JSON.parse(JSON.stringify(baselineEscalationItems));
  state.selectedEscalationId = state.escalationItems[0].id;
}
