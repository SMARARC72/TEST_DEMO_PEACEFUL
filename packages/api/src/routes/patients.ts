// ─── Patient Routes ──────────────────────────────────────────────────
// Endpoints for patient-facing data: submissions, journals, check-ins,
// voice memos, session prep, progress, safety plan, memories, and history.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import type {
  Patient,
  PatientSubmission,
  CheckinData,
  JournalEntry,
  VoiceMemo,
  SessionPrep,
  ProgressData,
  SafetyPlan,
  PatientMemory,
} from '@peacefull/shared';
import {
  SignalBand,
  SubmissionSource,
  SubmissionStatus,
  MemoryStatus,
  UserRole,
} from '@peacefull/shared';

export const patientRouter = Router();

// All patient routes require authentication
patientRouter.use(authenticate);
patientRouter.use(requireRole(UserRole.PATIENT, UserRole.CLINICIAN, UserRole.SUPERVISOR));

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_PATIENT: Patient = {
  id: 'p1000000-0000-0000-0000-000000000001',
  tenantId: 't1000000-0000-0000-0000-000000000001',
  name: 'Alex Rivera',
  age: 34,
  pronouns: 'they/them',
  language: 'en',
  emergencyContact: {
    name: 'Jordan Rivera',
    phone: '+15559876543',
    relationship: 'Sibling',
  },
  diagnosis: { primary: 'Major Depressive Disorder, Recurrent', code: 'F33.1' },
  treatmentStart: '2025-06-15T00:00:00.000Z',
  medications: [
    { name: 'Sertraline', dosage: '100mg', frequency: 'Daily' },
    { name: 'Hydroxyzine', dosage: '25mg', frequency: 'As needed' },
  ],
  allergies: ['Penicillin'],
  careTeam: [
    { name: 'Dr. Sarah Chen', role: 'Primary Therapist' },
    { name: 'Dr. James Park', role: 'Psychiatrist' },
  ],
  preferences: { notifications: true, language: 'en', theme: 'calm-blue' },
};

const MOCK_SUBMISSIONS: PatientSubmission[] = [
  {
    id: 's1000000-0000-0000-0000-000000000001',
    patientId: MOCK_PATIENT.id,
    tenantId: MOCK_PATIENT.tenantId,
    source: SubmissionSource.JOURNAL,
    status: SubmissionStatus.READY,
    rawContent: 'Had a difficult day at work. Felt overwhelmed by deadlines and struggled to focus. Went for a walk which helped a bit.',
    patientReport: {
      tone: 'supportive',
      summary: 'It sounds like today was challenging, especially with work pressures. It\'s great that you recognized going for a walk helped.',
      nextStep: 'Consider trying a 5-minute breathing exercise before your next work session.',
    },
    clinicianReport: {
      signalBand: SignalBand.GUARDED,
      summary: 'Patient reports work-related stress impacting concentration. Utilized adaptive coping (walking). No safety concerns noted.',
      evidence: ['overwhelmed by deadlines', 'struggled to focus', 'walk helped'],
      unknowns: ['Sleep quality not mentioned', 'Medication adherence unclear'],
    },
    createdAt: '2025-12-10T14:30:00.000Z',
    updatedAt: '2025-12-10T14:35:00.000Z',
  },
  {
    id: 's1000000-0000-0000-0000-000000000002',
    patientId: MOCK_PATIENT.id,
    tenantId: MOCK_PATIENT.tenantId,
    source: SubmissionSource.CHECKIN,
    status: SubmissionStatus.REVIEWED,
    rawContent: 'mood: 6, stress: 7, sleep: 5, focus: 4',
    patientReport: {
      tone: 'encouraging',
      summary: 'Your mood is holding steady. Sleep and focus could use some attention — small improvements there can make a big difference.',
      nextStep: 'Try winding down 30 minutes earlier tonight.',
    },
    clinicianReport: {
      signalBand: SignalBand.MODERATE,
      summary: 'Elevated stress (7/10) with reduced sleep (5/10) and focus (4/10). Mood stable at 6/10. Pattern warrants monitoring.',
      evidence: ['stress: 7/10', 'sleep: 5/10', 'focus: 4/10'],
      unknowns: ['Duration of sleep impairment'],
    },
    createdAt: '2025-12-09T09:00:00.000Z',
    updatedAt: '2025-12-09T09:05:00.000Z',
  },
];

const MOCK_SESSION_PREP: SessionPrep = {
  date: '2025-12-15',
  time: '10:00',
  duration: 50,
  format: 'Video',
  therapistId: 'c1000000-0000-0000-0000-000000000001',
  topics: ['Work stress management', 'Sleep hygiene', 'Coping strategy review'],
  customTopics: [],
  goals: ['Reduce workplace overwhelm', 'Improve sleep consistency'],
  previousSummary: 'Last session focused on identifying cognitive distortions related to work performance.',
};

