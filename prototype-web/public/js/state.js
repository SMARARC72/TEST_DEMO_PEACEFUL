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

// ============ PATIENT PROFILE BASELINES (F-P1) ============
export const baselinePatientProfiles = {
  maria: { name: 'Maria Rodriguez', age: 34, pronouns: 'she/her', language: 'English', emergencyContact: { name: 'Carmen Rodriguez (Mother)', phone: '555-0142' }, diagnosis: { primary: 'Generalized Anxiety Disorder', code: 'F41.1' }, treatmentStart: '2025-11-01', medications: ['Sertraline 50mg daily'], allergies: 'None reported', careTeam: [{ name: 'Dr. Sarah Chen', role: 'Therapist', credentials: 'PhD, Licensed Clinical Psychologist' }, { name: 'Dr. Michael Torres', role: 'Psychiatrist', credentials: 'MD, Board Certified' }], preferences: { contact: 'In-app messaging', reminderTime: '8:00 PM', sessionAlert: '1 hour before' } },
  james: { name: 'James Smith', age: 28, pronouns: 'he/him', language: 'English', emergencyContact: { name: 'Robert Smith (Father)', phone: '555-0198' }, diagnosis: { primary: 'ADHD + Generalized Anxiety', code: 'F90.0, F41.1' }, treatmentStart: '2025-09-15', medications: ['Methylphenidate 20mg daily', 'Buspirone 10mg daily'], allergies: 'Penicillin', careTeam: [{ name: 'Dr. Sarah Chen', role: 'Therapist', credentials: 'PhD, Licensed Clinical Psychologist' }, { name: 'Dr. Lisa Park', role: 'Psychiatrist', credentials: 'MD, Board Certified' }], preferences: { contact: 'SMS + In-app', reminderTime: '9:00 AM', sessionAlert: '30 minutes before' } },
  emma: { name: 'Emma Wilson', age: 41, pronouns: 'she/her', language: 'English', emergencyContact: { name: 'David Wilson (Spouse)', phone: '555-0234' }, diagnosis: { primary: 'Major Depressive Disorder (recurrent)', code: 'F33.1' }, treatmentStart: '2025-10-01', medications: ['Escitalopram 10mg daily'], allergies: 'None reported', careTeam: [{ name: 'Dr. Sarah Chen', role: 'Therapist', credentials: 'PhD, Licensed Clinical Psychologist' }, { name: 'Dr. Michael Torres', role: 'Psychiatrist', credentials: 'MD, Board Certified' }], preferences: { contact: 'In-app messaging', reminderTime: '7:30 PM', sessionAlert: '1 hour before' } }
};

// ============ SESSION PREP BASELINES (F-P2) ============
export const baselineSessionPrep = {
  maria: { date: '2026-02-28', time: '14:00', duration: 50, format: 'Telehealth', therapist: { name: 'Dr. Sarah Chen', credentials: 'PhD, Licensed Clinical Psychologist', specialty: 'Anxiety, stress management, CBT' }, topics: [{ id: 't1', label: 'Stress management progress', checked: true }, { id: 't2', label: 'Sleep changes this week', checked: true }, { id: 't3', label: 'Medication side effects', checked: false }, { id: 't4', label: 'Relationship concerns', checked: false }, { id: 't5', label: 'Work/school impact', checked: false }, { id: 't6', label: 'Safety plan review', checked: false }], customTopics: [], goals: ['Discuss new coping strategy for evening anxiety'], previousSummary: 'Feb 21: Reviewed sleep hygiene checklist. Introduced 4-6 breathing cadence. Homework: practice 3x before next session.' },
  james: { date: '2026-03-01', time: '10:00', duration: 50, format: 'In-person', therapist: { name: 'Dr. Sarah Chen', credentials: 'PhD, Licensed Clinical Psychologist', specialty: 'ADHD, anxiety, behavioral activation' }, topics: [{ id: 't1', label: 'Task initiation strategies', checked: true }, { id: 't2', label: 'Medication adjustment', checked: true }, { id: 't3', label: 'Focus fragmentation patterns', checked: false }, { id: 't4', label: 'Sleep schedule consistency', checked: false }, { id: 't5', label: 'Work deadline coping', checked: false }, { id: 't6', label: 'Safety plan review', checked: false }], customTopics: [], goals: ['Review micro-task breakdown effectiveness'], previousSummary: 'Feb 22: Reviewed timed reset prompts. Discussed single-priority planning. Homework: use 5-min start technique daily.' },
  emma: { date: '2026-02-28', time: '16:00', duration: 50, format: 'Telehealth', therapist: { name: 'Dr. Sarah Chen', credentials: 'PhD, Licensed Clinical Psychologist', specialty: 'Depression, mood stabilization, relapse prevention' }, topics: [{ id: 't1', label: 'Mood tracking patterns', checked: true }, { id: 't2', label: 'Evening routine consistency', checked: false }, { id: 't3', label: 'Medication side effects', checked: false }, { id: 't4', label: 'Social engagement goals', checked: true }, { id: 't5', label: 'Return-to-work planning', checked: false }, { id: 't6', label: 'Safety plan review', checked: false }], customTopics: [], goals: ['Assess readiness for reduced session frequency'], previousSummary: 'Feb 23: Reviewed mood trends. Evening routine adherence at 85%. Discussed relapse warning signs. Homework: journal daily.' }
};

