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

// ─── Envelope helper — mirrors production API `{ data, requestId }` wrapper ──
let mockReqCounter = 0;
function mockJson<T>(payload: T, status = 200) {
  mockReqCounter += 1;
  return HttpResponse.json(
    { data: payload, requestId: `mock-req-${mockReqCounter}` },
    { status },
  );
}

// ─── Seed data ───────────────────────────────

// Session-aware user tracking: stores the currently logged-in user
// so auth/me returns the correct user (patient vs clinician vs supervisor)
let currentSessionUser: User | null = null;

const mockUser: User = {
  id: 'patient-001',
  tenantId: 'tenant-001',
  email: 'test.patient.1@peacefull.cloud',
  role: 'PATIENT',
  status: 'ACTIVE',
  profile: { firstName: 'Alex', lastName: 'Rivera' },
  mfaEnabled: false,
  createdAt: '2025-01-15T00:00:00Z',
};

const mockClinician: User = {
  id: 'clinician-001',
  tenantId: 'tenant-001',
  email: 'pilot.clinician.1@peacefull.cloud',
  role: 'CLINICIAN',
  status: 'ACTIVE',
  profile: { firstName: 'Dr. Sarah', lastName: 'Chen' },
  mfaEnabled: true,   // Demo accounts are pre-enrolled; new registrations get mfaEnabled: false
  createdAt: '2025-01-10T00:00:00Z',
};

const mockSupervisor: User = {
  id: 'supervisor-001',
  tenantId: 'tenant-001',
  email: 'pilot.supervisor@peacefull.cloud',
  role: 'SUPERVISOR',
  status: 'ACTIVE',
  profile: { firstName: 'Dr. Maria', lastName: 'Santos' },
  mfaEnabled: true,
  createdAt: '2025-01-05T00:00:00Z',
};

// Resolve the correct mock user from an email address
function resolveUserByEmail(email: string): User {
  if (email.includes('supervisor')) return { ...mockSupervisor };
  if (email.includes('clinician') || email.includes('dr.')) return { ...mockClinician };
  return { ...mockUser };
}

