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