// ============ PROGRESS & GAMIFICATION (F-P3) ============
export const baselineProgressData = {
  maria: { streak: 4, streakTarget: 7, xp: 240, level: 3, levelName: 'Mindful Explorer', xpToNext: 400, badges: [{ id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-10' }, { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: true, earnedDate: '2026-02-13' }, { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false }, { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-18' }, { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: true, earnedDate: '2026-02-20' }, { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: false }, { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false }, { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false }], weeklyMood: [3, 3, 4, 3, 4, null, null], milestones: [{ date: '2026-02-10', label: 'Started Peacefull.ai', achieved: true }, { date: '2026-02-14', label: 'Completed first week', achieved: true }, { date: '2026-02-18', label: '5 journal entries', achieved: true }, { date: '2026-02-22', label: '3-day streak achieved', achieved: true }, { date: null, label: '7-day streak', achieved: false }] },
  james: { streak: 2, streakTarget: 7, xp: 120, level: 2, levelName: 'Getting Started', xpToNext: 200, badges: [{ id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-12' }, { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: false }, { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false }, { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-20' }, { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: false }, { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: false }, { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false }, { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false }], weeklyMood: [2, 3, 2, 3, null, null, null], milestones: [{ date: '2026-02-12', label: 'Started Peacefull.ai', achieved: true }, { date: '2026-02-19', label: 'Completed first week', achieved: true }, { date: null, label: '5 journal entries', achieved: false }] },
  emma: { streak: 6, streakTarget: 7, xp: 350, level: 3, levelName: 'Mindful Explorer', xpToNext: 400, badges: [{ id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-08' }, { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: true, earnedDate: '2026-02-11' }, { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false }, { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-15' }, { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: true, earnedDate: '2026-02-17' }, { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: true, earnedDate: '2026-02-20' }, { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false }, { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false }], weeklyMood: [3, 4, 4, 3, 4, 4, null], milestones: [{ date: '2026-02-08', label: 'Started Peacefull.ai', achieved: true }, { date: '2026-02-15', label: 'Completed first week', achieved: true }, { date: '2026-02-20', label: '5 journal entries', achieved: true }, { date: '2026-02-24', label: '3-day streak achieved', achieved: true }, { date: null, label: '7-day streak', achieved: false }] }
};