const MOCK_PROGRESS: ProgressData = {
  streak: 12,
  xp: 2450,
  level: 5,
  levelName: 'Mindful Explorer',
  badges: [
    { name: 'First Journal', earnedAt: '2025-06-20T00:00:00.000Z', icon: '📝' },
    { name: 'Week Streak', earnedAt: '2025-07-01T00:00:00.000Z', icon: '🔥' },
    { name: 'Voice Pioneer', earnedAt: '2025-08-15T00:00:00.000Z', icon: '🎙️' },
  ],
  weeklyMood: [6, 5, 7, 6, 5, 6, 7],
  milestones: [
    { title: '30-Day Streak', date: '2025-07-15', achieved: true },
    { title: 'Complete Safety Plan', date: '2025-06-25', achieved: true },
    { title: '100 Journal Entries', date: '', achieved: false },
  ],
};

const MOCK_SAFETY_PLAN: SafetyPlan = {
  id: 'sp1000000-0000-0000-0000-000000000001',
  patientId: MOCK_PATIENT.id,
  reviewedDate: '2025-11-01T00:00:00.000Z',
  steps: [
    {
      title: 'Warning Signs',
      items: ['Withdrawal from friends', 'Difficulty sleeping 3+ nights', 'Loss of appetite'],
    },
    {
      title: 'Internal Coping Strategies',
      items: ['Deep breathing (4-7-8)', 'Walking outside', 'Journaling'],
    },
    {
      title: 'People & Places for Distraction',
      items: ['Call Jordan (sibling)', 'Visit the park', 'Watch comfort show'],
    },
    {
      title: 'Professional Contacts',
      items: ['Dr. Sarah Chen: (555) 123-4567', 'Crisis Line: 988'],
    },
  ],
  version: 2,
};

const MOCK_MEMORIES: PatientMemory[] = [
  {
    id: 'm1000000-0000-0000-0000-000000000001',
    patientId: MOCK_PATIENT.id,
    strategy: 'Walking helps when feeling overwhelmed',
    category: 'COPING_STRATEGY',
    description: 'Patient finds outdoor walks effective for reducing acute stress episodes',
    approvedBy: 'c1000000-0000-0000-0000-000000000001',
    approvedDate: '2025-10-15T00:00:00.000Z',
    status: MemoryStatus.APPROVED,
  },
  {
    id: 'm1000000-0000-0000-0000-000000000002',
    patientId: MOCK_PATIENT.id,
    strategy: 'Deadline pressure is a primary stressor',
    category: 'TRIGGER',
    description: 'Work deadlines consistently trigger stress and focus difficulties',
    approvedBy: 'c1000000-0000-0000-0000-000000000001',
    approvedDate: '2025-10-20T00:00:00.000Z',
    status: MemoryStatus.APPROVED,
  },
];

// ─── GET /:id ────────────────────────────────────────────────────────

