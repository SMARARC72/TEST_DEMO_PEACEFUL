import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ─── Deterministic UUIDs for cross-referencing ──────────────
const TENANT_ID = '10000000-0000-4000-8000-000000000001';

// Clinician user IDs
const USER_CHEN_ID     = '20000000-0000-4000-8000-000000000001';
const USER_WILSON_ID   = '20000000-0000-4000-8000-000000000002';
const USER_RODRIGUEZ_ID = '20000000-0000-4000-8000-000000000003';

// Patient user IDs
const USER_MARIA_ID  = '30000000-0000-4000-8000-000000000001';
const USER_JAMES_ID  = '30000000-0000-4000-8000-000000000002';
const USER_EMMA_ID   = '30000000-0000-4000-8000-000000000003';

// Clinician profile IDs
const CLINICIAN_CHEN_ID     = '40000000-0000-4000-8000-000000000001';
const CLINICIAN_WILSON_ID   = '40000000-0000-4000-8000-000000000002';
const CLINICIAN_RODRIGUEZ_ID = '40000000-0000-4000-8000-000000000003';

// Patient profile IDs
const PATIENT_MARIA_ID = '50000000-0000-4000-8000-000000000001';
const PATIENT_JAMES_ID = '50000000-0000-4000-8000-000000000002';
const PATIENT_EMMA_ID  = '50000000-0000-4000-8000-000000000003';

// Submission IDs (for triage FK)
const SUB_MARIA_ID = '60000000-0000-4000-8000-000000000001';
const SUB_EMMA_ID  = '60000000-0000-4000-8000-000000000002';
const SUB_ALEX_ID  = '60000000-0000-4000-8000-000000000003'; // maps to James in DB (Alex Kim → James Chen in MVP)

// ─── Utility: audit log hash chain ──────────────────
function auditHash(action: string, resource: string, previousHash: string | null): string {
  const payload = `${action}|${resource}|${previousHash || 'GENESIS'}|${Date.now()}`;
  return createHash('sha256').update(payload).digest('hex');
}