// ============ RESOURCES (F-P4) ============
export const baselineResources = [
  { id: 'res-1', title: 'Grounding (5-4-3-2-1)', category: 'Coping', icon: '🧘', description: 'A sensory awareness technique to reduce acute anxiety. Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste.', source: 'Linehan, 2014', expandedContent: 'This technique redirects attention from anxious thoughts to present sensory experience, activating the parasympathetic nervous system and reducing acute distress.' },
  { id: 'res-2', title: 'Sleep Hygiene Checklist', category: 'Sleep', icon: '😴', description: 'Evidence-based sleep practices: consistent schedule, reduced screen time, optimal temperature, limited caffeine after noon.', source: 'Irish et al., 2015', expandedContent: 'A consistent sleep schedule and good sleep hygiene practices are among the most effective non-pharmacological interventions for improving sleep quality and duration.' },
  { id: 'res-3', title: '4-6 Breathing Technique', category: 'Coping', icon: '🌬️', description: 'Inhale 4 seconds, exhale 6 seconds. Activates parasympathetic nervous system to reduce stress response.', source: 'Relaxation response literature', expandedContent: 'Extended exhalation stimulates the vagus nerve, shifting autonomic balance toward parasympathetic dominance and reducing heart rate, blood pressure, and cortisol.' },
  { id: 'res-4', title: 'Behavioral Activation', category: 'Coping', icon: '🎯', description: 'Schedule small, achievable activities that align with your values to counteract withdrawal and low mood.', source: 'Martell et al., 2010', expandedContent: 'Behavioral activation targets the avoidance and withdrawal patterns common in depression, gradually re-engaging patients with rewarding activities.' },
  { id: 'res-5', title: 'Gratitude Journaling', category: 'Mindfulness', icon: '🙏', description: 'Write three things you are grateful for each day. Research shows this improves mood and life satisfaction.', source: 'Emmons & McCullough, 2003', expandedContent: 'Daily gratitude practice has been shown to increase positive affect, life satisfaction, and prosocial behavior while decreasing depressive symptoms.' },
  { id: 'res-6', title: 'Body Scan Meditation', category: 'Mindfulness', icon: '🧠', description: 'Systematically focus attention on each body region, noticing sensations without judgment.', source: 'Kabat-Zinn, 1990', expandedContent: 'Body scan meditation develops interoceptive awareness and has been shown to reduce stress, anxiety, and chronic pain through mindfulness-based stress reduction.' },
  { id: 'res-7', title: 'Thought Record (CBT)', category: 'Anxiety', icon: '📋', description: 'Identify automatic thoughts, evaluate evidence for and against, and generate a balanced alternative thought.', source: 'Beck, 1979', expandedContent: 'Thought records are a cornerstone CBT technique that helps patients recognize cognitive distortions and develop more balanced thinking patterns.' },
  { id: 'res-8', title: 'Safety Planning', category: 'Crisis', icon: '🆘', description: 'A personalized, prioritized plan of coping strategies and support contacts for times of crisis.', source: 'Stanley & Brown, 2012', expandedContent: 'The Safety Planning Intervention is a brief, evidence-based intervention that has been shown to reduce suicidal behavior and increase treatment engagement.' }
];

// ============ SAFETY PLAN (F-P7) ============
export const baselineSafetyPlan = {
  maria: { reviewedDate: '2026-02-21', steps: [{ title: 'Warning Signs', items: ['Cannot stop negative thought loops', 'Feel physically tense for hours', 'Withdraw from family contact'] }, { title: 'Internal Coping Strategies', items: ['4-6 breathing cadence', 'Go for a 10-minute walk', 'Write in journal'] }, { title: 'People & Places That Distract', items: ['Call my sister Ana', 'Visit the bookstore', 'Watch a comfort show'] }, { title: 'People I Can Ask for Help', items: ['Mom (Carmen) — 555-0142', 'Best friend (Sofia) — 555-0198', 'Neighbor (Mr. Park) — 555-0234'] }, { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] }, { title: 'Making My Environment Safe', items: ['Keep medications in locked cabinet', 'Remove triggers from workspace'] }] },
  james: { reviewedDate: '2026-02-22', steps: [{ title: 'Warning Signs', items: ['Extreme frustration with tasks', 'Complete withdrawal from communication', 'Skipping meals for full day'] }, { title: 'Internal Coping Strategies', items: ['5-minute micro-task', 'Brief walk outside', 'Listen to music playlist'] }, { title: 'People & Places That Distract', items: ['Call my friend Marcus', 'Go to the gym', 'Play guitar'] }, { title: 'People I Can Ask for Help', items: ['Dad (Robert) — 555-0198', 'Friend (Marcus) — 555-0175'] }, { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] }, { title: 'Making My Environment Safe', items: ['Keep medication in kitchen cabinet', 'Limit alcohol availability'] }] },
  emma: { reviewedDate: '2026-02-23', steps: [{ title: 'Warning Signs', items: ['Sleeping more than 12 hours', 'Crying without clear trigger', 'Canceling all plans for multiple days'] }, { title: 'Internal Coping Strategies', items: ['Brief walk reset', 'Reflective journaling', 'Consistent evening routine'] }, { title: 'People & Places That Distract', items: ['Call my sister Kate', 'Visit the park with dog', 'Garden or outdoor activity'] }, { title: 'People I Can Ask for Help', items: ['Spouse (David) — 555-0234', 'Sister (Kate) — 555-0256'] }, { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] }, { title: 'Making My Environment Safe', items: ['Medications managed by David', 'Keep emergency numbers posted on fridge'] }] }
};