patientRouter.get('/:id', (req, res, next) => {
  try {
    if (req.params.id !== MOCK_PATIENT.id) {
      throw new AppError('Patient not found', 404);
    }
    res.json(MOCK_PATIENT);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id ────────────────────────────────────────────────────────

patientRouter.put('/:id', (req, res, next) => {
  try {
    if (req.params.id !== MOCK_PATIENT.id) {
      throw new AppError('Patient not found', 404);
    }
    const updated = { ...MOCK_PATIENT, ...req.body, id: MOCK_PATIENT.id };
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/submissions ──────────────────────────────────────────

const createSubmissionSchema = z.object({
  source: z.enum(['JOURNAL', 'CHECKIN', 'VOICE_MEMO']),
  rawContent: z.string().min(1).max(50_000),
});

patientRouter.post('/:id/submissions', (req, res, next) => {
  try {
    const body = createSubmissionSchema.parse(req.body);
    const submission: PatientSubmission = {
      id: uuidv4(),
      patientId: req.params.id,
      tenantId: req.user!.tid,
      source: body.source as SubmissionSource,
      status: SubmissionStatus.PENDING,
      rawContent: body.rawContent,
      patientReport: { tone: 'pending', summary: 'Processing…', nextStep: '' },
      clinicianReport: {
        signalBand: SignalBand.LOW,
        summary: 'Pending AI analysis',
        evidence: [],
        unknowns: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions ───────────────────────────────────────────

patientRouter.get('/:id/submissions', (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const items = MOCK_SUBMISSIONS.filter((s) => s.patientId === req.params.id);
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);
    res.json({ data: paginated, page, limit, total });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions/:subId ────────────────────────────────────

patientRouter.get('/:id/submissions/:subId', (req, res, next) => {
  try {
    const sub = MOCK_SUBMISSIONS.find(
      (s) => s.id === req.params.subId && s.patientId === req.params.id,
    );
    if (!sub) throw new AppError('Submission not found', 404);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/session-prep ──────────────────────────────────────────

patientRouter.get('/:id/session-prep', (_req, res) => {
  res.json(MOCK_SESSION_PREP);
});

// ─── PUT /:id/session-prep ──────────────────────────────────────────

patientRouter.put('/:id/session-prep', (req, res) => {
  const updated = { ...MOCK_SESSION_PREP, ...req.body };
  res.json(updated);
});

// ─── GET /:id/progress ──────────────────────────────────────────────

patientRouter.get('/:id/progress', (_req, res) => {
  res.json(MOCK_PROGRESS);
});

// ─── GET /:id/safety-plan ───────────────────────────────────────────

patientRouter.get('/:id/safety-plan', (_req, res) => {
  res.json(MOCK_SAFETY_PLAN);
});

// ─── PUT /:id/safety-plan ───────────────────────────────────────────

patientRouter.put('/:id/safety-plan', (req, res) => {
  const updated = { ...MOCK_SAFETY_PLAN, ...req.body, id: MOCK_SAFETY_PLAN.id };
  res.json(updated);
});

// ─── GET /:id/memories ──────────────────────────────────────────────

patientRouter.get('/:id/memories', (req, res) => {
  const memories = MOCK_MEMORIES.filter(
    (m) => m.patientId === req.params.id && m.status === MemoryStatus.APPROVED,
  );
  res.json(memories);
});

// ─── GET /:id/history ───────────────────────────────────────────────

patientRouter.get('/:id/history', (req, res) => {
  const timeline = [
    { type: 'journal', date: '2025-12-10T14:30:00.000Z', summary: 'Journaled about work stress' },
    { type: 'checkin', date: '2025-12-09T09:00:00.000Z', summary: 'Daily check-in completed' },
    { type: 'session', date: '2025-12-08T10:00:00.000Z', summary: 'Therapy session with Dr. Chen' },
    { type: 'voice', date: '2025-12-07T20:15:00.000Z', summary: 'Voice memo: evening reflection' },
    { type: 'milestone', date: '2025-12-05T00:00:00.000Z', summary: 'Achieved 10-day streak' },
  ];
  res.json({ patientId: req.params.id, timeline });
});

// ─── GET /:id/resources ─────────────────────────────────────────────

patientRouter.get('/:id/resources', (_req, res) => {
  res.json({
    copingStrategies: [
      { name: '4-7-8 Breathing', category: 'Breathing', duration: '5 min' },
      { name: 'Progressive Muscle Relaxation', category: 'Body', duration: '15 min' },
      { name: 'Grounding Exercise (5-4-3-2-1)', category: 'Grounding', duration: '3 min' },
    ],
    emergencyContacts: [
      { name: '988 Suicide & Crisis Lifeline', phone: '988', available: '24/7' },
      { name: 'Crisis Text Line', phone: 'Text HOME to 741741', available: '24/7' },
    ],
  });
});

// ─── POST /:id/checkin ──────────────────────────────────────────────

const checkinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  sleep: z.number().int().min(1).max(10),
  focus: z.number().int().min(1).max(10),
  notes: z.string().max(2000).optional(),
});

patientRouter.post('/:id/checkin', (req, res, next) => {
  try {
    const body = checkinSchema.parse(req.body);
    const checkin: CheckinData & { id: string; patientId: string; createdAt: string } = {
      ...body,
      id: uuidv4(),
      patientId: req.params.id,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(checkin);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/journal ─────────────────────────────────────────────

const journalSchema = z.object({
  content: z.string().min(1).max(50_000),
  promptId: z.string().optional(),
  category: z.string().default('free-form'),
});

patientRouter.post('/:id/journal', (req, res, next) => {
  try {
    const body = journalSchema.parse(req.body);
    const entry: JournalEntry = {
      id: uuidv4(),
      patientId: req.params.id,
      content: body.content,
      promptId: body.promptId,
      category: body.category,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/voice ────────────────────────────────────────────────

patientRouter.post('/:id/voice', (req, res, next) => {
  try {
    // In production this would handle multipart upload to S3
    const memo: VoiceMemo = {
      id: uuidv4(),
      patientId: req.params.id,
      audioUrl: `https://s3.amazonaws.com/peacefull-uploads/voice/${uuidv4()}.webm`,
      transcription: 'Transcription pending…',
      duration: 0,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(memo);
  } catch (err) {
    next(err);
  }
});