async function main() {
  console.log('🌱 Seeding Peacefull.ai MVP database...\n');

  const passwordHash = await bcrypt.hash('Demo2026!', 12);

  // ═══════════════════════════════════════════════════
  // 1. TENANT
  // ═══════════════════════════════════════════════════
  console.log('  → Creating tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'peacefull' },
    update: {
      name: 'Demo Clinic',
      domain: 'peacefull.cloud',
      settings: {
        timezone: 'America/Los_Angeles',
        defaultLanguage: 'en',
        features: ['mbc', 'memory', 'escalation', 'chat', 'adherence'],
      },
    },
    create: {
      id: TENANT_ID,
      name: 'Demo Clinic',
      slug: 'peacefull',
      domain: 'peacefull.cloud',
      plan: 'PILOT',
      ssoEnabled: false,
      scimEnabled: false,
      settings: {
        timezone: 'America/Los_Angeles',
        defaultLanguage: 'en',
        features: ['mbc', 'memory', 'escalation', 'chat', 'adherence'],
      },
    },
  });

  // ═══════════════════════════════════════════════════
  // 2. CLINICIAN USER ACCOUNTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating clinician users...');
  const clinicianUsers = [
    {
      id: USER_CHEN_ID,
      email: 'pilot.clinician.1@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Clinician-1',
      role: 'CLINICIAN' as const,
      phone: '555-0300',
    },
    {
      id: USER_WILSON_ID,
      email: 'pilot.supervisor@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Supervisor',
      role: 'SUPERVISOR' as const,
      phone: '555-0301',
    },
    {
      id: USER_RODRIGUEZ_ID,
      email: 'pilot.clinician.2@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Clinician-2',
      role: 'CLINICIAN' as const,
      phone: '555-0302',
    },
  ];

  for (const u of clinicianUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: u.email } },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        passwordHash,
        role: u.role,
        status: 'ACTIVE',
      },
      create: {
        id: u.id,
        tenantId: TENANT_ID,
        email: u.email,
        passwordHash,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        lastLogin: new Date('2026-02-28T08:00:00Z'),
        status: 'ACTIVE',
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 3. PATIENT USER ACCOUNTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating patient users...');
  const patientUsers = [
    { id: USER_MARIA_ID, email: 'test.patient.1@peacefull.cloud', firstName: 'Test', lastName: 'Patient-1' },
    { id: USER_JAMES_ID, email: 'test.patient.2@peacefull.cloud', firstName: 'Test', lastName: 'Patient-2' },
    { id: USER_EMMA_ID, email: 'test.patient.3@peacefull.cloud', firstName: 'Test', lastName: 'Patient-3' },
  ];

  for (const u of patientUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: u.email } },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: u.id,
        tenantId: TENANT_ID,
        email: u.email,
        passwordHash,
        role: 'PATIENT',
        firstName: u.firstName,
        lastName: u.lastName,
        mfaEnabled: false,
        status: 'ACTIVE',
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 4. CLINICIAN PROFILES
  // ═══════════════════════════════════════════════════
  console.log('  → Creating clinician profiles...');
  const clinicians = [
    {
      id: CLINICIAN_CHEN_ID,
      userId: USER_CHEN_ID,
      credentials: 'PhD, Licensed Clinical Psychologist',
      specialty: 'Anxiety, ADHD, Depression, Trauma-Informed Care',
      npi: '1234567890',
      caseloadSize: 24,
    },
    {
      id: CLINICIAN_WILSON_ID,
      userId: USER_WILSON_ID,
      credentials: 'PsyD, Licensed Clinical Psychologist',
      specialty: 'Supervision, Clinical Oversight, CBT',
      npi: '1234567891',
      caseloadSize: 12,
    },
    {
      id: CLINICIAN_RODRIGUEZ_ID,
      userId: USER_RODRIGUEZ_ID,
      credentials: 'MD, Board Certified Psychiatrist',
      specialty: 'Psychopharmacology, Mood Disorders',
      npi: '1234567892',
      caseloadSize: 30,
    },
  ];

  for (const c of clinicians) {
    await prisma.clinician.upsert({
      where: { userId: c.userId },
      update: {},
      create: c,
    });
  }

  // ═══════════════════════════════════════════════════
  // 5. PATIENT PROFILES (matching baselinePatientProfiles)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating patient profiles...');

  // Maria Santos (maps to "Maria Rodriguez" in demo state)
  await prisma.patient.upsert({
    where: { userId: USER_MARIA_ID },
    update: {},
    create: {
      id: PATIENT_MARIA_ID,
      userId: USER_MARIA_ID,
      tenantId: TENANT_ID,
      age: 34,
      pronouns: 'she/her',
      language: 'English',
      emergencyName: 'Carmen Rodriguez (Mother)',
      emergencyPhone: '555-0142',
      emergencyRel: 'Mother',
      diagnosisPrimary: 'Generalized Anxiety Disorder',
      diagnosisCode: 'F41.1',
      treatmentStart: new Date('2025-11-01'),
      medications: ['Sertraline 50mg daily'],
      allergies: ['None reported'],
      preferences: {
        contact: 'In-app messaging',
        reminderTime: '8:00 PM',
        sessionAlert: '1 hour before',
      },
    },
  });

  // James Chen (maps to "James Smith" in demo state)
  await prisma.patient.upsert({
    where: { userId: USER_JAMES_ID },
    update: {},
    create: {
      id: PATIENT_JAMES_ID,
      userId: USER_JAMES_ID,
      tenantId: TENANT_ID,
      age: 28,
      pronouns: 'he/him',
      language: 'English',
      emergencyName: 'Robert Smith (Father)',
      emergencyPhone: '555-0198',
      emergencyRel: 'Father',
      diagnosisPrimary: 'ADHD + Generalized Anxiety',
      diagnosisCode: 'F90.0, F41.1',
      treatmentStart: new Date('2025-09-15'),
      medications: ['Methylphenidate 20mg daily', 'Buspirone 10mg daily'],
      allergies: ['Penicillin'],
      preferences: {
        contact: 'SMS + In-app',
        reminderTime: '9:00 AM',
        sessionAlert: '30 minutes before',
      },
    },
  });

  // Emma Thompson (maps to "Emma Wilson" in demo state)
  await prisma.patient.upsert({
    where: { userId: USER_EMMA_ID },
    update: {},
    create: {
      id: PATIENT_EMMA_ID,
      userId: USER_EMMA_ID,
      tenantId: TENANT_ID,
      age: 42,
      pronouns: 'she/her',
      language: 'English',
      emergencyName: 'David Wilson (Spouse)',
      emergencyPhone: '555-0234',
      emergencyRel: 'Spouse',
      diagnosisPrimary: 'Major Depressive Disorder (recurrent)',
      diagnosisCode: 'F33.1',
      treatmentStart: new Date('2025-10-01'),
      medications: ['Escitalopram 10mg daily'],
      allergies: ['None reported'],
      preferences: {
        contact: 'In-app messaging',
        reminderTime: '7:30 PM',
        sessionAlert: '1 hour before',
      },
    },
  });

  // ═══════════════════════════════════════════════════
  // 6. CARE TEAM ASSIGNMENTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating care team assignments...');
  const careTeamAssignments = [
    { patientId: PATIENT_MARIA_ID, clinicianId: CLINICIAN_CHEN_ID, role: 'Primary Therapist' },
    { patientId: PATIENT_MARIA_ID, clinicianId: CLINICIAN_RODRIGUEZ_ID, role: 'Psychiatrist' },
    { patientId: PATIENT_JAMES_ID, clinicianId: CLINICIAN_CHEN_ID, role: 'Primary Therapist' },
    { patientId: PATIENT_JAMES_ID, clinicianId: CLINICIAN_RODRIGUEZ_ID, role: 'Psychiatrist' },
    { patientId: PATIENT_EMMA_ID, clinicianId: CLINICIAN_CHEN_ID, role: 'Primary Therapist' },
    { patientId: PATIENT_EMMA_ID, clinicianId: CLINICIAN_RODRIGUEZ_ID, role: 'Psychiatrist' },
  ];

  for (const a of careTeamAssignments) {
    await prisma.careTeamAssignment.upsert({
      where: {
        patientId_clinicianId: {
          patientId: a.patientId,
          clinicianId: a.clinicianId,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        ...a,
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 7. SUBMISSIONS (needed for triage FK)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating submissions...');
  const submissions = [
    {
      id: SUB_MARIA_ID,
      patientId: PATIENT_MARIA_ID,
      source: 'JOURNAL' as const,
      status: 'READY' as const,
      rawContent: 'Described evening stress spike after commute with preserved coping intent. Tried breathing exercise.',
      patientTone: 'Reflective, stressed but coping',
      patientSummary: 'Evening anxiety after commute, using breathing techniques.',
      patientNextStep: 'Continue 4-6 breathing before bed tonight.',
      clinicianSignalBand: 'GUARDED' as const,
      clinicianSummary: 'Patient described elevated stress and fatigue with preserved engagement behavior.',
      clinicianEvidence: ['Journal segment #J-114', 'sentiment cue set #S-9'],
      clinicianUnknowns: ['Sleep quality detail missing', 'voice corroboration pending'],
      processedAt: new Date('2026-02-25T09:14:00Z'),
    },
    {
      id: SUB_EMMA_ID,
      patientId: PATIENT_EMMA_ID,
      source: 'VOICE_MEMO' as const,
      status: 'READY' as const,
      rawContent: 'Reported overwhelm and interrupted sleep; requested structured follow-up prompt.',
      audioUrl: 's3://peacefull-submissions/voice/emma-2026-02-25.wav',
      audioDuration: 135,
      patientTone: 'Tired, slightly overwhelmed',
      patientSummary: 'Feeling overwhelmed, sleep interrupted. Wants follow-up structure.',
      patientNextStep: 'Consider evening routine tonight.',
      clinicianSignalBand: 'MODERATE' as const,
      clinicianSummary: 'Reported overwhelm and interrupted sleep; requested structured follow-up prompt.',
      clinicianEvidence: ['Voice memo #V-31', 'Check-in trend #T-15'],
      clinicianUnknowns: ['Duration of sleep disruption unclear'],
      processedAt: new Date('2026-02-25T09:32:00Z'),
    },
    {
      id: SUB_ALEX_ID,
      patientId: PATIENT_JAMES_ID,
      source: 'JOURNAL' as const,
      status: 'READY' as const,
      rawContent: 'School-day routine disruption and rising anxiety language need clinician check.',
      patientTone: 'Anxious, frustrated',
      patientSummary: 'Routine disrupted, anxiety rising with deadline pressure.',
      patientNextStep: 'Use micro-task breakdown technique.',
      clinicianSignalBand: 'ELEVATED' as const,
      clinicianSummary: 'School-day routine disruption and rising anxiety language need clinician check.',
      clinicianEvidence: ['Journal segment #J-128', 'engagement drop signal'],
      clinicianUnknowns: ['Whether disruption is transient or pattern'],
      processedAt: new Date('2026-02-25T10:01:00Z'),
    },
  ];

  for (const s of submissions) {
    await prisma.submission.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // ═══════════════════════════════════════════════════
  // 8. TRIAGE ITEMS (matching baselineTriageQueue)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating triage items...');
  const triageItems = [
    {
      id: randomUUID(),
      submissionId: SUB_MARIA_ID,
      patientId: PATIENT_MARIA_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      signalBand: 'GUARDED' as const,
      summary: 'Described evening stress spike after commute with preserved coping intent.',
      status: 'ACK' as const,
    },
    {
      id: randomUUID(),
      submissionId: SUB_EMMA_ID,
      patientId: PATIENT_EMMA_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      signalBand: 'MODERATE' as const,
      summary: 'Reported overwhelm and interrupted sleep; requested structured follow-up prompt.',
      status: 'IN_REVIEW' as const,
    },
    {
      id: randomUUID(),
      submissionId: SUB_ALEX_ID,
      patientId: PATIENT_JAMES_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      signalBand: 'ELEVATED' as const,
      summary: 'School-day routine disruption and rising anxiety language need clinician check.',
      status: 'ESCALATED' as const,
    },
  ];

  for (const t of triageItems) {
    await prisma.triageItem.upsert({
      where: { submissionId: t.submissionId },
      update: {},
      create: t,
    });
  }

  // ═══════════════════════════════════════════════════
  // 9. AI DRAFTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating AI drafts...');
  const aiDrafts = [
    {
      patientId: PATIENT_MARIA_ID,
      submissionId: SUB_MARIA_ID,
      content: 'S: Patient reports evening anxiety persists but 4-6 breathing is helping. Work stress remains primary trigger.\nO: PHQ-9: 14 (moderate), GAD-7: 11 (moderate). Engagement rate: 78%.\nA: Anxiety remains moderate with positive response to coping strategies.\nP: Continue 4-6 breathing cadence. Introduce structured next-day planning.',
      format: 'SOAP' as const,
      status: 'DRAFT' as const,
      modelVersion: 'claude-sonnet-4-20250514',
      tokenUsage: { promptTokens: 1240, completionTokens: 340, totalTokens: 1580 },
    },
    {
      patientId: PATIENT_EMMA_ID,
      submissionId: SUB_EMMA_ID,
      content: 'S: Patient reports mood stabilization with consistent evening routine. Mild concern about relapse.\nO: PHQ-9: 6 (mild), GAD-7: 7 (mild). Engagement rate: 92%.\nA: Significant improvement in mood stability. Relapse prevention planning appropriate.\nP: Continue current routine. Begin return-to-work planning discussion.',
      format: 'SOAP' as const,
      status: 'DRAFT' as const,
      modelVersion: 'claude-sonnet-4-20250514',
      tokenUsage: { promptTokens: 1180, completionTokens: 290, totalTokens: 1470 },
    },
    {
      patientId: PATIENT_JAMES_ID,
      submissionId: SUB_ALEX_ID,
      content: 'S: Patient describes difficulty with task initiation and focus fragmentation. Micro-task approach showing promise.\nO: PHQ-9: 8 (mild), GAD-7: 13 (moderate). Engagement rate: 62%.\nA: ADHD management improving with behavioral strategies. Anxiety elevated during deadline periods.\nP: Continue micro-task breakdown. Increase timed reset frequency.',
      format: 'SOAP' as const,
      status: 'DRAFT' as const,
      modelVersion: 'claude-sonnet-4-20250514',
      tokenUsage: { promptTokens: 1320, completionTokens: 310, totalTokens: 1630 },
    },
  ];

  for (const d of aiDrafts) {
    await prisma.aIDraft.create({ data: { id: randomUUID(), ...d } });
  }

  // ═══════════════════════════════════════════════════
  // 10. MEMORY PROPOSALS (matching baselineMemoryItems)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating memory proposals...');
  const memoryProposals = [
    {
      patientId: PATIENT_MARIA_ID,
      category: 'Trigger',
      statement: 'Crowded commute increases evening anxiety.',
      confidence: 0.65,
      conflict: false,
      status: 'PROPOSED' as const,
      evidence: ['Journal #J-114', 'Voice #V-23'],
      existing: null,
      uncertainty: 'May vary by sleep quality.',
    },
    {
      patientId: PATIENT_EMMA_ID,
      category: 'Coping',
      statement: '4-6 breathing reduces panic escalation.',
      confidence: 0.9,
      conflict: true,
      status: 'CONFLICT_FLAGGED' as const,
      evidence: ['Check-in #C-87', 'Draft summary #D-44'],
      existing: 'Prior memory suggested object-grounding was preferred.',
      uncertainty: 'Both strategies may be useful in different contexts.',
    },
    {
      patientId: PATIENT_JAMES_ID,
      category: 'Engagement',
      statement: 'Morning check-ins are often missed on school commute days.',
      confidence: 0.65,
      conflict: false,
      status: 'PROPOSED' as const,
      evidence: ['Check-in trend #T-08', 'Portal inbox #I-12'],
      existing: null,
      uncertainty: 'Could include intermittent connectivity issues.',
    },
  ];

  for (const m of memoryProposals) {
    await prisma.memoryProposal.create({ data: { id: randomUUID(), ...m } });
  }

  // ═══════════════════════════════════════════════════
  // 11. TREATMENT PLANS (matching baselinePlanItems)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating treatment plans...');
  const treatmentPlans = [
    {
      patientId: PATIENT_MARIA_ID,
      goal: 'Reduce panic escalation events',
      intervention: 'Breathing cadence 4-6 + evening check-in reminder',
      owner: 'Clinician',
      target: '2 weeks',
      status: 'DRAFT' as const,
      evidence: ['Memory mem-2', 'Check-in trend #C-87'],
      uncertainty: 'May require alternate grounding method on high-stress commute days.',
    },
    {
      patientId: PATIENT_JAMES_ID,
      goal: 'Increase morning engagement consistency',
      intervention: 'School-day adaptive reminder with fallback text prompt',
      owner: 'Care Coordinator',
      target: '10 days',
      status: 'DRAFT' as const,
      evidence: ['Memory mem-3', 'Portal inbox #I-12'],
      uncertainty: 'Missed check-ins may include connectivity constraints.',
    },
    {
      patientId: PATIENT_EMMA_ID,
      goal: 'Stabilize between-session coping adherence',
      intervention: 'Structured coping preference review in next session',
      owner: 'Clinician',
      target: 'Next visit',
      status: 'HOLD' as const,
      evidence: ['Conflict memory mem-2', 'Draft summary #D-44'],
      uncertainty: 'Conflicting coping signals require clinician adjudication.',
    },
  ];

  for (const p of treatmentPlans) {
    await prisma.treatmentPlan.create({ data: { id: randomUUID(), ...p } });
  }

  // ═══════════════════════════════════════════════════
  // 12. MBC SCORES (matching baselineMBCScores)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating MBC scores...');
  const mbcScores = [
    { patientId: PATIENT_MARIA_ID, instrument: 'PHQ9' as const, score: 14, severity: 'Moderate', date: new Date('2026-02-25'), trend: 'UP' as const, priorScores: [10, 12, 14], clinicianNote: null },
    { patientId: PATIENT_MARIA_ID, instrument: 'GAD7' as const, score: 11, severity: 'Moderate', date: new Date('2026-02-25'), trend: 'STABLE' as const, priorScores: [12, 11, 11], clinicianNote: null },
    { patientId: PATIENT_JAMES_ID, instrument: 'PHQ9' as const, score: 8, severity: 'Mild', date: new Date('2026-02-24'), trend: 'DOWN' as const, priorScores: [12, 10, 8], clinicianNote: null },
    { patientId: PATIENT_JAMES_ID, instrument: 'GAD7' as const, score: 13, severity: 'Moderate', date: new Date('2026-02-24'), trend: 'UP' as const, priorScores: [9, 11, 13], clinicianNote: null },
    { patientId: PATIENT_EMMA_ID, instrument: 'PHQ9' as const, score: 6, severity: 'Mild', date: new Date('2026-02-26'), trend: 'DOWN' as const, priorScores: [11, 8, 6], clinicianNote: null },
    { patientId: PATIENT_EMMA_ID, instrument: 'GAD7' as const, score: 7, severity: 'Mild', date: new Date('2026-02-26'), trend: 'DOWN' as const, priorScores: [10, 9, 7], clinicianNote: null },
  ];

  for (const s of mbcScores) {
    await prisma.mBCScore.create({ data: { id: randomUUID(), ...s } });
  }

  // ═══════════════════════════════════════════════════
  // 13. ADHERENCE ITEMS (matching baselineAdherenceItems)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating adherence items...');
  const adherenceItems = [
    { patientId: PATIENT_MARIA_ID, task: 'Evening breathing exercise (4-6 cadence)', frequency: 'Daily', completed: 4, target: 7, streak: 2, lastLogged: new Date('2026-02-25T21:30:00Z'), status: 'PARTIAL' as const },
    { patientId: PATIENT_MARIA_ID, task: 'Mood journal entry', frequency: 'Daily', completed: 5, target: 7, streak: 3, lastLogged: new Date('2026-02-25T20:00:00Z'), status: 'ON_TRACK' as const },
    { patientId: PATIENT_JAMES_ID, task: 'Single-priority task planning', frequency: 'Daily', completed: 3, target: 7, streak: 0, lastLogged: new Date('2026-02-23T08:15:00Z'), status: 'AT_RISK' as const },
    { patientId: PATIENT_JAMES_ID, task: 'Timed reset prompt (5-min break)', frequency: '3x/day', completed: 8, target: 21, streak: 1, lastLogged: new Date('2026-02-25T14:00:00Z'), status: 'PARTIAL' as const },
    { patientId: PATIENT_EMMA_ID, task: 'Evening routine consistency', frequency: 'Daily', completed: 6, target: 7, streak: 5, lastLogged: new Date('2026-02-26T21:45:00Z'), status: 'ON_TRACK' as const },
    { patientId: PATIENT_EMMA_ID, task: 'Brief walk reset', frequency: '4x/week', completed: 3, target: 4, streak: 3, lastLogged: new Date('2026-02-26T12:30:00Z'), status: 'ON_TRACK' as const },
  ];

  for (const a of adherenceItems) {
    await prisma.adherenceItem.create({ data: { id: randomUUID(), ...a } });
  }

  // ═══════════════════════════════════════════════════
  // 14. ESCALATION ITEMS (matching baselineEscalationItems)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating escalation items...');
  const escalationItems = [
    {
      patientId: PATIENT_MARIA_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      tier: 'T2' as const,
      trigger: 'Hopelessness language detected in voice note',
      detectedAt: new Date('2026-02-25T09:15:00Z'),
      acknowledgedAt: null,
      resolvedAt: null,
      clinicianAction: null,
      status: 'OPEN' as const,
      auditTrail: [
        '2026-02-25 09:15 — System: T2 escalation triggered via NLP safety signal.',
        '2026-02-25 09:16 — System: Clinician notification dispatched.',
      ],
    },
    {
      patientId: PATIENT_JAMES_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      tier: 'T2' as const,
      trigger: 'Escalated anxiety language + missed check-ins (3 consecutive days)',
      detectedAt: new Date('2026-02-25T10:01:00Z'),
      acknowledgedAt: new Date('2026-02-25T10:08:00Z'),
      resolvedAt: null,
      clinicianAction: 'Outreach call scheduled',
      status: 'ACK' as const,
      auditTrail: [
        '2026-02-25 10:01 — System: T2 escalation triggered via engagement drop + language analysis.',
        '2026-02-25 10:08 — Dr. Chen: Acknowledged. Outreach call scheduled for today.',
      ],
    },
    {
      patientId: PATIENT_MARIA_ID,
      clinicianId: CLINICIAN_CHEN_ID,
      tier: 'T3' as const,
      trigger: 'Explicit self-harm ideation detected',
      detectedAt: new Date('2026-02-20T14:22:00Z'),
      acknowledgedAt: new Date('2026-02-20T14:23:00Z'),
      resolvedAt: new Date('2026-02-20T15:10:00Z'),
      clinicianAction: 'Safety plan reviewed, emergency contact notified, session moved up',
      status: 'RESOLVED' as const,
      auditTrail: [
        '2026-02-20 14:22 — System: T3 CRITICAL escalation triggered.',
        '2026-02-20 14:23 — Dr. Chen: Immediate acknowledgment.',
        '2026-02-20 14:30 — Dr. Chen: Safety plan reviewed with patient via call.',
        '2026-02-20 14:45 — System: Emergency contact notified per protocol.',
        '2026-02-20 15:10 — Dr. Chen: Resolved. Session moved to tomorrow AM.',
      ],
    },
  ];

  for (const e of escalationItems) {
    await prisma.escalationItem.create({ data: { id: randomUUID(), ...e } });
  }

  // ═══════════════════════════════════════════════════
  // 15. SESSION NOTES (matching baselineSessionNotes)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating session notes...');
  const sessionNotes = [
    {
      patientId: PATIENT_MARIA_ID,
      clinicianId: USER_CHEN_ID,
      date: new Date('2026-02-21'),
      format: 'SOAP',
      subjective: 'Patient reports evening anxiety persists but 4-6 breathing is helping. Work stress remains primary trigger.',
      objective: 'PHQ-9: 14 (moderate), GAD-7: 11 (moderate). Engagement rate: 78%. Adherence to breathing exercise: 57%.',
      assessment: 'Anxiety remains moderate with positive response to coping strategies. Sleep improving with evening routine.',
      plan: 'Continue 4-6 breathing cadence. Introduce structured next-day planning. Review sleep hygiene checklist. Follow-up in 1 week.',
      signed: false,
    },
    {
      patientId: PATIENT_JAMES_ID,
      clinicianId: USER_CHEN_ID,
      date: new Date('2026-02-22'),
      format: 'SOAP',
      subjective: 'Patient describes difficulty with task initiation and focus fragmentation. Micro-task approach showing promise.',
      objective: 'PHQ-9: 8 (mild), GAD-7: 13 (moderate). Engagement rate: 62%. Timed reset utilization: 38%.',
      assessment: 'ADHD management improving with behavioral strategies. Anxiety elevated during deadline periods.',
      plan: 'Continue micro-task breakdown. Increase timed reset frequency. Monitor GAD-7 trend. Follow-up in 1 week.',
      signed: false,
    },
    {
      patientId: PATIENT_EMMA_ID,
      clinicianId: USER_CHEN_ID,
      date: new Date('2026-02-23'),
      format: 'SOAP',
      subjective: 'Patient reports mood stabilization with consistent evening routine. Mild concern about relapse.',
      objective: 'PHQ-9: 6 (mild), GAD-7: 7 (mild). Engagement rate: 92%. Evening routine adherence: 85%.',
      assessment: 'Significant improvement in mood stability. Relapse prevention planning appropriate.',
      plan: 'Continue current routine. Begin return-to-work planning discussion. Assess readiness for reduced session frequency. Follow-up in 2 weeks.',
      signed: false,
    },
  ];

  for (const n of sessionNotes) {
    await prisma.sessionNote.create({ data: { id: randomUUID(), ...n } });
  }

  // ═══════════════════════════════════════════════════
  // 16. SAFETY PLANS (matching baselineSafetyPlan)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating safety plans...');
  const safetyPlans = [
    {
      patientId: PATIENT_MARIA_ID,
      reviewedDate: new Date('2026-02-21'),
      version: 1,
      steps: [
        { title: 'Warning Signs', items: ['Cannot stop negative thought loops', 'Feel physically tense for hours', 'Withdraw from family contact'] },
        { title: 'Internal Coping Strategies', items: ['4-6 breathing cadence', 'Go for a 10-minute walk', 'Write in journal'] },
        { title: 'People & Places That Distract', items: ['Call my sister Ana', 'Visit the bookstore', 'Watch a comfort show'] },
        { title: 'People I Can Ask for Help', items: ['Mom (Carmen) — 555-0142', 'Best friend (Sofia) — 555-0198', 'Neighbor (Mr. Park) — 555-0234'] },
        { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] },
        { title: 'Making My Environment Safe', items: ['Keep medications in locked cabinet', 'Remove triggers from workspace'] },
      ],
    },
    {
      patientId: PATIENT_JAMES_ID,
      reviewedDate: new Date('2026-02-22'),
      version: 1,
      steps: [
        { title: 'Warning Signs', items: ['Extreme frustration with tasks', 'Complete withdrawal from communication', 'Skipping meals for full day'] },
        { title: 'Internal Coping Strategies', items: ['5-minute micro-task', 'Brief walk outside', 'Listen to music playlist'] },
        { title: 'People & Places That Distract', items: ['Call my friend Marcus', 'Go to the gym', 'Play guitar'] },
        { title: 'People I Can Ask for Help', items: ['Dad (Robert) — 555-0198', 'Friend (Marcus) — 555-0175'] },
        { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] },
        { title: 'Making My Environment Safe', items: ['Keep medication in kitchen cabinet', 'Limit alcohol availability'] },
      ],
    },
    {
      patientId: PATIENT_EMMA_ID,
      reviewedDate: new Date('2026-02-23'),
      version: 1,
      steps: [
        { title: 'Warning Signs', items: ['Sleeping more than 12 hours', 'Crying without clear trigger', 'Canceling all plans for multiple days'] },
        { title: 'Internal Coping Strategies', items: ['Brief walk reset', 'Reflective journaling', 'Consistent evening routine'] },
        { title: 'People & Places That Distract', items: ['Call my sister Kate', 'Visit the park with dog', 'Garden or outdoor activity'] },
        { title: 'People I Can Ask for Help', items: ['Spouse (David) — 555-0234', 'Sister (Kate) — 555-0256'] },
        { title: 'Professionals I Can Contact', items: ['Dr. Sarah Chen — 555-0300', '988 Suicide & Crisis Lifeline', 'Crisis Text Line: HOME → 741741'] },
        { title: 'Making My Environment Safe', items: ['Medications managed by David', 'Keep emergency numbers posted on fridge'] },
      ],
    },
  ];

  for (const sp of safetyPlans) {
    await prisma.safetyPlan.upsert({
      where: { patientId: sp.patientId },
      update: {},
      create: { id: randomUUID(), ...sp },
    });
  }

  // ═══════════════════════════════════════════════════
  // 17. PROGRESS DATA (matching baselineProgressData)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating progress data...');
  const progressData = [
    {
      patientId: PATIENT_MARIA_ID,
      streak: 4,
      xp: 240,
      level: 3,
      levelName: 'Mindful Explorer',
      badges: [
        { id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-10' },
        { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: true, earnedDate: '2026-02-13' },
        { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false },
        { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-18' },
        { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: true, earnedDate: '2026-02-20' },
        { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: false },
        { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false },
        { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false },
      ],
      weeklyMood: [3, 3, 4, 3, 4, null, null],
      milestones: [
        { date: '2026-02-10', label: 'Started Peacefull.ai', achieved: true },
        { date: '2026-02-14', label: 'Completed first week', achieved: true },
        { date: '2026-02-18', label: '5 journal entries', achieved: true },
        { date: '2026-02-22', label: '3-day streak achieved', achieved: true },
        { date: null, label: '7-day streak', achieved: false },
      ],
    },
    {
      patientId: PATIENT_JAMES_ID,
      streak: 2,
      xp: 120,
      level: 2,
      levelName: 'Getting Started',
      badges: [
        { id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-12' },
        { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: false },
        { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false },
        { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-20' },
        { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: false },
        { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: false },
        { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false },
        { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false },
      ],
      weeklyMood: [2, 3, 2, 3, null, null, null],
      milestones: [
        { date: '2026-02-12', label: 'Started Peacefull.ai', achieved: true },
        { date: '2026-02-19', label: 'Completed first week', achieved: true },
        { date: null, label: '5 journal entries', achieved: false },
      ],
    },
    {
      patientId: PATIENT_EMMA_ID,
      streak: 6,
      xp: 350,
      level: 3,
      levelName: 'Mindful Explorer',
      badges: [
        { id: 'first-checkin', label: 'First Check-in', icon: '🏅', earned: true, earnedDate: '2026-02-08' },
        { id: '3-day-streak', label: '3-Day Streak', icon: '🔥', earned: true, earnedDate: '2026-02-11' },
        { id: '7-day-streak', label: '7-Day Streak', icon: '⭐', earned: false },
        { id: 'journal-explorer', label: 'Journal Explorer', icon: '📝', earned: true, earnedDate: '2026-02-15' },
        { id: 'voice-pioneer', label: 'Voice Pioneer', icon: '🎤', earned: true, earnedDate: '2026-02-17' },
        { id: 'good-sleeper', label: 'Good Sleeper', icon: '😴', earned: true, earnedDate: '2026-02-20' },
        { id: 'resource-reader', label: 'Resource Reader', icon: '📚', earned: false },
        { id: 'chat-explorer', label: 'Chat Explorer', icon: '💬', earned: false },
      ],
      weeklyMood: [3, 4, 4, 3, 4, 4, null],
      milestones: [
        { date: '2026-02-08', label: 'Started Peacefull.ai', achieved: true },
        { date: '2026-02-15', label: 'Completed first week', achieved: true },
        { date: '2026-02-20', label: '5 journal entries', achieved: true },
        { date: '2026-02-24', label: '3-day streak achieved', achieved: true },
        { date: null, label: '7-day streak', achieved: false },
      ],
    },
  ];

  for (const pd of progressData) {
    await prisma.progressData.upsert({
      where: { patientId: pd.patientId },
      update: {},
      create: { id: randomUUID(), ...pd },
    });
  }

  // ═══════════════════════════════════════════════════
  // 18. SDOH ASSESSMENTS (matching baselineSDOHData)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating SDOH assessments...');
  const sdohAssessments = [
    {
      patientId: PATIENT_MARIA_ID,
      housing: 'Stable',
      food: 'Adequate',
      transportation: 'Public transit dependent',
      employment: 'Full-time employed',
      socialSupport: 'Family nearby',
      education: 'College degree',
      screenedDate: new Date('2026-02-15'),
      notes: 'Commute-related stress identified as key SDOH factor.',
    },
    {
      patientId: PATIENT_JAMES_ID,
      housing: 'Renting, stable',
      food: 'Adequate',
      transportation: 'Personal vehicle',
      employment: 'Full-time, deadline-driven',
      socialSupport: 'Limited peer network',
      education: 'College degree',
      screenedDate: new Date('2026-02-18'),
      notes: 'Work stress and social isolation flagged.',
    },
    {
      patientId: PATIENT_EMMA_ID,
      housing: 'Homeowner, stable',
      food: 'Adequate',
      transportation: 'Personal vehicle',
      employment: 'Leave of absence',
      socialSupport: 'Spouse supportive',
      education: 'Graduate degree',
      screenedDate: new Date('2026-02-20'),
      notes: 'Return-to-work planning is current focus.',
    },
  ];

  for (const s of sdohAssessments) {
    await prisma.sDOHAssessment.create({ data: { id: randomUUID(), ...s } });
  }

  // ═══════════════════════════════════════════════════
  // 19. CHAT SESSIONS & MESSAGES (matching baselineChatScript)
  // ═══════════════════════════════════════════════════
  console.log('  → Creating chat sessions and messages...');

  // Maria's chat session
  const mariaSessionId = randomUUID();
  await prisma.chatSession.create({
    data: {
      id: mariaSessionId,
      patientId: PATIENT_MARIA_ID,
      active: true,
    },
  });

  const mariaChatMessages = [
    { role: 'ASSISTANT' as const, content: 'Hi Maria! Welcome back. Based on your recent check-ins, it looks like evenings have been challenging. How are you feeling right now?', memoryRef: 'Evening stress patterns (approved by Dr. Chen, 2026-02-15)' },
    { role: 'USER' as const, content: "Yeah, tonight is really rough. I can't stop thinking about work.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "I hear you. Let's try something that helped before — your 4-6 breathing cadence. Inhale for 4 seconds, exhale for 6. Want to do 3 rounds together?", memoryRef: '4-6 breathing cadence (approved by Dr. Chen, 2026-02-20)' },
    { role: 'USER' as const, content: 'Okay, that actually did help a bit. Thanks.', memoryRef: null },
    { role: 'ASSISTANT' as const, content: "Great job. I'll note this in a draft summary for Dr. Chen so she has context for your session tomorrow. Anything else before bed?", memoryRef: null },
    { role: 'USER' as const, content: "No, I think I'm good. Goodnight.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: 'Goodnight, Maria. Remember, if you need immediate help, call 988 any time. 💚', memoryRef: null },
    { role: 'SYSTEM' as const, content: 'Draft summary created for clinician review.', memoryRef: null },
  ];

  for (let i = 0; i < mariaChatMessages.length; i++) {
    await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        sessionId: mariaSessionId,
        ...mariaChatMessages[i],
        createdAt: new Date(Date.now() - (mariaChatMessages.length - i) * 30000), // 30s intervals
      },
    });
  }

  // James's chat session
  const jamesSessionId = randomUUID();
  await prisma.chatSession.create({
    data: {
      id: jamesSessionId,
      patientId: PATIENT_JAMES_ID,
      active: true,
    },
  });

  const jamesChatMessages = [
    { role: 'ASSISTANT' as const, content: "Hey James! I noticed your focus check-ins have been lower this week. What's on your mind?", memoryRef: 'Focus fragmentation tracking (approved by Dr. Chen, 2026-02-18)' },
    { role: 'USER' as const, content: "I have a huge deadline tomorrow and I can't even start. It's overwhelming.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "That sounds stressful. Your therapist noted that micro-task breakdowns work well for you. Can we pick just one 5-minute piece to start with right now?", memoryRef: 'Micro-task breakdown (5-min start) (approved by Dr. Chen, 2026-02-22)' },
    { role: 'USER' as const, content: "I guess I could outline the first section. That's maybe 5 minutes.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "Perfect. Just the outline, nothing more. I'll check in after 5 minutes. You've got this — one step at a time.", memoryRef: null },
    { role: 'USER' as const, content: "Done. That wasn't as bad as I thought.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "Awesome work, James! I'll log this win and let Dr. Chen know the micro-task approach is working. Want to try one more block or call it a night?", memoryRef: null },
    { role: 'SYSTEM' as const, content: 'Draft summary created for clinician review.', memoryRef: null },
  ];

  for (let i = 0; i < jamesChatMessages.length; i++) {
    await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        sessionId: jamesSessionId,
        ...jamesChatMessages[i],
        createdAt: new Date(Date.now() - (jamesChatMessages.length - i) * 30000),
      },
    });
  }

  // Emma's chat session
  const emmaSessionId = randomUUID();
  await prisma.chatSession.create({
    data: {
      id: emmaSessionId,
      patientId: PATIENT_EMMA_ID,
      active: true,
    },
  });

  const emmaChatMessages = [
    { role: 'ASSISTANT' as const, content: 'Hi Emma. Your evening check-ins show your mood has been more stable this week. How are you feeling tonight?', memoryRef: 'Mood stability tracking (approved by Dr. Chen, 2026-02-16)' },
    { role: 'USER' as const, content: "I'm okay actually. A little tired but not as low as last week.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "That's really good to hear. I noticed you've been consistent with your evening routine — 5 nights in a row! That pattern seems to be helping.", memoryRef: 'Consistent evening routine (approved by Dr. Chen, 2026-02-23)' },
    { role: 'USER' as const, content: "Yeah, the routine does help. I still get worried it'll come back though.", memoryRef: null },
    { role: 'ASSISTANT' as const, content: "Those worries are understandable. Your therapist will review your progress trends before your next session. For now, your consistency is your best protection.", memoryRef: null },
    { role: 'USER' as const, content: 'Thanks, that helps to hear.', memoryRef: null },
    { role: 'ASSISTANT' as const, content: "You're doing really well, Emma. Rest up tonight. If you need anything, I'm here — or call 988 anytime. 💚", memoryRef: null },
    { role: 'SYSTEM' as const, content: 'Draft summary created for clinician review.', memoryRef: null },
  ];

  for (let i = 0; i < emmaChatMessages.length; i++) {
    await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        sessionId: emmaSessionId,
        ...emmaChatMessages[i],
        createdAt: new Date(Date.now() - (emmaChatMessages.length - i) * 30000),
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 20. ENTERPRISE CONFIG
  // ═══════════════════════════════════════════════════
  console.log('  → Creating enterprise config...');
  await prisma.enterpriseConfig.upsert({
    where: { tenantId: TENANT_ID },
    update: {},
    create: {
      id: randomUUID(),
      tenantId: TENANT_ID,
      sso: { provider: 'none', enabled: false },
      rbac: { roles: ['PATIENT', 'CLINICIAN', 'SUPERVISOR', 'ADMIN', 'COMPLIANCE_OFFICER'] },
      audit: { streaming: true, retention: '7 years', format: 'JSON' },
      status: 'REVIEW_REQUIRED',
      evidence: ['Policy package v1.0', 'Initial audit configuration'],
    },
  });

  // ═══════════════════════════════════════════════════
  // 21. CONSENT RECORDS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating consent records...');
  const consentTypes = ['data_processing', 'ai_analysis', 'voice_recording'];
  const patientIds = [PATIENT_MARIA_ID, PATIENT_JAMES_ID, PATIENT_EMMA_ID];

  for (const patientId of patientIds) {
    for (const type of consentTypes) {
      await prisma.consentRecord.create({
        data: {
          id: randomUUID(),
          patientId,
          type,
          version: 1,
          granted: true,
          grantedAt: new Date('2026-02-01T00:00:00Z'),
          ipAddress: '10.0.0.1',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // 22. AUDIT LOG ENTRIES
  // ═══════════════════════════════════════════════════
  console.log('  → Creating audit log entries...');
  let previousHash: string | null = null;

  const auditEntries = [
    { userId: USER_CHEN_ID, action: 'LOGIN', resource: 'session', resourceId: null, details: { method: 'password+totp' } },
    { userId: USER_CHEN_ID, action: 'VIEW', resource: 'patient', resourceId: PATIENT_MARIA_ID, details: { screen: 'patient-profile' } },
    { userId: USER_CHEN_ID, action: 'VIEW', resource: 'triage_item', resourceId: null, details: { screen: 'clinician-inbox' } },
    { userId: USER_CHEN_ID, action: 'REVIEW', resource: 'ai_draft', resourceId: null, details: { action: 'viewed draft summary' } },
    { userId: USER_CHEN_ID, action: 'ACK', resource: 'escalation_item', resourceId: null, details: { tier: 'T2', patient: 'James Chen' } },
    { userId: USER_CHEN_ID, action: 'VIEW', resource: 'mbc_score', resourceId: null, details: { screen: 'mbc-dashboard' } },
    { userId: USER_CHEN_ID, action: 'REVIEW', resource: 'memory_proposal', resourceId: null, details: { action: 'reviewed memory proposal' } },
    { userId: USER_MARIA_ID, action: 'SUBMIT', resource: 'submission', resourceId: SUB_MARIA_ID, details: { source: 'JOURNAL' } },
    { userId: USER_EMMA_ID, action: 'SUBMIT', resource: 'submission', resourceId: SUB_EMMA_ID, details: { source: 'VOICE_MEMO' } },
    { userId: USER_JAMES_ID, action: 'SUBMIT', resource: 'submission', resourceId: SUB_ALEX_ID, details: { source: 'JOURNAL' } },
    { userId: USER_MARIA_ID, action: 'CHAT', resource: 'chat_session', resourceId: mariaSessionId, details: { messagesCount: 8 } },
    { userId: null, action: 'SYSTEM', resource: 'escalation_item', resourceId: null, details: { trigger: 'T3 CRITICAL escalation', patient: 'Maria Santos' } },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    const hash = auditHash(entry.action, entry.resource, previousHash);
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        tenantId: TENANT_ID,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: '10.0.0.1',
        userAgent: 'Peacefull-Seed/1.0',
        previousHash,
        hash,
        timestamp: new Date(Date.now() - (auditEntries.length - i) * 60000),
      },
    });
    previousHash = hash;
  }

  // ═══════════════════════════════════════════════════
  // PHASE 1 EXPANSION: 2 tenants, 4 clinicians, 20 patients, 600 check-ins
  // ═══════════════════════════════════════════════════
  console.log('\n📊 Phase 1 Production Scale Data...\n');

  // Second tenant
  const TENANT_2_ID = '10000000-0000-4000-8000-000000000002';
  console.log('  → Creating second tenant...');
  await prisma.tenant.upsert({
    where: { slug: 'wellness-clinic' },
    update: {},
    create: {
      id: TENANT_2_ID,
      name: 'Wellness Mental Health Clinic',
      slug: 'wellness-clinic',
      domain: 'wellness-clinic.peacefull.ai',
      plan: 'GROWTH',
      ssoEnabled: false,
      scimEnabled: false,
      settings: {
        timezone: 'America/New_York',
        defaultLanguage: 'en',
        features: ['mbc', 'chat', 'adherence'],
      },
    },
  });

  // Fourth clinician for second tenant
  const USER_PATEL_ID = '20000000-0000-4000-8000-000000000004';
  const CLINICIAN_PATEL_ID = '40000000-0000-4000-8000-000000000004';
  console.log('  → Creating fourth clinician...');
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: TENANT_2_ID, email: 'anika.patel@wellness-clinic.com' } },
    update: {},
    create: {
      id: USER_PATEL_ID,
      tenantId: TENANT_2_ID,
      email: 'anika.patel@wellness-clinic.com',
      passwordHash,
      role: 'CLINICIAN',
      firstName: 'Anika',
      lastName: 'Patel',
      phone: '555-0400',
      mfaEnabled: true,
      mfaMethod: 'TOTP',
      lastLogin: new Date('2026-02-27T10:00:00Z'),
      status: 'ACTIVE',
    },
  });
  await prisma.clinician.upsert({
    where: { userId: USER_PATEL_ID },
    update: {},
    create: {
      id: CLINICIAN_PATEL_ID,
      userId: USER_PATEL_ID,
      credentials: 'PsyD, Licensed Clinical Psychologist',
      specialty: 'Adolescent Mental Health, Family Therapy',
      npi: '1234567893',
      caseloadSize: 28,
    },
  });

  // Additional 17 patients (total 20)
  console.log('  → Creating additional patients (17 more for total of 20)...');
  const additionalPatientNames = [
    { first: 'David', last: 'Park' },
    { first: 'Sarah', last: 'Kim' },
    { first: 'Michael', last: 'Johnson' },
    { first: 'Lisa', last: 'Williams' },
    { first: 'Kevin', last: 'Brown' },
    { first: 'Jennifer', last: 'Davis' },
    { first: 'Robert', last: 'Miller' },
    { first: 'Amanda', last: 'Garcia' },
    { first: 'Daniel', last: 'Martinez' },
    { first: 'Jessica', last: 'Anderson' },
    { first: 'Christopher', last: 'Taylor' },
    { first: 'Ashley', last: 'Thomas' },
    { first: 'Matthew', last: 'Jackson' },
    { first: 'Stephanie', last: 'White' },
    { first: 'Andrew', last: 'Harris' },
    { first: 'Nicole', last: 'Martin' },
    { first: 'Joshua', last: 'Thompson' },
  ];
  const diagnoses = ['F32.1', 'F41.1', 'F90.0', 'F33.0', 'F40.10', 'F43.10'];
  const additionalPatientIds: string[] = [];

  for (let i = 0; i < additionalPatientNames.length; i++) {
    const patientName = additionalPatientNames[i];
    if (!patientName) continue;
    const idx = i + 4; // Start from 4 since we already have 3 patients
    const userId = `30000000-0000-4000-8000-${String(idx).padStart(12, '0')}`;
    const patientId = `50000000-0000-4000-8000-${String(idx).padStart(12, '0')}`;
    additionalPatientIds.push(patientId);
    const email = `${patientName.first.toLowerCase()}.${patientName.last.toLowerCase()}@example.com`;
    const tenantForPatient = i < 10 ? TENANT_ID : TENANT_2_ID;
    const clinicianForPatient = i < 10 ? CLINICIAN_CHEN_ID : CLINICIAN_PATEL_ID;

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenantForPatient, email } },
      update: {},
      create: {
        id: userId,
        tenantId: tenantForPatient,
        email,
        passwordHash,
        role: 'PATIENT',
        firstName: patientName.first,
        lastName: patientName.last,
        mfaEnabled: false,
        status: 'ACTIVE',
      },
    });

    await prisma.patient.upsert({
      where: { userId },
      update: {},
      create: {
        id: patientId,
        userId,
        tenantId: tenantForPatient,
        age: 25 + (i % 30),
        pronouns: i % 2 === 0 ? 'he/him' : 'she/her',
        language: 'English',
        emergencyName: 'Emergency Contact',
        emergencyPhone: `555-${String(1000 + i).padStart(4, '0')}`,
        emergencyRel: 'Family',
        diagnosisPrimary: ['Depression', 'Anxiety', 'ADHD', 'MDD', 'Social Anxiety', 'PTSD'][i % 6],
        diagnosisCode: diagnoses[i % 6],
        treatmentStart: new Date(2025, 6 + (i % 6), 1),
        medications: [],
        allergies: [],
        preferences: {},
      },
    });

    // Care team assignment
    await prisma.careTeamAssignment.upsert({
      where: {
        patientId_clinicianId: {
          patientId,
          clinicianId: clinicianForPatient,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        patientId,
        clinicianId: clinicianForPatient,
        role: 'Primary Therapist',
      },
    });

    // Progress data for each patient
    await prisma.progressData.upsert({
      where: { patientId },
      update: {},
      create: {
        id: randomUUID(),
        patientId,
        streak: Math.floor(Math.random() * 14),
        xp: Math.floor(Math.random() * 500),
        level: Math.floor(Math.random() * 3) + 1,
        levelName: ['Seedling', 'Sprout', 'Sapling'][Math.floor(Math.random() * 3)],
        badges: [],
        weeklyMood: [],
        milestones: [],
      },
    });
  }

  // 600 check-in submissions (30 per patient across all 20 patients)
  console.log('  → Creating 600 check-in submissions...');
  const allPatientIds = [PATIENT_MARIA_ID, PATIENT_JAMES_ID, PATIENT_EMMA_ID, ...additionalPatientIds];
  const moodDescriptions = [
    'Feeling okay today, some stress at work but manageable.',
    'Had a good night sleep, energy levels are better.',
    'Anxiety spiked this morning but used breathing techniques.',
    'Feeling low, struggling to focus on tasks.',
    'Better day than yesterday, practiced mindfulness.',
    'Productive day at work, mood is stable.',
    'Tired but accomplished my goals for the day.',
    'Feeling anxious about upcoming deadline.',
    'Good conversation with friend lifted my mood.',
    'Struggled with motivation but pushed through.',
  ];
  const moods = ['calm', 'anxious', 'hopeful', 'stressed', 'content', 'overwhelmed', 'focused', 'tired'];

  let checkInCount = 0;
  for (const patientId of allPatientIds) {
    for (let day = 0; day < 30; day++) {
      const submissionId = randomUUID();
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() - day);
      checkInDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

      const mood = moods[Math.floor(Math.random() * moods.length)];
      const moodDesc = moodDescriptions[Math.floor(Math.random() * moodDescriptions.length)];
      const sleepHours = 5 + Math.floor(Math.random() * 5);
      const energyLevel = Math.floor(Math.random() * 5) + 1;

      await prisma.submission.create({
        data: {
          id: submissionId,
          patientId,
          source: 'CHECKIN',
          status: day < 7 ? 'READY' : 'REVIEWED',
          rawContent: JSON.stringify({
            mood,
            moodDescription: moodDesc,
            sleepHours,
            energyLevel,
            medicationTaken: Math.random() > 0.1,
            anxietyLevel: Math.floor(Math.random() * 10) + 1,
            copingUsed: Math.random() > 0.5 ? ['breathing', 'mindfulness'] : [],
          }),
          patientTone: mood,
          patientSummary: moodDesc,
          clinicianSignalBand: ['LOW', 'GUARDED', 'MODERATE', 'ELEVATED'][Math.floor(Math.random() * 4)] as 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED',
          processedAt: checkInDate,
          createdAt: checkInDate,
        },
      });
      checkInCount++;
    }
  }
  console.log(`    Created ${checkInCount} check-in submissions`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log('\n✅ Seed complete! Summary:');
  console.log('   • 2 tenants');
  console.log('   • 24 users (4 clinicians + 20 patients)');
  console.log('   • 4 clinician profiles');
  console.log('   • 20 patient profiles');
  console.log('   • 23 care team assignments');
  console.log('   • 603 submissions (3 journals + 600 check-ins)');
  console.log('   • 3 triage items');
  console.log('   • 3 AI drafts');
  console.log('   • 3 memory proposals');
  console.log('   • 3 treatment plans');
  console.log('   • 6 MBC scores');
  console.log('   • 6 adherence items');
  console.log('   • 3 escalation items');
  console.log('   • 3 session notes');
  console.log('   • 3 safety plans');
  console.log('   • 20 progress data records');
  console.log('   • 3 SDOH assessments');
  console.log('   • 3 chat sessions with 24 messages');
  console.log('   • 1 enterprise config');
  console.log('   • 9 consent records');
  console.log('   • 12 audit log entries');
  console.log('   • 65 evidence items (reference: state.js baselineEvidenceItems)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