// ============ ONBOARDING (F-P8) ============
export const baselineOnboardingSteps = [
  { title: 'How Peacefull.ai Works', description: 'Peacefull.ai is your between-session companion. Everything you share is reviewed by your clinician — the AI never acts alone.', icon: '🛡️' },
  { title: 'What You Can Do', description: 'Track your mood with daily check-ins. Reflect in your journal or voice notes. Chat with your AI companion. Track your progress and earn badges.', icon: '✨' },
  { title: 'Your Privacy Matters', description: 'Your data is encrypted and only shared with your care team. AI responses are drafts — your therapist reviews everything before any clinical decisions are made.', icon: '🔒' }
];

// ============ CHAT SCRIPT (F-P5) ============
export const baselineChatScript = {
  maria: [
    { sender: 'ai', text: 'Hi Maria! Welcome back. Based on your recent check-ins, it looks like evenings have been challenging. How are you feeling right now?', memoryRef: { strategy: 'Evening stress patterns', approvedBy: 'Dr. Chen', approvedDate: '2026-02-15' } },
    { sender: 'patient', text: 'Yeah, tonight is really rough. I can\'t stop thinking about work.' },
    { sender: 'ai', text: 'I hear you. Let\'s try something that helped before — your 4-6 breathing cadence. Inhale for 4 seconds, exhale for 6. Want to do 3 rounds together?', memoryRef: { strategy: '4-6 breathing cadence', approvedBy: 'Dr. Chen', approvedDate: '2026-02-20' } },
    { sender: 'patient', text: 'Okay, that actually did help a bit. Thanks.' },
    { sender: 'ai', text: 'Great job. I\'ll note this in a draft summary for Dr. Chen so she has context for your session tomorrow. Anything else before bed?' },
    { sender: 'patient', text: 'No, I think I\'m good. Goodnight.' },
    { sender: 'ai', text: 'Goodnight, Maria. Remember, if you need immediate help, call 988 any time. 💚' },
    { sender: 'system', text: 'Draft summary created for clinician review.' }
  ],
  james: [
    { sender: 'ai', text: 'Hey James! I noticed your focus check-ins have been lower this week. What\'s on your mind?', memoryRef: { strategy: 'Focus fragmentation tracking', approvedBy: 'Dr. Chen', approvedDate: '2026-02-18' } },
    { sender: 'patient', text: 'I have a huge deadline tomorrow and I can\'t even start. It\'s overwhelming.' },
    { sender: 'ai', text: 'That sounds stressful. Your therapist noted that micro-task breakdowns work well for you. Can we pick just one 5-minute piece to start with right now?', memoryRef: { strategy: 'Micro-task breakdown (5-min start)', approvedBy: 'Dr. Chen', approvedDate: '2026-02-22' } },
    { sender: 'patient', text: 'I guess I could outline the first section. That\'s maybe 5 minutes.' },
    { sender: 'ai', text: 'Perfect. Just the outline, nothing more. I\'ll check in after 5 minutes. You\'ve got this — one step at a time.' },
    { sender: 'patient', text: 'Done. That wasn\'t as bad as I thought.' },
    { sender: 'ai', text: 'Awesome work, James! I\'ll log this win and let Dr. Chen know the micro-task approach is working. Want to try one more block or call it a night?' },
    { sender: 'system', text: 'Draft summary created for clinician review.' }
  ],
  emma: [
    { sender: 'ai', text: 'Hi Emma. Your evening check-ins show your mood has been more stable this week. How are you feeling tonight?', memoryRef: { strategy: 'Mood stability tracking', approvedBy: 'Dr. Chen', approvedDate: '2026-02-16' } },
    { sender: 'patient', text: 'I\'m okay actually. A little tired but not as low as last week.' },
    { sender: 'ai', text: 'That\'s really good to hear. I noticed you\'ve been consistent with your evening routine — 5 nights in a row! That pattern seems to be helping.', memoryRef: { strategy: 'Consistent evening routine', approvedBy: 'Dr. Chen', approvedDate: '2026-02-23' } },
    { sender: 'patient', text: 'Yeah, the routine does help. I still get worried it\'ll come back though.' },
    { sender: 'ai', text: 'Those worries are understandable. Your therapist will review your progress trends before your next session. For now, your consistency is your best protection.' },
    { sender: 'patient', text: 'Thanks, that helps to hear.' },
    { sender: 'ai', text: 'You\'re doing really well, Emma. Rest up tonight. If you need anything, I\'m here — or call 988 anytime. 💚' },
    { sender: 'system', text: 'Draft summary created for clinician review.' }
  ]
};

