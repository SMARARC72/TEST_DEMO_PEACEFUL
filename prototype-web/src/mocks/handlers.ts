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
];
