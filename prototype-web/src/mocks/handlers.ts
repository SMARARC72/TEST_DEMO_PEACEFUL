// ─── MSW Mock Handlers ───────────────────────────────────────────────
// Mock API handlers for development / testing without the backend.
// Start with: import { worker } from './mocks/browser'; worker.start();

import { http, HttpResponse } from 'msw';
import type {
  User,
  LoginResponse,
  DashboardResponse,
  CaseloadResponse,
  TriageListResponse,
  CheckinData,
  JournalEntry,
  SafetyPlan,
  CrisisResource,
  PatientSettings,
} from '@/api/types';

const BASE = '/api/v1';

// ─── Seed data ───────────────────────────────

const mockUser: User = {
  id: 'patient-001',
  tenantId: 'tenant-001',
  email: 'demo@peacefull.ai',
  role: 'PATIENT',
  status: 'ACTIVE',
  profile: { firstName: 'Alex', lastName: 'Rivera' },
  mfaEnabled: false,
  createdAt: '2025-01-15T00:00:00Z',
};

const mockClinician: User = {
  id: 'clinician-001',
  tenantId: 'tenant-001',
  email: 'dr.chen@peacefull.ai',
  role: 'CLINICIAN',
  status: 'ACTIVE',
  profile: { firstName: 'Dr. Sarah', lastName: 'Chen' },
  mfaEnabled: true,
  createdAt: '2025-01-10T00:00:00Z',
};

const mockCheckins: CheckinData[] = Array.from({ length: 14 }, (_, i) => ({
  id: `checkin-${i}`,
  patientId: 'patient-001',
  mood: 4 + Math.round(Math.random() * 4),
  stress: 3 + Math.round(Math.random() * 5),
  sleep: 5 + Math.round(Math.random() * 3),
  focus: 4 + Math.round(Math.random() * 4),
  notes: i === 0 ? 'Feeling better today after morning walk.' : undefined,
  createdAt: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
}));