// ============ HISTORY ENTRIES (F-P6) ============
export const baselineHistoryEntries = {
  maria: [
    { id: 'hist-1', type: 'CHECKIN', date: '2026-02-26T09:15', mood: 4, stress: 2, sleep: 3, aiReflection: { tone: 'Your mood is trending up this week.', summary: 'Mood 4/5, Stress 2/5, Sleep 3/5. Focus areas: anxiety.', nextStep: 'Continue 4-6 breathing before bed tonight.' } },
    { id: 'hist-2', type: 'JOURNAL', date: '2026-02-25T20:30', snippet: 'Today was tough at work but I tried the breathing exercise and it helped settle my thoughts before bed...', aiReflection: { tone: 'Thank you for trying the breathing technique.', summary: 'Work stress persists but coping strategies are being utilized.', nextStep: 'Try structured next-day planning tonight.' } },
    { id: 'hist-3', type: 'CHECKIN', date: '2026-02-25T07:00', mood: 3, stress: 3, sleep: 3, aiReflection: { tone: 'A steady day.', summary: 'Mood 3/5, Stress 3/5, Sleep 3/5.', nextStep: 'Consider a brief walk during lunch.' } },
    { id: 'hist-4', type: 'VOICE', date: '2026-02-24T21:00', snippet: '2:15 recording — Focus: Mood, Stress', aiReflection: { tone: 'Your voice note captured important context.', summary: 'Evening stress related to commute and sleep concerns.', nextStep: 'Try the evening check-in routine tonight.' } },
    { id: 'hist-5', type: 'JOURNAL', date: '2026-02-24T08:45', snippet: 'Slept better last night after trying the breathing. Want to keep this up...', aiReflection: { tone: 'Great progress with sleep.', summary: 'Positive response to 4-6 breathing cadence for sleep.', nextStep: 'Continue and track sleep quality this week.' } },
    { id: 'hist-6', type: 'CHECKIN', date: '2026-02-23T09:00', mood: 3, stress: 4, sleep: 2, aiReflection: { tone: 'Stress is elevated today.', summary: 'Mood 3/5, Stress 4/5, Sleep 2/5.', nextStep: 'Prioritize sleep hygiene tonight.' } },
    { id: 'hist-7', type: 'JOURNAL', date: '2026-02-22T19:30', snippet: 'Started the week feeling anxious about the project review. Tried to break it into smaller tasks...', aiReflection: { tone: 'Good use of task breakdown.', summary: 'Anxiety about work managed with micro-task approach.', nextStep: 'Continue structured planning.' } },
    { id: 'hist-8', type: 'CHECKIN', date: '2026-02-21T09:15', mood: 3, stress: 3, sleep: 4, aiReflection: { tone: 'A balanced day.', summary: 'Mood 3/5, Stress 3/5, Sleep 4/5.', nextStep: 'Maintain current evening routine.' } }
  ],
  james: [
    { id: 'hist-1', type: 'CHECKIN', date: '2026-02-25T08:30', mood: 3, stress: 4, sleep: 3, aiReflection: { tone: 'Focus challenges noted.', summary: 'Mood 3/5, Stress 4/5, Sleep 3/5. Focus areas: focus, motivation.', nextStep: 'Try the single-priority planning technique today.' } },
    { id: 'hist-2', type: 'JOURNAL', date: '2026-02-24T20:00', snippet: 'Deadline week is brutal. I managed to start one task using the 5-min trick...', aiReflection: { tone: 'Good use of micro-task strategy.', summary: 'Deadline stress but utilizing micro-task breakdown.', nextStep: 'Continue one-task-at-a-time approach.' } },
    { id: 'hist-3', type: 'CHECKIN', date: '2026-02-23T08:15', mood: 2, stress: 5, sleep: 2, aiReflection: { tone: 'High stress day.', summary: 'Mood 2/5, Stress 5/5, Sleep 2/5.', nextStep: 'Take a timed reset break.' } },
    { id: 'hist-4', type: 'VOICE', date: '2026-02-22T14:00', snippet: '1:45 recording — Focus: Stress, Focus', aiReflection: { tone: 'Your voice note captured task frustration.', summary: 'Focus fragmentation during afternoon block.', nextStep: 'Try the timed reset prompt (5-min break).' } }
  ],
  emma: [
    { id: 'hist-1', type: 'CHECKIN', date: '2026-02-26T21:45', mood: 4, stress: 2, sleep: 4, aiReflection: { tone: 'Great evening report.', summary: 'Mood 4/5, Stress 2/5, Sleep 4/5.', nextStep: 'Continue this positive trend.' } },
    { id: 'hist-2', type: 'JOURNAL', date: '2026-02-26T12:30', snippet: 'Took a walk during lunch and felt much better. The routine is really helping...', aiReflection: { tone: 'Positive engagement.', summary: 'Walking during lunch boosting mid-day mood.', nextStep: 'Keep this as a regular practice.' } },
    { id: 'hist-3', type: 'CHECKIN', date: '2026-02-25T21:30', mood: 4, stress: 2, sleep: 3, aiReflection: { tone: 'Steady progress.', summary: 'Mood 4/5, Stress 2/5, Sleep 3/5.', nextStep: 'Focus on sleep consistency tonight.' } },
    { id: 'hist-4', type: 'JOURNAL', date: '2026-02-24T20:00', snippet: 'Feeling more stable this week. The evening routine is becoming automatic now...', aiReflection: { tone: 'Excellent routine adherence.', summary: 'Mood stabilization with consistent evening routine.', nextStep: 'Continue routine and track sleep.' } },
    { id: 'hist-5', type: 'VOICE', date: '2026-02-23T19:00', snippet: '1:30 recording — Focus: Mood, Sleep', aiReflection: { tone: 'Good reflection.', summary: 'Processing progress and mild relapse concerns.', nextStep: 'Discuss concerns with therapist at next session.' } },
    { id: 'hist-6', type: 'CHECKIN', date: '2026-02-22T21:00', mood: 3, stress: 3, sleep: 3, aiReflection: { tone: 'A moderate day.', summary: 'Mood 3/5, Stress 3/5, Sleep 3/5.', nextStep: 'Try body scan meditation before bed.' } }
  ]
};