const mockCheckins: CheckinData[] = Array.from({ length: 14 }, (_, i) => ({
  id: `checkin-${i}`,
  patientId: 'patient-001',
  mood: 4 + Math.round(Math.random() * 4),
  stress: 3 + Math.round(Math.random() * 5),
  sleep: 5 + Math.round(Math.random() * 3),
  focus: 4 + Math.round(Math.random() * 4),
  anxiety: 2 + Math.round(Math.random() * 5),
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
      step: 1,
      title: 'Warning Signs',
      description: 'Recognize the thoughts, moods, and situations that precede a crisis',
      items: ['Feeling overwhelmed', 'Difficulty sleeping', 'Withdrawing from friends'],
    },
    {
      step: 2,
      title: 'Internal Coping Strategies',
      description: 'Things I can do on my own to distract myself',
      items: ['Deep breathing (4-7-8)', 'Go for a walk', 'Listen to calming music', 'Journal'],
    },
    {
      step: 3,
      title: 'People Who Provide Distraction',
      description: 'People and social settings that help take my mind off problems',
      items: ['Call my sister Maria', 'Visit the coffee shop', 'Join a group fitness class'],
    },
    {
      step: 4,
      title: 'People I Can Ask for Help',
      description: 'People I can reach out to during a crisis',
      items: ['Dr. Sarah Chen (therapist)', 'Mom: 555-0123', 'Best friend Jamie: 555-0456'],
    },
    {
      step: 5,
      title: 'Professional Help',
      description: 'Professionals and agencies I can contact during a crisis',
      items: ['988 Suicide & Crisis Lifeline', 'Crisis Text Line: Text HOME to 741741', 'Local ER: City General Hospital'],
    },
    {
      step: 6,
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
    const user = resolveUserByEmail(body.email);
    // Track the session so auth/me returns the right user
    currentSessionUser = user;
    const response: LoginResponse = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user,
    };
    return mockJson(response);
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { firstName: string; lastName: string; email: string; role: string; password: string };
    const isClinician = body.role === 'CLINICIAN';
    const user: User = {
      ...mockUser,
      id: `user-${Date.now()}`,
      email: body.email,
      role: body.role as User['role'],
      status: isClinician ? 'PENDING_APPROVAL' : 'ACTIVE',
      mfaEnabled: false,  // New registrations always start without MFA
      profile: { firstName: body.firstName, lastName: body.lastName },
    };
    // Track session for auth/me
    currentSessionUser = user;
    // Clinicians require admin approval — return user but no tokens
    if (isClinician) {
      return mockJson({
        user,
        status: 'PENDING_APPROVAL',
        emailSent: true,
        message: `A confirmation email has been sent to ${body.email}. Your account is pending supervisor approval.`,
      }, 201);
    }
    return mockJson({
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user,
      emailSent: true,
      message: `Welcome! A confirmation email has been sent to ${body.email}.`,
    }, 201);
  }),

  http.post(`${BASE}/auth/refresh`, () => {
    return mockJson({
      accessToken: 'mock-refreshed-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    currentSessionUser = null;
    return mockJson({ success: true });
  }),

  http.get(`${BASE}/auth/me`, () => {
    // Return the user from the current session (clinician, supervisor, or patient)
    return mockJson(currentSessionUser ?? mockUser);
  }),

  http.post(`${BASE}/auth/mfa-verify`, async ({ request }) => {
    const body = await request.json() as { userId: string; code: string };
    const user = body.userId.includes('supervisor')
      ? mockSupervisor
      : body.userId.includes('clinician')
        ? mockClinician
        : mockUser;
    currentSessionUser = user;
    return mockJson({
      accessToken: 'mock-mfa-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user,
    });
  }),

  // Patient - /me resolver (returns current patient by auth user ID)
  http.get(`${BASE}/patients/me`, () => {
    const user = currentSessionUser ?? mockUser;
    return mockJson({
      id: 'patient-001',
      userId: user.id,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      dateOfBirth: '1990-03-15',
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    });
  }),

  // Patient - /me/progress (convenience route)
  http.get(`${BASE}/patients/me/progress`, () => {
    return mockJson({
      checkins: mockCheckins,
      signalHistory: [
        { band: 'LOW', date: new Date().toISOString() },
        { band: 'GUARDED', date: new Date(Date.now() - 7 * 86400000).toISOString() },
        { band: 'MODERATE', date: new Date(Date.now() - 14 * 86400000).toISOString() },
        { band: 'ELEVATED', date: new Date(Date.now() - 21 * 86400000).toISOString() },
      ],
      weeklyAvg: {
        mood: 6.8,
        stress: 4.2,
        sleep: 7.1,
        focus: 6.5,
        anxiety: 3.8,
      },
      streaks: { currentDays: 7, longestDays: 14 },
    });
  }),

  // Patient - Progress
  http.get(`${BASE}/patients/:id/progress`, () => {
    return mockJson({
      checkins: mockCheckins,
      signalHistory: [
        { band: 'LOW', date: new Date().toISOString() },
        { band: 'GUARDED', date: new Date(Date.now() - 7 * 86400000).toISOString() },
        { band: 'MODERATE', date: new Date(Date.now() - 14 * 86400000).toISOString() },
        { band: 'ELEVATED', date: new Date(Date.now() - 21 * 86400000).toISOString() },
      ],
      weeklyAvg: {
        mood: 6.8,
        stress: 4.2,
        sleep: 7.1,
        focus: 6.5,
        anxiety: 3.8,
      },
      streaks: { currentDays: 7, longestDays: 14 },
    });
  }),

  // Patient - Check-in (with rate limiting)
  http.post(`${BASE}/patients/:id/checkin`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    // Rate limiting: reject if submitted within 60 seconds
    const lastCheckinTime = mockCheckins[mockCheckins.length - 1]?.createdAt;
    if (lastCheckinTime && Date.now() - new Date(lastCheckinTime).getTime() < 60_000) {
      return mockJson(
        { message: 'Rate limit exceeded. Please wait at least 60 seconds between check-ins.' },
        429,
      );
    }
    const newCheckin: CheckinData = {
      id: `checkin-${Date.now()}`,
      patientId: 'patient-001',
      mood: body.mood as number,
      stress: body.stress as number,
      sleep: body.sleep as number,
      focus: body.focus as number,
      anxiety: (body.anxiety as number) ?? undefined,
      notes: body.notes as string | undefined,
      createdAt: new Date().toISOString(),
    };
    mockCheckins.push(newCheckin);
    return mockJson(newCheckin, 201);
  }),

  http.get(`${BASE}/patients/:id/checkin/history`, () => {
    return mockJson(mockCheckins);
  }),

  // Patient - Journal
  http.get(`${BASE}/patients/:id/journal`, () => {
    return mockJson(mockJournals);
  }),

  http.post(`${BASE}/patients/:id/journal`, async ({ request }) => {
    const body = await request.json() as { content: string };
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      patientId: 'patient-001',
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    return mockJson(entry, 201);
  }),

  // Patient - Safety Plan
  http.get(`${BASE}/patients/:id/safety-plan`, () => {
    return mockJson(mockSafetyPlan);
  }),

  // Patient - Voice Memos
  http.get(`${BASE}/patients/:id/voice`, () => {
    return mockJson([
      {
        id: 'voice-001',
        patientId: 'patient-001',
        audioUrl: '/mock-audio.webm',
        transcription: 'I\'ve been feeling a lot better this week. The breathing exercises are really helping me manage my anxiety during work meetings. I also started journaling before bed which helps me sleep.',
        duration: 45,
        status: 'COMPLETE' as const,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'voice-002',
        patientId: 'patient-001',
        audioUrl: '/mock-audio-2.webm',
        transcription: 'Today was tough. Had a presentation at work and felt really anxious beforehand. But I used the 4-7-8 breathing technique and it helped me get through it.',
        duration: 32,
        status: 'COMPLETE' as const,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ]);
  }),

  http.post(`${BASE}/patients/:id/voice`, () => {
    return mockJson({
      id: `voice-${Date.now()}`,
      patientId: 'patient-001',
      status: 'PROCESSING',
      duration: 45,
      createdAt: new Date().toISOString(),
      // Simulate transcription becoming available after processing
      transcription: null,
    });
  }),

  // Patient - Resources
  http.get(`${BASE}/patients/:id/resources`, () => {
    return mockJson(mockResources);
  }),

  // Patient - Submissions (populated with real summaries instead of empty array)
  http.get(`${BASE}/patients/:id/submissions`, () => {
    return mockJson([
      {
        id: 'sub-001',
        patientId: 'patient-001',
        source: 'CHECKIN',
        rawContent: JSON.stringify({ mood: 7, stress: 4, sleep: 8, focus: 6, anxiety: 3 }),
        status: 'PROCESSED',
        summary: 'Feeling better today. Mood improved, stress manageable.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'sub-002',
        patientId: 'patient-001',
        source: 'JOURNAL',
        rawContent: 'Today I practiced the breathing exercise...',
        status: 'PROCESSED',
        summary: 'Patient practiced breathing exercises and reported feeling more centered.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'sub-003',
        patientId: 'patient-001',
        source: 'CHECKIN',
        rawContent: JSON.stringify({ mood: 6, stress: 5, sleep: 7, focus: 5, anxiety: 4 }),
        status: 'PROCESSED',
        summary: 'Moderate day. Sleep quality improving, stress slightly elevated.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'sub-004',
        patientId: 'patient-001',
        source: 'VOICE',
        rawContent: '',
        status: 'PROCESSED',
        summary: 'Voice memo about anxiety management techniques. Patient feels coping skills are improving.',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'sub-005',
        patientId: 'patient-001',
        source: 'JOURNAL',
        rawContent: 'I noticed I was catastrophizing...',
        status: 'PROCESSED',
        summary: 'Patient used cognitive restructuring to address catastrophizing about work presentation.',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ]);
  }),

  http.get(`${BASE}/patients/:id/submissions/:subId`, ({ params }) => {
    return mockJson({
      id: params.subId,
      patientId: 'patient-001',
      source: 'CHECKIN',
      rawContent: '{}',
      status: 'PROCESSED',
      createdAt: new Date().toISOString(),
    });
  }),

  http.get(`${BASE}/patients/:id/submissions/:subId/reflection`, ({ params }) => {
    return mockJson({
      id: `ref-${params.subId}`,
      submissionId: params.subId as string,
      summary: 'Patient shows improvement in mood metrics. Sleep quality trending upward.',
      patientSummary: 'You reported improved mood and sleep quality today.',
      clinicianSummary: 'Patient shows improvement in mood metrics. Sleep quality trending upward.',
      signalBand: 'LOW',
      evidence: ['Mood score 7/10', 'Sleep quality 8/10', 'Stress decreased from 6 to 4'],
      unknowns: ['Social activity level not assessed'],
      createdAt: new Date().toISOString(),
    });
  }),

  // Patient - Settings
  http.get(`${BASE}/patients/:id/settings`, () => {
    return mockJson(mockSettings);
  }),

  http.patch(`${BASE}/patients/:id/settings`, async ({ request }) => {
    const body = await request.json() as Partial<PatientSettings>;
    return mockJson({ ...mockSettings, ...body });
  }),

  // Patient - Data Export (HIPAA Right of Access)
  http.get(`${BASE}/patients/:id/data-export`, ({ params }) => {
    return mockJson({
      profile: { id: params.id, firstName: 'Alex', lastName: 'Rivera', dateOfBirth: '1990-03-15' },
      checkins: [
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), mood: 7, stress: 4, anxiety: 3, sleep: 8, focus: 6 },
        { date: new Date(Date.now() - 86400000).toISOString(), mood: 8, stress: 3, anxiety: 2, sleep: 7, focus: 7 },
      ],
      journals: [
        { date: new Date(Date.now() - 86400000).toISOString(), content: 'Feeling better today. Practiced mindfulness.' },
      ],
      safetyPlan: { warningSign: 'Withdrawal', copingStrategy: 'Deep breathing', emergencyContact: '988' },
      auditLog: [
        { action: 'LOGIN', timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1' },
        { action: 'DATA_EXPORT', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
      ],
    });
  }),

  // Patient - Account Deletion (HIPAA Right to Erasure)
  http.delete(`${BASE}/patients/:id/account`, () => {
    return mockJson({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  }),

  // Patient - Consent
  http.get(`${BASE}/patients/:id/consent`, () => {
    return mockJson([
      {
        id: 'consent-001',
        patientId: 'patient-001',
        type: 'TREATMENT',
        version: '2.1',
        acceptedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        content: 'Treatment consent for behavioral health services.',
      },
      {
        id: 'consent-002',
        patientId: 'patient-001',
        type: 'DATA_SHARING',
        version: '1.3',
        acceptedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        content: 'Consent for data sharing with care team.',
      },
    ]);
  }),

  http.post(`${BASE}/patients/:id/consent`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return mockJson({
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
    return mockJson(response);
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
          name: 'Alex Rivera',
          lastContact: new Date().toISOString(),
          signalBand: 'LOW' as const,
          adherenceRate: 92,
          patientId: 'patient-001',
          patient: {
            id: 'patient-001',
            user: { firstName: 'Alex', lastName: 'Rivera' },
            triageItems: [{ id: 't1', patientId: 'patient-001', signalBand: 'LOW' as const, status: 'RESOLVED' as const, summary: '', source: 'CHECKIN' as const, createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date().toISOString() }],
          },
        },
        {
          id: 'cp-002',
          name: 'Jordan Lee',
          lastContact: new Date(Date.now() - 86400000).toISOString(),
          signalBand: 'MODERATE' as const,
          adherenceRate: 78,
          patientId: 'patient-002',
          patient: {
            id: 'patient-002',
            user: { firstName: 'Jordan', lastName: 'Lee' },
            triageItems: [{ id: 't2', patientId: 'patient-002', signalBand: 'MODERATE' as const, status: 'NEW' as const, summary: 'Elevated stress indicators', source: 'CHECKIN' as const, createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date(Date.now() - 86400000).toISOString() }],
          },
        },
        {
          id: 'cp-003',
          name: 'Sam Patel',
          lastContact: new Date(Date.now() - 2 * 86400000).toISOString(),
          signalBand: 'ELEVATED' as const,
          adherenceRate: 65,
          patientId: 'patient-003',
          patient: {
            id: 'patient-003',
            user: { firstName: 'Sam', lastName: 'Patel' },
            triageItems: [{ id: 't3', patientId: 'patient-003', signalBand: 'ELEVATED' as const, status: 'ACK' as const, summary: 'Crisis language detected in journal', source: 'JOURNAL' as const, createdAt: new Date().toISOString() }],
            submissions: [{ createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }],
          },
        },
      ],
    };
    return mockJson(response);
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
    return mockJson(response);
  }),

  http.get(`${BASE}/clinician/triage/:id`, ({ params }) => {
    return mockJson({
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
    return mockJson({
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
    return mockJson({
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
    return mockJson([
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
    return mockJson({
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
    return mockJson([
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
    return mockJson([
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
    return mockJson([
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
    return mockJson([
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
    return mockJson([
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
    return mockJson({
      id: `exp-${Date.now()}`,
      patientId: 'patient-001',
      profile: body.profile,
      status: 'QUEUED',
      format: 'PDF',
      requestedBy: 'Dr. Sarah Chen',
      createdAt: new Date().toISOString(),
    }, 201);
  }),

  // Clinician - Settings
  http.get(`${BASE}/clinician/settings`, () => {
    return mockJson({
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
    return mockJson(body);
  }),

  // Clinician - Patient checkins/journals
  http.get(`${BASE}/clinician/patients/:id/checkin`, () => {
    return mockJson(mockCheckins);
  }),

  http.get(`${BASE}/clinician/patients/:id/journal`, () => {
    return mockJson(mockJournals);
  }),

  // Recommendations / Memories / Plans patches
  // Return full objects so in-place state replacement doesn't lose fields
  http.patch(`${BASE}/clinician/patients/:id/recommendations/:recId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return mockJson({
      id: params.recId,
      patientId: params.id,
      type: 'treatment',
      title: 'Consider CBT Intensification',
      description: 'Based on 3-week mood trend, patient may benefit from increased CBT session frequency.',
      status: body.status,
      evidence: ['Mood trend: -1.2 avg over 3 weeks', 'Stress trend: +0.8 avg'],
      signalBand: 'GUARDED',
      createdAt: new Date().toISOString(),
    });
  }),

  http.patch(`${BASE}/clinician/patients/:id/memories/:memId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return mockJson({
      id: params.memId,
      patientId: params.id,
      category: 'coping',
      statement: 'Patient uses deep breathing (4-7-8 technique) as primary coping mechanism.',
      confidence: 'HIGH',
      conflictFlag: false,
      status: body.status,
      evidence: ['Mentioned in 3 journal entries', 'Referenced in check-in notes'],
      unknowns: [],
      auditTrail: 'Status updated by clinician',
      createdAt: new Date().toISOString(),
    });
  }),

  http.patch(`${BASE}/clinician/patients/:id/plans/:planId`, async ({ params, request }) => {
    const body = await request.json() as { status: string };
    return mockJson({
      id: params.planId,
      patientId: params.id,
      goal: 'Reduce anxiety symptoms by 30% within 8 weeks',
      intervention: 'Weekly CBT sessions + daily 4-7-8 breathing exercise',
      owner: 'Dr. Sarah Chen',
      targetDate: new Date(Date.now() + 56 * 86400000).toISOString(),
      status: body.status,
      evidence: ['Baseline GAD-7 score: 14', 'Current GAD-7 score: 10'],
      unknowns: ['Response to increased session frequency'],
      auditTrail: 'Status updated by clinician',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    });
  }),

  // ── Password Reset ──────────────────────────
  http.post(`${BASE}/auth/forgot-password`, async () => {
    return mockJson({ success: true });
  }),

  // ── Auth0 Sync ──────────────────────────────
  http.post(`${BASE}/auth/auth0-sync`, async ({ request }) => {
    const body = await request.json() as { auth0Id: string; email: string };
    currentSessionUser = { ...mockUser, email: body.email };
    const response: LoginResponse = {
      accessToken: 'mock-auth0-token-' + Date.now(),
      refreshToken: 'mock-auth0-refresh-' + Date.now(),
      user: currentSessionUser,
    };
    return mockJson(response);
  }),

  // ── Reset Password (consume reset code) ─────
  http.post(`${BASE}/auth/reset-password`, async () => {
    return mockJson({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    });
  }),

  // ── Change Password (authenticated) ─────────
  http.post(`${BASE}/auth/change-password`, async () => {
    return mockJson({
      success: true,
      message: 'Password changed successfully. All other sessions have been signed out.',
      accessToken: 'mock-new-access-token-' + Date.now(),
      refreshToken: 'mock-new-refresh-token-' + Date.now(),
    });
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
    return mockJson(scores);
  }),

  http.post(`${BASE}/clinician/patients/:id/mbc`, async ({ params, request }) => {
    const body = await request.json() as { instrument: string; score: number; items: number[] };
    return mockJson({
      id: `mbc-${Date.now()}`,
      patientId: params.id,
      ...body,
      administeredAt: new Date().toISOString(),
      administeredBy: 'Dr. Sarah Chen',
    }, 201);
  }),

  // ── Session Notes ───────────────────────────
  http.get(`${BASE}/clinician/patients/:id/session-notes`, () => {
    return mockJson([
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
    return mockJson({
      id: `note-${Date.now()}`,
      patientId: params.id,
      ...body,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    }, 201);
  }),

  http.post(`${BASE}/clinician/patients/:id/session-notes/:noteId/sign`, ({ params }) => {
    return mockJson({
      id: params.noteId,
      patientId: params.id,
      status: 'SIGNED',
      signedBy: 'Dr. Sarah Chen',
      signedAt: new Date().toISOString(),
    });
  }),

  // ── Adherence ───────────────────────────────
  http.get(`${BASE}/clinician/patients/:id/adherence`, () => {
    return mockJson([
      { id: 'adh-001', patientId: 'patient-001', category: 'MEDICATION', title: 'Sertraline 50mg', description: 'Daily SSRI', status: 'COMPLIANT', frequency: 'Daily', lastLoggedAt: new Date().toISOString(), adherenceRate: 92, createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'adh-002', patientId: 'patient-001', category: 'EXERCISE', title: 'Morning Walk', description: '30min walk', status: 'PARTIAL', frequency: '5x/week', lastLoggedAt: new Date(Date.now() - 86400000).toISOString(), adherenceRate: 68, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'adh-003', patientId: 'patient-001', category: 'HOMEWORK', title: 'CBT Thought Record', description: 'Complete thought record when anxious', status: 'COMPLIANT', frequency: '3x/week', lastLoggedAt: new Date(Date.now() - 2 * 86400000).toISOString(), adherenceRate: 85, createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
      { id: 'adh-004', patientId: 'patient-001', category: 'APPOINTMENT', title: 'Therapy Sessions', description: 'Weekly therapy', status: 'COMPLIANT', frequency: 'Weekly', lastLoggedAt: new Date(Date.now() - 5 * 86400000).toISOString(), adherenceRate: 100, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
      { id: 'adh-005', patientId: 'patient-001', category: 'OTHER', title: 'Sleep Hygiene', description: 'No screens 1hr before bed', status: 'NON_COMPLIANT', frequency: 'Daily', adherenceRate: 35, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    ]);
  }),

  http.patch(`${BASE}/clinician/patients/:id/adherence/:itemId`, async ({ params, request }) => {
    const body = await request.json() as { status: string; notes?: string };
    return mockJson({
      id: params.itemId,
      patientId: params.id,
      status: body.status,
      notes: body.notes,
      lastLoggedAt: new Date().toISOString(),
    });
  }),

  // ── Escalations ─────────────────────────────
  http.get(`${BASE}/clinician/escalations`, () => {
    return mockJson([
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
    return mockJson({
      id: params.id,
      status: body.status,
      ...(body.status === 'ACKNOWLEDGED' ? { acknowledgedAt: new Date().toISOString() } : {}),
      ...(body.status === 'RESOLVED' ? { resolvedAt: new Date().toISOString(), resolution: body.resolution } : {}),
    });
  }),

  // ── Analytics ───────────────────────────────
  http.get(`${BASE}/clinician/analytics`, () => {
    return mockJson({
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
      return mockJson({ message: 'Invalid password' }, 401);
    }
    // Mock: accept any password, return elevated token
    return mockJson({
      elevatedToken: `elevated-${crypto.randomUUID()}`,
    });
  }),

  http.post(`${BASE}/auth/step-up/mfa`, async ({ request }) => {
    const body = await request.json() as { code: string };
    if (body.code !== '123456') {
      return mockJson({ message: 'Invalid MFA code' }, 401);
    }
    return mockJson({
      elevatedToken: `elevated-mfa-${crypto.randomUUID()}`,
    });
  }),

  // ── MFA Enrollment ────────────────────────
  http.post(`${BASE}/auth/mfa-setup`, () => {
    // QR code is rendered client-side via qrcode.react from the secret;
    // qrCodeDataUrl kept for API shape parity but not used by the UI.
    const email = currentSessionUser?.email ?? 'user@peacefull.ai';
    const secret = 'JBSWY3DPEHPK3PXP';
    const totpUri = `otpauth://totp/Peacefull:${encodeURIComponent(email)}?secret=${secret}&issuer=Peacefull`;
    return mockJson({
      qrCodeDataUrl: totpUri,   // production backend returns a data-URL PNG; demo returns the URI
      secret,
    });
  }),

  http.post(`${BASE}/auth/mfa-confirm-setup`, async ({ request }) => {
    const body = await request.json() as { code: string };
    if (body.code.length !== 6) {
      return mockJson({ message: 'Invalid code' }, 400);
    }
    // Mark user as MFA-enrolled so subsequent auth/me calls reflect it
    if (currentSessionUser) {
      currentSessionUser = { ...currentSessionUser, mfaEnabled: true };
    }
    return mockJson({
      backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012', 'MNOP-3456', 'QRST-7890'],
    });
  }),

  // ── Organizations ─────────────────────────
  http.get(`${BASE}/organizations`, () => {
    return mockJson({
      organizations: [
        {
          id: 'org-001',
          tenantId: 'tenant-001',
          name: 'Demo Clinic',
          slug: 'demo-clinic',
          npi: '1234567890',
          phone: '(555) 123-4567',
          website: 'https://democlinic.example.com',
          settings: {},
          createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          role: 'OWNER',
          joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
          _count: { memberships: 5 },
        },
      ],
    });
  }),

  http.post(`${BASE}/organizations`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return mockJson({
      id: `org-${Date.now()}`,
      tenantId: 'tenant-001',
      slug: String(body.name ?? 'new-org').toLowerCase().replace(/\s+/g, '-'),
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    }, 201);
  }),

  http.get(`${BASE}/organizations/:orgId`, ({ params }) => {
    return mockJson({
      id: params.orgId,
      tenantId: 'tenant-001',
      name: 'Demo Clinic',
      slug: 'demo-clinic',
      npi: '1234567890',
      phone: '(555) 123-4567',
      settings: {},
      createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      memberships: [
        {
          id: 'mem-001',
          orgId: params.orgId,
          userId: 'clinician-001',
          role: 'OWNER',
          joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
          user: { id: 'clinician-001', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', role: 'CLINICIAN', status: 'ACTIVE' },
        },
      ],
    });
  }),

  http.get(`${BASE}/organizations/:orgId/members`, ({ params }) => {
    return mockJson({
      members: [
        {
          id: 'mem-001',
          orgId: params.orgId as string,
          userId: 'clinician-001',
          role: 'OWNER',
          joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
          user: { id: 'clinician-001', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', role: 'CLINICIAN', status: 'ACTIVE' },
        },
      ],
    });
  }),

  http.post(`${BASE}/organizations/:orgId/invite`, async ({ params, request }) => {
    const body = await request.json() as { email: string; role?: string };
    return mockJson({
      invitation: {
        id: `inv-${Date.now()}`,
        orgId: params.orgId,
        email: body.email,
        role: body.role ?? 'MEMBER',
        token: crypto.randomUUID(),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        inviter: { firstName: 'Sarah', lastName: 'Chen' },
      },
    }, 201);
  }),

  http.get(`${BASE}/organizations/:orgId/invitations`, () => {
    return mockJson({ invitations: [] });
  }),

  http.get(`${BASE}/organizations/invitations/:token`, () => {
    return mockJson({
      email: 'invited@example.com',
      role: 'MEMBER',
      organizationName: 'Demo Clinic',
      organizationSlug: 'demo-clinic',
      inviterName: 'Dr. Sarah Chen',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  }),

  http.post(`${BASE}/organizations/invitations/:token/accept`, async () => {
    return mockJson({ success: true, redirectTo: '/clinician/caseload' });
  }),

  // ── Patient by ID ─────────────────────────
  http.get(`${BASE}/patients/:id`, ({ params }) => {
    return mockJson({
      id: params.id,
      userId: params.id,
      firstName: 'Alex',
      lastName: 'Rivera',
      dateOfBirth: '1990-03-15',
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    });
  }),

  // ── Tenants ───────────────────────────────
  http.get(`${BASE}/auth/tenants`, () => {
    return mockJson({
      tenants: [
        { id: 'tenant-001', slug: 'demo-clinic', name: 'Demo Clinic', primaryColor: '#6C5CE7' },
        { id: 'tenant-002', slug: 'wellness-center', name: 'Wellness Center', primaryColor: '#00B4D8' },
        { id: 'tenant-003', slug: 'behavioral-health', name: 'Behavioral Health Associates', primaryColor: '#10B981' },
      ],
    });
  }),
];