const mockJournals: JournalEntry[] = [
  {
    id: 'journal-001',
    patientId: 'patient-001',
    content: 'Today I practiced the breathing exercise my therapist recommended. It helped me feel more centered during a stressful meeting at work.',
    category: 'coping',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'journal-002',
    patientId: 'patient-001',
    content: 'I noticed I was catastrophizing about the upcoming presentation. I used the thought challenging technique to examine the evidence.',
    category: 'reflection',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const mockSafetyPlan: SafetyPlan = {
  id: 'sp-001',
  patientId: 'patient-001',
  version: 1,
  reviewedDate: new Date().toISOString(),
  steps: [
    {
      title: 'Warning Signs',
      description: 'Recognize the thoughts, moods, and situations that precede a crisis',
      items: ['Feeling overwhelmed', 'Difficulty sleeping', 'Withdrawing from friends'],
    },
    {
      title: 'Internal Coping Strategies',
      description: 'Things I can do on my own to distract myself',
      items: ['Deep breathing (4-7-8)', 'Go for a walk', 'Listen to calming music', 'Journal'],
    },
    {
      title: 'People Who Provide Distraction',
      description: 'People and social settings that help take my mind off problems',
      items: ['Call my sister Maria', 'Visit the coffee shop', 'Join a group fitness class'],
    },
    {
      title: 'People I Can Ask for Help',
      description: 'People I can reach out to during a crisis',
      items: ['Dr. Sarah Chen (therapist)', 'Mom: 555-0123', 'Best friend Jamie: 555-0456'],
    },
    {
      title: 'Professional Help',
      description: 'Professionals and agencies I can contact during a crisis',
      items: ['988 Suicide & Crisis Lifeline', 'Crisis Text Line: Text HOME to 741741', 'Local ER: City General Hospital'],
    },
    {
      title: 'Making the Environment Safe',
      description: 'Steps to reduce access to lethal means',
      items: ['Medications stored with roommate', 'Removed sharp objects from bedroom'],
    },
  ],
};

const mockResources: CrisisResource[] = [
  { id: 'r1', name: '988 Suicide & Crisis Lifeline', description: 'Free, confidential 24/7 support', phone: '988', category: 'crisis' },
  { id: 'r2', name: 'Crisis Text Line', description: 'Text HOME to 741741', phone: '741741', category: 'crisis' },
  { id: 'r3', name: 'NAMI Helpline', description: 'National Alliance on Mental Illness', phone: '1-800-950-6264', url: 'https://nami.org', category: 'support' },
  { id: 'r4', name: 'Calm App', description: 'Guided meditation and sleep stories', url: 'https://calm.com', category: 'coping' },
  { id: 'r5', name: 'MindShift CBT', description: 'Anxiety management tools', url: 'https://anxietycanada.com/resources/mindshift-cbt/', category: 'coping' },
  { id: 'r6', name: 'NIMH Resources', description: 'National Institute of Mental Health education', url: 'https://nimh.nih.gov', category: 'education' },
];

const mockSettings: PatientSettings = {
  notifications: {
    checkinReminders: true,
    journalPrompts: true,
    appointmentReminders: true,
    crisisAlerts: true,
  },
  privacy: {
    shareProgressWithClinician: true,
    allowVoiceMemos: true,
  },
  display: {
    darkMode: false,
    fontSize: 'medium',
  },
};

// ─── Handlers ────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    const isClinicianLogin = body.email.includes('clinician') || body.email.includes('dr.');
    const user = isClinicianLogin ? mockClinician : mockUser;
    const response: LoginResponse = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user,
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { firstName: string; lastName: string; email: string; role: string };
    const user: User = {
      ...mockUser,
      email: body.email,
      role: body.role as User['role'],
      profile: { firstName: body.firstName, lastName: body.lastName },
    };
    return HttpResponse.json({
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user,
    });
  }),

  http.post(`${BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'mock-refreshed-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${BASE}/auth/mfa-verify`, async ({ request }) => {
    const body = await request.json() as { userId: string; code: string };
    return HttpResponse.json({
      accessToken: 'mock-mfa-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user: body.userId.includes('clinician') ? mockClinician : mockUser,
    });
  }),

  // Patient - Progress
  http.get(`${BASE}/patients/:id/progress`, () => {
    return HttpResponse.json({
      checkins: mockCheckins,
      signalHistory: [
        { band: 'LOW', date: new Date().toISOString() },
        { band: 'GUARDED', date: new Date(Date.now() - 7 * 86400000).toISOString() },
      ],
    });
  }),

  // Patient - Check-in
  http.post(`${BASE}/patients/:id/checkin`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newCheckin: CheckinData = {
      id: `checkin-${Date.now()}`,
      patientId: 'patient-001',
      mood: body.mood as number,
      stress: body.stress as number,
      sleep: body.sleep as number,
      focus: body.focus as number,
      notes: body.notes as string | undefined,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(newCheckin, { status: 201 });
  }),

  http.get(`${BASE}/patients/:id/checkin/history`, () => {
    return HttpResponse.json(mockCheckins);
  }),

  // Patient - Journal
  http.get(`${BASE}/patients/:id/journal`, () => {
    return HttpResponse.json(mockJournals);
  }),

  http.post(`${BASE}/patients/:id/journal`, async ({ request }) => {
    const body = await request.json() as { content: string };
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      patientId: 'patient-001',
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(entry, { status: 201 });
  }),

  // Patient - Safety Plan
  http.get(`${BASE}/patients/:id/safety-plan`, () => {
    return HttpResponse.json(mockSafetyPlan);
  }),

  // Patient - Voice Memos
  http.get(`${BASE}/patients/:id/voice`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${BASE}/patients/:id/voice`, () => {
    return HttpResponse.json({
      id: `voice-${Date.now()}`,
      status: 'processing',
      duration: 45,
      createdAt: new Date().toISOString(),
    });
  }),

  // Patient - Resources
  http.get(`${BASE}/patients/:id/resources`, () => {
    return HttpResponse.json(mockResources);
  }),

  // Patient - Submissions
  http.get(`${BASE}/patients/:id/submissions`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${BASE}/patients/:id/submissions/:subId`, ({ params }) => {
    return HttpResponse.json({
      id: params.subId,
      patientId: 'patient-001',
      source: 'CHECKIN',
      rawContent: '{}',
      status: 'PROCESSED',
      createdAt: new Date().toISOString(),
    });
  }),

  http.get(`${BASE}/patients/:id/submissions/:subId/reflection`, () => {
    return HttpResponse.json({
      patientSummary: 'You reported improved mood and sleep quality today.',
      clinicianSummary: 'Patient shows improvement in mood metrics. Sleep quality trending upward.',
      signalBand: 'LOW',
      evidence: ['Mood score 7/10', 'Sleep quality 8/10', 'Stress decreased from 6 to 4'],
      unknowns: ['Social activity level not assessed'],
    });
  }),

  // Patient - Settings
  http.get(`${BASE}/patients/:id/settings`, () => {
    return HttpResponse.json(mockSettings);
  }),

  http.patch(`${BASE}/patients/:id/settings`, async ({ request }) => {
    const body = await request.json() as Partial<PatientSettings>;
    return HttpResponse.json({ ...mockSettings, ...body });
  }),

  // Patient - Consent
  http.get(`${BASE}/patients/:id/consent`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${BASE}/patients/:id/consent`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `consent-${Date.now()}`,
      patientId: 'patient-001',
      ...body,
      acceptedAt: new Date().toISOString(),
    });
  }),

  // Clinician - Dashboard
  http.get(`${BASE}/clinician/dashboard`, () => {
    const response: DashboardResponse = {
      clinicianId: 'clinician-001',
      totalPatients: 24,
      triageItems: 5,
      pendingDrafts: 3,
      escalations: 1,
    };
    return HttpResponse.json(response);
  }),

  // Clinician - Caseload
  http.get(`${BASE}/clinician/caseload`, () => {
    const response: CaseloadResponse = {
      clinicianId: 'clinician-001',
      totalPatients: 24,
      activePatients: 18,
      patients: [
        {
          id: 'cp-001',
          patientId: 'patient-001',
          patient: {
            id: 'patient-001',
            user: { firstName: 'Alex', lastName: 'Rivera' },
            triageItems: [{ id: 't1', patientId: 'patient-001', signalBand: 'LOW', status: 'RESOLVED', summary: '', source: 'CHECKIN', createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date().toISOString() }],
          },
        },
        {
          id: 'cp-002',
          patientId: 'patient-002',
          patient: {
            id: 'patient-002',
            user: { firstName: 'Jordan', lastName: 'Lee' },
            triageItems: [{ id: 't2', patientId: 'patient-002', signalBand: 'MODERATE', status: 'NEW', summary: 'Elevated stress indicators', source: 'CHECKIN', createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date(Date.now() - 86400000).toISOString() }],
          },
        },
        {
          id: 'cp-003',
          patientId: 'patient-003',
          patient: {
            id: 'patient-003',
            user: { firstName: 'Sam', lastName: 'Patel' },
            triageItems: [{ id: 't3', patientId: 'patient-003', signalBand: 'ELEVATED', status: 'ACK', summary: 'Crisis language detected in journal', source: 'JOURNAL', createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }],
          },
        },
      ],
    };
    return HttpResponse.json(response);
  }),

  // Clinician - Triage
  http.get(`${BASE}/clinician/triage`, () => {
    const response: TriageListResponse = {
      data: [
        {
          id: 'triage-001',
          patientId: 'patient-002',
          signalBand: 'MODERATE',
          status: 'NEW',
          summary: 'Patient reported significant increase in stress levels over the past week.',
          source: 'CHECKIN',
          createdAt: new Date().toISOString(),
          patient: { user: { firstName: 'Jordan', lastName: 'Lee' } },
        },
        {
          id: 'triage-002',
          patientId: 'patient-003',
          signalBand: 'ELEVATED',
          status: 'ACK',
          summary: 'Journal entry contains crisis language patterns. Immediate review recommended.',
          source: 'JOURNAL',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          patient: { user: { firstName: 'Sam', lastName: 'Patel' } },
        },
      ],
      total: 2,
    };
    return HttpResponse.json(response);
  }),

  http.get(`${BASE}/clinician/triage/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      patientId: 'patient-002',
      signalBand: 'MODERATE',
      status: 'NEW',
      summary: 'Patient reported significant increase in stress levels.',
      source: 'CHECKIN',
      createdAt: new Date().toISOString(),
      patient: { user: { firstName: 'Jordan', lastName: 'Lee' } },
    });
  }),

  http.patch(`${BASE}/clinician/triage/:id`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({
      id: params.id,
      patientId: 'patient-002',
      signalBand: 'MODERATE',
      status: body.status,
      summary: 'Updated triage item',
      source: 'CHECKIN',
      createdAt: new Date().toISOString(),
    });
  }),

  // Clinician - Patient Profile
  http.get(`${BASE}/clinician/patients/:id`, ({ params }) => {
    return HttpResponse.json({
      patient: {
        id: params.id,
        userId: `user-${params.id}`,
        tenantId: 'tenant-001',
        firstName: 'Alex',
        lastName: 'Rivera',
        signalBand: 'LOW',
        submissionCount: 12,
        diagnosisPrimary: 'Generalized Anxiety Disorder',
        diagnosisCode: 'F41.1',
      },
      recentCheckins: mockCheckins.slice(0, 7),
      recentJournals: mockJournals,
      triageItems: [],
      drafts: [],
      signalHistory: [
        { band: 'LOW', date: new Date().toISOString() },
        { band: 'GUARDED', date: new Date(Date.now() - 7 * 86400000).toISOString() },
        { band: 'MODERATE', date: new Date(Date.now() - 14 * 86400000).toISOString() },
      ],
    });
  }),

  // Clinician - Drafts
  http.get(`${BASE}/clinician/patients/:id/drafts`, () => {
    return HttpResponse.json([
      {
        id: 'draft-001',
        patientId: 'patient-001',
        format: 'progress_note',
        status: 'DRAFT',
        output: { content: 'Patient Alex Rivera showed marked improvement in mood and anxiety metrics over the past 14 days. Sleep quality has stabilized. Recommend continuing current treatment plan with follow-up in 2 weeks.' },
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.patch(`${BASE}/clinician/patients/:id/drafts/:draftId`, async ({ params, request }) => {
    const body = await request.json() as { status: string; reviewNotes?: string };
    return HttpResponse.json({
      id: params.draftId,
      patientId: params.id,
      format: 'progress_note',
      status: body.status,
      output: { content: 'Draft content here...' },
      reviewNotes: body.reviewNotes,
      createdAt: new Date().toISOString(),
    });
  }),

  // Clinician - Recommendations
  http.get(`${BASE}/clinician/patients/:id/recommendations`, () => {
    return HttpResponse.json([
      {
        id: 'rec-001',
        patientId: 'patient-001',
        type: 'treatment',
        title: 'Consider CBT Intensification',
        description: 'Based on 3-week mood trend, patient may benefit from increased CBT session frequency.',
        status: 'GENERATED',
        evidence: ['Mood trend: -1.2 avg over 3 weeks', 'Stress trend: +0.8 avg'],
        signalBand: 'GUARDED',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  // Clinician - Memories
  http.get(`${BASE}/clinician/patients/:id/memories`, () => {
    return HttpResponse.json([
      {
        id: 'mem-001',
        patientId: 'patient-001',
        category: 'coping',
        statement: 'Patient uses deep breathing (4-7-8 technique) as primary coping mechanism.',
        confidence: 'HIGH',
        conflictFlag: false,
        status: 'APPROVED',
        evidence: ['Mentioned in 3 journal entries', 'Referenced in check-in notes'],
        unknowns: [],
        auditTrail: 'Auto-extracted from journal entries on 2026-01-15',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'mem-002',
        patientId: 'patient-001',
        category: 'triggers',
        statement: 'Work presentations are a significant anxiety trigger.',
        confidence: 'MEDIUM',
        conflictFlag: true,
        conflictContext: 'Patient reported feeling "energized" before a recent presentation, which contradicts earlier anxiety reports.',
        status: 'CONFLICT_FLAGGED',
        evidence: ['4 journal entries mention work stress', 'Check-in stress spikes on weekdays'],
        unknowns: ['Whether the positive presentation experience represents a trend'],
        auditTrail: 'Conflict flagged by AI on 2026-02-01',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ]);
  }),

  // Clinician - Treatment Plans
  http.get(`${BASE}/clinician/patients/:id/plans`, () => {
    return HttpResponse.json([
      {
        id: 'plan-001',
        patientId: 'patient-001',
        goal: 'Reduce anxiety symptoms by 30% within 8 weeks',
        intervention: 'Weekly CBT sessions + daily 4-7-8 breathing exercise',
        owner: 'Dr. Sarah Chen',
        targetDate: new Date(Date.now() + 56 * 86400000).toISOString(),
        status: 'ACTIVE',
        evidence: ['Baseline GAD-7 score: 14', 'Current GAD-7 score: 10'],
        unknowns: ['Response to increased session frequency'],
        auditTrail: 'Created 2026-01-15',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ]);
  }),

  // Clinician - Restricted Notes
  http.get(`${BASE}/clinician/patients/:id/restricted-notes`, () => {
    return HttpResponse.json([
      {
        id: 'rn-001',
        patientId: 'patient-001',
        type: 'SAFETY',
        title: 'Safety Assessment - Initial Intake',
        content: 'Patient denies current suicidal ideation. No history of attempts. Has safety plan in place.',
        createdBy: 'Dr. Sarah Chen',
        excludedFromExports: true,
        auditTrail: '2026-01-15: Created by Dr. Chen',
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      },
    ]);
  }),

  // Clinician - Exports
  http.get(`${BASE}/clinician/patients/:id/exports`, () => {
    return HttpResponse.json([
      {
        id: 'exp-001',
        patientId: 'patient-001',
        profile: 'STANDARD',
        status: 'READY',
        format: 'PDF',
        fileSize: '2.4 MB',
        checksum: 'sha256:abc123',
        requestedBy: 'Dr. Sarah Chen',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 85000000).toISOString(),
        expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
      },
    ]);
  }),

  http.post(`${BASE}/clinician/patients/:id/export`, async ({ request }) => {
    const body = await request.json() as { profile: string };
    return HttpResponse.json({
      id: `exp-${Date.now()}`,
      patientId: 'patient-001',
      profile: body.profile,
      status: 'QUEUED',
      format: 'PDF',
      requestedBy: 'Dr. Sarah Chen',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Clinician - Settings
  http.get(`${BASE}/clinician/settings`, () => {
    return HttpResponse.json({
      notifications: {
        newTriageAlerts: true,
        draftReadyAlerts: true,
        escalationAlerts: true,
        weeklyDigest: false,
      },
      display: { darkMode: false, compactView: false },
      security: { mfaEnabled: true, sessionTimeout: 15 },
    });
  }),

  http.patch(`${BASE}/clinician/settings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  // Clinician - Patient checkins/journals
  http.get(`${BASE}/clinician/patients/:id/checkin`, () => {
    return HttpResponse.json(mockCheckins);
  }),

  http.get(`${BASE}/clinician/patients/:id/journal`, () => {
    return HttpResponse.json(mockJournals);
  }),

  // Recommendations / Memories / Plans patches
  http.patch(`${BASE}/clinician/patients/:id/recommendations/:recId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({ id: params.recId, status: body.status });
  }),

  http.patch(`${BASE}/clinician/patients/:id/memories/:memId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({ id: params.memId, status: body.status });
  }),

  http.patch(`${BASE}/clinician/patients/:id/plans/:planId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({ id: params.planId, status: body.status });
  }),

  // ── Password Reset ──────────────────────────
  http.post(`${BASE}/auth/forgot-password`, async () => {
    return HttpResponse.json({ success: true });
  }),

  // ── MBC Scores ──────────────────────────────
  http.get(`${BASE}/clinician/patients/:id/mbc`, () => {
    const scores = [
      { id: 'mbc-001', patientId: 'patient-001', instrument: 'PHQ9', score: 14, items: [2, 2, 1, 2, 1, 2, 2, 1, 1], administeredAt: new Date(Date.now() - 90 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
      { id: 'mbc-002', patientId: 'patient-001', instrument: 'GAD7', score: 12, items: [2, 2, 1, 2, 2, 1, 2], administeredAt: new Date(Date.now() - 90 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
      { id: 'mbc-003', patientId: 'patient-001', instrument: 'PHQ9', score: 11, items: [1, 2, 1, 1, 1, 2, 1, 1, 1], administeredAt: new Date(Date.now() - 60 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
      { id: 'mbc-004', patientId: 'patient-001', instrument: 'GAD7', score: 9, items: [2, 1, 1, 1, 2, 1, 1], administeredAt: new Date(Date.now() - 60 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
      { id: 'mbc-005', patientId: 'patient-001', instrument: 'PHQ9', score: 8, items: [1, 1, 1, 1, 1, 1, 1, 0, 1], administeredAt: new Date(Date.now() - 30 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
      { id: 'mbc-006', patientId: 'patient-001', instrument: 'GAD7', score: 6, items: [1, 1, 1, 1, 1, 0, 1], administeredAt: new Date(Date.now() - 30 * 86400000).toISOString(), administeredBy: 'Dr. Sarah Chen' },
    ];
    return HttpResponse.json(scores);
  }),

  http.post(`${BASE}/clinician/patients/:id/mbc`, async ({ params, request }) => {
    const body = await request.json() as { instrument: string; score: number; items: number[] };
    return HttpResponse.json({
      id: `mbc-${Date.now()}`,
      patientId: params.id,
      ...body,
      administeredAt: new Date().toISOString(),
      administeredBy: 'Dr. Sarah Chen',
    }, { status: 201 });
  }),

  // ── Session Notes ───────────────────────────
  http.get(`${BASE}/clinician/patients/:id/session-notes`, () => {
    return HttpResponse.json([
      {
        id: 'note-001',
        patientId: 'patient-001',
        sessionDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        status: 'SIGNED',
        subjective: 'Patient reports improved mood over the past week. Sleep quality has improved with new sleep hygiene routine.',
        objective: 'PHQ-9 score decreased from 11 to 8. Patient appears well-groomed, cooperative, and engaged.',
        assessment: 'Generalized Anxiety Disorder (F41.1) showing improvement. Treatment plan is effective.',
        plan: 'Continue current medication. Increase CBT frequency to bi-weekly. Follow up in 2 weeks.',
        cptCode: '90837',
        duration: 55,
        signedBy: 'Dr. Sarah Chen',
        signedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'note-002',
        patientId: 'patient-001',
        sessionDate: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        subjective: 'Patient reports moderate anxiety related to upcoming work deadline.',
        objective: 'GAD-7 score: 6 (mild). Patient is oriented x4, cooperative.',
        assessment: 'Anxiety symptoms manageable. Coping strategies effective.',
        plan: 'Review coping techniques. Schedule follow-up next week.',
        cptCode: '90834',
        duration: 45,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.post(`${BASE}/clinician/patients/:id/session-notes`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `note-${Date.now()}`,
      patientId: params.id,
      ...body,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${BASE}/clinician/patients/:id/session-notes/:noteId/sign`, ({ params }) => {
    return HttpResponse.json({
      id: params.noteId,
      patientId: params.id,
      status: 'SIGNED',
      signedBy: 'Dr. Sarah Chen',
      signedAt: new Date().toISOString(),
    });
  }),

  // ── Adherence ───────────────────────────────
  http.get(`${BASE}/clinician/patients/:id/adherence`, () => {
    return HttpResponse.json([
      { id: 'adh-001', patientId: 'patient-001', category: 'MEDICATION', title: 'Sertraline 50mg', description: 'Daily SSRI', status: 'COMPLIANT', frequency: 'Daily', lastLoggedAt: new Date().toISOString(), adherenceRate: 92, createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'adh-002', patientId: 'patient-001', category: 'EXERCISE', title: 'Morning Walk', description: '30min walk', status: 'PARTIAL', frequency: '5x/week', lastLoggedAt: new Date(Date.now() - 86400000).toISOString(), adherenceRate: 68, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'adh-003', patientId: 'patient-001', category: 'HOMEWORK', title: 'CBT Thought Record', description: 'Complete thought record when anxious', status: 'COMPLIANT', frequency: '3x/week', lastLoggedAt: new Date(Date.now() - 2 * 86400000).toISOString(), adherenceRate: 85, createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
      { id: 'adh-004', patientId: 'patient-001', category: 'APPOINTMENT', title: 'Therapy Sessions', description: 'Weekly therapy', status: 'COMPLIANT', frequency: 'Weekly', lastLoggedAt: new Date(Date.now() - 5 * 86400000).toISOString(), adherenceRate: 100, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
      { id: 'adh-005', patientId: 'patient-001', category: 'OTHER', title: 'Sleep Hygiene', description: 'No screens 1hr before bed', status: 'NON_COMPLIANT', frequency: 'Daily', adherenceRate: 35, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    ]);
  }),

  http.patch(`${BASE}/clinician/patients/:id/adherence/:itemId`, async ({ params, request }) => {
    const body = await request.json() as { status: string; notes?: string };
    return HttpResponse.json({
      id: params.itemId,
      patientId: params.id,
      status: body.status,
      notes: body.notes,
      lastLoggedAt: new Date().toISOString(),
    });
  }),

  // ── Escalations ─────────────────────────────
  http.get(`${BASE}/clinician/escalations`, () => {
    return HttpResponse.json([
      {
        id: 'esc-001',
        patientId: 'patient-003',
        patientName: 'Sam Patel',
        priority: 'P1',
        signalBand: 'ELEVATED',
        status: 'OPEN',
        reason: 'Crisis language detected',
        description: 'Journal entry from 2 hours ago contains phrases matching crisis language patterns. Patient mentions feeling hopeless.',
        slaDeadline: new Date(Date.now() + 45 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'esc-002',
        patientId: 'patient-002',
        patientName: 'Jordan Lee',
        priority: 'P2',
        signalBand: 'MODERATE',
        status: 'ACKNOWLEDGED',
        reason: 'Missed 3 consecutive check-ins',
        description: 'Patient has not completed a check-in in 5 days. Previous pattern was daily.',
        slaDeadline: new Date(Date.now() + 3 * 3600000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: 'esc-003',
        patientId: 'patient-004',
        patientName: 'Taylor Kim',
        priority: 'P3',
        signalBand: 'GUARDED',
        status: 'RESOLVED',
        reason: 'Medication non-adherence',
        description: 'Patient self-reported missing medication for 4 consecutive days.',
        slaDeadline: new Date(Date.now() - 12 * 3600000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
        resolvedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
        resolution: 'Contacted patient. Refill issue resolved with pharmacy. Patient resumed medication.',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      },
    ]);
  }),

  http.patch(`${BASE}/clinician/escalations/:id`, async ({ params, request }) => {
    const body = await request.json() as { status: string; resolution?: string };
    return HttpResponse.json({
      id: params.id,
      status: body.status,
      ...(body.status === 'ACKNOWLEDGED' ? { acknowledgedAt: new Date().toISOString() } : {}),
      ...(body.status === 'RESOLVED' ? { resolvedAt: new Date().toISOString(), resolution: body.resolution } : {}),
    });
  }),

  // ── Analytics ───────────────────────────────
  http.get(`${BASE}/clinician/analytics`, () => {
    return HttpResponse.json({
      overview: {
        totalPatients: 24,
        activePatients: 18,
        avgEngagementRate: 78,
        avgSignalImprovement: 12.5,
        pendingEscalations: 2,
        avgResponseTime: '23 min',
      },
      signalDistribution: [
        { band: 'LOW', count: 10 },
        { band: 'GUARDED', count: 6 },
        { band: 'MODERATE', count: 3 },
        { band: 'ELEVATED', count: 1 },
      ],
      engagementTrend: [
        { week: 'W1', checkins: 45, journals: 22, voice: 8 },
        { week: 'W2', checkins: 52, journals: 28, voice: 10 },
        { week: 'W3', checkins: 48, journals: 25, voice: 12 },
        { week: 'W4', checkins: 58, journals: 32, voice: 15 },
      ],
      outcomesTrend: [
        { month: 'Oct', phq9Avg: 12.4, gad7Avg: 10.8 },
        { month: 'Nov', phq9Avg: 11.1, gad7Avg: 9.5 },
        { month: 'Dec', phq9Avg: 9.8, gad7Avg: 8.2 },
        { month: 'Jan', phq9Avg: 8.5, gad7Avg: 7.1 },
      ],
      adherenceByCategory: [
        { category: 'Medication', rate: 88 },
        { category: 'Exercise', rate: 62 },
        { category: 'Homework', rate: 75 },
        { category: 'Appointments', rate: 95 },
      ],
      topMetrics: [
        { label: 'Avg PHQ-9', value: '8.5', change: -3.9, unit: 'pts' },
        { label: 'Avg GAD-7', value: '7.1', change: -3.7, unit: 'pts' },
        { label: 'Engagement', value: '78%', change: 8, unit: '%' },
        { label: 'Retention', value: '92%', change: 3, unit: '%' },
      ],
    });
  }),

  // AI Chat — SSE streaming mock
  http.post(`${BASE}/ai/chat`, async ({ request }) => {
    const body = await request.json() as { message: string };
    const replies = [
      "I hear you, and I appreciate you sharing that with me. Let's take a moment to reflect on what you're feeling. What do you think is the strongest emotion right now?",
      "Thank you for opening up. It takes courage to express your thoughts. Can you tell me more about what's been on your mind?",
      "That's a really thoughtful observation. Between sessions, it can help to notice patterns in how we're feeling. Would you like to explore that further?",
      "I'm glad you reached out. Remember, every step — even a small one — counts. What's one thing that helped you feel better recently?",
      `I understand. You mentioned: "${body.message.slice(0, 50)}" — let's unpack that together. What feels most important about this right now?`,
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)] ?? replies[0] ?? '';
    const words = reply.split(' ');
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = JSON.stringify({ content: words[i] + (i < words.length - 1 ? ' ' : '') });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          await new Promise((r) => setTimeout(r, 50));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),

  // ── Step-Up Auth ──────────────────────────
  http.post(`${BASE}/auth/step-up/verify`, async ({ request }) => {
    const body = await request.json() as { password: string };
    if (!body.password || body.password.length < 3) {
      return HttpResponse.json({ message: 'Invalid password' }, { status: 401 });
    }
    // Mock: accept any password, return elevated token
    return HttpResponse.json({
      elevatedToken: `elevated-${crypto.randomUUID()}`,
    });
  }),

  http.post(`${BASE}/auth/step-up/mfa`, async ({ request }) => {
    const body = await request.json() as { code: string };
    if (body.code !== '123456') {
      return HttpResponse.json({ message: 'Invalid MFA code' }, { status: 401 });
    }
    return HttpResponse.json({
      elevatedToken: `elevated-mfa-${crypto.randomUUID()}`,
    });
  }),

  // ── Tenants ───────────────────────────────
  http.get(`${BASE}/auth/tenants`, () => {
    return HttpResponse.json({
      tenants: [
        { id: 'tenant-001', slug: 'demo-clinic', name: 'Demo Clinic', primaryColor: '#6C5CE7' },
        { id: 'tenant-002', slug: 'wellness-center', name: 'Wellness Center', primaryColor: '#00B4D8' },
        { id: 'tenant-003', slug: 'behavioral-health', name: 'Behavioral Health Associates', primaryColor: '#10B981' },
      ],
    });
  }),
];