// ============ PATIENT MEMORIES (F-M1) ============
export const baselinePatientMemories = {
  maria: [
    { id: 'pm-1', strategy: '4-6 Breathing Cadence', category: 'Coping Strategy', description: 'Slow breathing: inhale 4s, exhale 6s. Helps reduce evening anxiety.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-20', status: 'ACTIVE' },
    { id: 'pm-2', strategy: 'Short Evening Check-in', category: 'Routine', description: 'Brief end-of-day self-assessment before bed helps track patterns.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-15', status: 'ACTIVE' },
    { id: 'pm-3', strategy: 'Structured Next-Day Plan', category: 'Planning', description: 'Writing tomorrow\'s top 3 priorities reduces morning anxiety.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-18', status: 'ACTIVE' },
    { id: 'pm-4', strategy: 'Evening Stress Pattern', category: 'Mood Pattern', description: 'Stress spikes after commute and on poor-sleep nights.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-15', status: 'ACTIVE' }
  ],
  james: [
    { id: 'pm-1', strategy: 'Micro-Task Breakdown', category: 'Coping Strategy', description: '5-minute start technique for task initiation paralysis.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-22', status: 'ACTIVE' },
    { id: 'pm-2', strategy: 'Single-Priority Planning', category: 'Planning', description: 'Focus on one task at a time to reduce fragmentation.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-18', status: 'ACTIVE' },
    { id: 'pm-3', strategy: 'Timed Reset Prompts', category: 'Routine', description: '5-minute breaks between focus blocks to prevent burnout.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-20', status: 'ACTIVE' }
  ],
  emma: [
    { id: 'pm-1', strategy: 'Brief Walk Reset', category: 'Coping Strategy', description: 'Short walks during the day to boost mood and energy.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-16', status: 'ACTIVE' },
    { id: 'pm-2', strategy: 'Reflective Journaling', category: 'Coping Strategy', description: 'Daily journaling to process emotions and track patterns.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-18', status: 'ACTIVE' },
    { id: 'pm-3', strategy: 'Consistent Evening Routine', category: 'Routine', description: 'Fixed evening routine improves sleep and mood stability.', approvedBy: 'Dr. Chen', approvedDate: '2026-02-23', status: 'ACTIVE' }
  ]
};

// ============ JOURNAL PROMPTS (F-PE2) ============
export const baselineJournalPrompts = [
  { id: 'jp-1', category: 'Mood', label: 'Emotion peak', prompt: 'What emotion felt strongest today, and when did it peak?' },
  { id: 'jp-2', category: 'Coping', label: 'What helped', prompt: 'What was one moment that felt easier, and what helped in that moment?' },
  { id: 'jp-3', category: 'Coping', label: 'Next-24h support', prompt: 'What feels hardest right now, and what support would help in the next 24 hours?' },
  { id: 'jp-4', category: 'Mood', label: 'Thought record', prompt: 'What automatic thought was loudest today? How might you reframe it?' },
  { id: 'jp-5', category: 'Coping', label: 'Small win', prompt: 'What was one small thing you did today that gave you a sense of accomplishment?' },
  { id: 'jp-6', category: 'Gratitude', label: 'Gratitude', prompt: 'Name three things you feel grateful for today, even small ones.' },
  { id: 'jp-7', category: 'Mood', label: 'Body scan', prompt: 'Describe the strongest emotion you felt today. Where did you feel it in your body?' },
  { id: 'jp-8', category: 'Sleep', label: 'Sleep reflection', prompt: 'How did your sleep affect your mood and energy today?' }
];

// ============ EVIDENCE BASE (F-E1) ============
export const baselineEvidenceItems = [
  { id: 'ev-1', domain: 'Assessment Tools', title: 'PHQ-9', citation: 'Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001). The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606-613.', doi: '10.1046/j.1525-1497.2001.016009606.x', usedIn: ['MBC Dashboard'] },
  { id: 'ev-2', domain: 'Assessment Tools', title: 'GAD-7', citation: 'Spitzer, R. L., Kroenke, K., Williams, J. B., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092-1097.', doi: '10.1001/archinte.166.10.1092', usedIn: ['MBC Dashboard'] },
  { id: 'ev-3', domain: 'Therapeutic Modalities', title: 'Cognitive Therapy', citation: 'Beck, A. T. (1979). Cognitive therapy and the emotional disorders. Penguin.', doi: '', usedIn: ['Journal Prompts', 'Resources'] },
  { id: 'ev-4', domain: 'Therapeutic Modalities', title: 'DBT Skills', citation: 'Linehan, M. M. (2014). DBT Skills Training Manual (2nd ed.). Guilford Press.', doi: '', usedIn: ['Journal Prompts', 'Resources'] },
  { id: 'ev-5', domain: 'Therapeutic Modalities', title: 'Behavioral Activation', citation: 'Martell, C. R., Dimidjian, S., & Herman-Dunn, R. (2010). Behavioral Activation for Depression. Guilford Press.', doi: '', usedIn: ['Journal Prompts', 'Resources'] },
  { id: 'ev-6', domain: 'Therapeutic Modalities', title: 'MBSR', citation: 'Kabat-Zinn, J. (1990). Full catastrophe living: Using the wisdom of your body and mind to face stress, pain, and illness. Delacorte.', doi: '', usedIn: ['Resources'] },
  { id: 'ev-7', domain: 'Engagement & Adherence', title: 'Gamification Framework', citation: 'Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness. Proceedings of MindTrek \'11, 9-15.', doi: '10.1145/2181037.2181040', usedIn: ['Progress & Gamification'] },
  { id: 'ev-8', domain: 'Safety & Crisis', title: 'Safety Planning Intervention', citation: 'Stanley, B., & Brown, G. K. (2012). Safety planning intervention: A brief intervention to mitigate suicide risk. Cognitive and Behavioral Practice, 19(2), 256-264.', doi: '10.1016/j.cbpra.2011.01.001', usedIn: ['Safety Plan'] },
  { id: 'ev-9', domain: 'Sleep & Wellness', title: 'Sleep Hygiene', citation: 'Irish, L. A., Kline, C. E., Gunn, H. E., Buysse, D. J., & Hall, M. H. (2015). The role of sleep hygiene in promoting public health. Sleep Medicine Reviews, 22, 23-36.', doi: '10.1016/j.smrv.2014.10.001', usedIn: ['Journal Prompts', 'Resources'] },
  { id: 'ev-10', domain: 'Sleep & Wellness', title: 'CBT for Insomnia', citation: 'Morin, C. M., et al. (2006). Psychological and behavioral treatment of insomnia. Sleep, 29(11), 1398-1414.', doi: '10.1093/sleep/29.11.1398', usedIn: ['Journal Prompts'] },
  { id: 'ev-11', domain: 'Gratitude & Positive Psychology', title: 'Gratitude Journaling', citation: 'Emmons, R. A., & McCullough, M. E. (2003). Counting blessings versus burdens. Journal of Personality and Social Psychology, 84(2), 377-389.', doi: '10.1037/0022-3514.84.2.377', usedIn: ['Journal Prompts', 'Resources'] },
  { id: 'ev-12', domain: 'Digital Health', title: 'Digital Mental Health', citation: 'Lattie, E. G., et al. (2019). Digital mental health interventions for depression, anxiety, and enhancement of psychological well-being. Current Psychiatry Reports, 21(7), 1-12.', doi: '10.1007/s11920-019-1044-9', usedIn: ['Chat Simulation', 'Session Prep'] },
  { id: 'ev-13', domain: 'Digital Health', title: 'Mental Health Apps Review', citation: 'Torous, J., et al. (2018). Clinical review of user engagement with mental health smartphone apps. BMJ, 363, k4596.', doi: '10.1136/bmj.k4596', usedIn: ['Evidence Base'] },
  { id: 'ev-14', domain: 'Engagement & Adherence', title: 'Gamification for Health', citation: 'Johnson, D., et al. (2016). Gamification for health and wellbeing. Internet Interventions, 6, 89-106.', doi: '10.1016/j.invent.2016.10.002', usedIn: ['Progress & Gamification'] }
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
  recordSeconds: 0,

  // Phase 2 – Patient screens
  sessionTopics: JSON.parse(JSON.stringify(baselineSessionPrep)),
  resourceFilter: 'All',
  expandedResourceId: null,
  expandedSafetySteps: [],
  onboardingStep: 0,
  onboardingComplete: false,

  // Phase 3 – Chat & History
  chatMessages: [],
  chatTyping: false,
  chatMessageIndex: 0,
  historyFilter: 'All',
  expandedHistoryId: null,
  journalFilter: 'All',
  selectedJournalPrompt: null,
  voiceFocusTags: [],
  selectedMoodTag: null,

  // Phase 4 – Memory view
  patientMemoryFilter: 'All',
  expandedPatientMemoryId: null,

  // Phase 5 – Evidence
  evidenceFilter: 'All',
  expandedEvidenceId: null
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

export function resetSessionTopics() {
  state.sessionTopics = JSON.parse(JSON.stringify(baselineSessionPrep));
}

export function resetResources() {
  state.resourceFilter = 'All';
  state.expandedResourceId = null;
}

export function resetSafetyPlan() {
  state.expandedSafetySteps = [];
}

export function resetOnboarding() {
  state.onboardingStep = 0;
  state.onboardingComplete = false;
}

export function resetChat() {
  state.chatMessages = [];
  state.chatTyping = false;
  state.chatMessageIndex = 0;
}

export function resetHistory() {
  state.historyFilter = 'All';
  state.expandedHistoryId = null;
}

export function resetJournalExtended() {
  state.journalFilter = 'All';
  state.selectedJournalPrompt = null;
  state.voiceFocusTags = [];
  state.selectedMoodTag = null;
}

export function resetPatientMemoryView() {
  state.patientMemoryFilter = 'All';
  state.expandedPatientMemoryId = null;
}

export function resetEvidence() {
  state.evidenceFilter = 'All';
  state.expandedEvidenceId = null;
}
