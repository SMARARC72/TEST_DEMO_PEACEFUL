/**
 * Production Seed Script — Pilot Launch
 *
 * This seeds the PROD RDS with:
 *   - 1 pilot tenant (PeaceFull Health)
 *   - 3 clinician accounts (real pilot participants)
 *   - 5 test patient accounts (clearly labeled with "test." prefix)
 *   - NO synthetic check-ins, journals, or session notes
 *
 * Usage:
 *   DATABASE_URL=<prod-rds-url> npx tsx prisma/seed-prod.ts
 *
 * ANTI-DRIFT: This script must NEVER include demo data, lorem ipsum,
 *   or obviously fake content. All accounts use @peacefull.cloud emails.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────
// Deterministic UUIDs for cross-referencing
// ──────────────────────────────────────────────────────
const TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

// Clinician user IDs
const USER_CLINICIAN_1 = 'b0000000-0000-4000-8000-000000000001';
const USER_CLINICIAN_2 = 'b0000000-0000-4000-8000-000000000002';
const USER_CLINICIAN_3 = 'b0000000-0000-4000-8000-000000000003';

// Patient user IDs
const USER_PATIENT_1 = 'c0000000-0000-4000-8000-000000000001';
const USER_PATIENT_2 = 'c0000000-0000-4000-8000-000000000002';
const USER_PATIENT_3 = 'c0000000-0000-4000-8000-000000000003';
const USER_PATIENT_4 = 'c0000000-0000-4000-8000-000000000004';
const USER_PATIENT_5 = 'c0000000-0000-4000-8000-000000000005';

// Clinician profile IDs
const CLINICIAN_1 = 'd0000000-0000-4000-8000-000000000001';
const CLINICIAN_2 = 'd0000000-0000-4000-8000-000000000002';
const CLINICIAN_3 = 'd0000000-0000-4000-8000-000000000003';

// Patient profile IDs
const PATIENT_1 = 'e0000000-0000-4000-8000-000000000001';
const PATIENT_2 = 'e0000000-0000-4000-8000-000000000002';
const PATIENT_3 = 'e0000000-0000-4000-8000-000000000003';
const PATIENT_4 = 'e0000000-0000-4000-8000-000000000004';
const PATIENT_5 = 'e0000000-0000-4000-8000-000000000005';

async function main() {
  console.log('🏥 Seeding PRODUCTION database for pilot launch...\n');

  // Guard: refuse to run if DATABASE_URL contains "neon" or "demo"
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (dbUrl.includes('neon') || dbUrl.includes('demo')) {
    console.error('❌ ABORT: DATABASE_URL appears to be a dev/demo database.');
    console.error('   This seed script is for PRODUCTION RDS only.');
    process.exit(1);
  }

  const tempPassword = 'Pilot2026!Change';
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // ═══════════════════════════════════════════════════
  // 1. TENANT
  // ═══════════════════════════════════════════════════
  console.log('  → Creating pilot tenant...');
  await prisma.tenant.upsert({
    where: { slug: 'peacefull-health' },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'PeaceFull Health',
      slug: 'peacefull-health',
      domain: 'peacefull.cloud',
      plan: 'PILOT',
      ssoEnabled: false,
      scimEnabled: false,
      settings: {
        timezone: 'America/New_York',
        defaultLanguage: 'en',
        features: ['mbc', 'memory', 'escalation', 'chat', 'adherence'],
      },
    },
  });

  // ═══════════════════════════════════════════════════
  // 2. CLINICIAN ACCOUNTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating clinician accounts...');
  const clinicianUsers = [
    {
      id: USER_CLINICIAN_1,
      email: 'pilot.clinician.1@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Clinician-1',
      role: 'CLINICIAN' as const,
      phone: null,
    },
    {
      id: USER_CLINICIAN_2,
      email: 'pilot.clinician.2@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Clinician-2',
      role: 'CLINICIAN' as const,
      phone: null,
    },
    {
      id: USER_CLINICIAN_3,
      email: 'pilot.supervisor@peacefull.cloud',
      firstName: 'Pilot',
      lastName: 'Supervisor',
      role: 'SUPERVISOR' as const,
      phone: null,
    },
  ];

  for (const u of clinicianUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: u.email } },
      update: {},
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
        status: 'ACTIVE',
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 3. CLINICIAN PROFILES
  // ═══════════════════════════════════════════════════
  console.log('  → Creating clinician profiles...');
  const clinicianProfiles = [
    {
      id: CLINICIAN_1,
      userId: USER_CLINICIAN_1,
      credentials: 'PhD, Licensed Clinical Psychologist',
      specialty: 'Anxiety, Depression, Trauma-Informed Care',
      npi: '9900000001',
      caseloadSize: 25,
    },
    {
      id: CLINICIAN_2,
      userId: USER_CLINICIAN_2,
      credentials: 'MD, Board Certified Psychiatrist',
      specialty: 'Psychopharmacology, Mood Disorders',
      npi: '9900000002',
      caseloadSize: 30,
    },
    {
      id: CLINICIAN_3,
      userId: USER_CLINICIAN_3,
      credentials: 'PsyD, Licensed Clinical Psychologist',
      specialty: 'Clinical Oversight, Supervision, CBT',
      npi: '9900000003',
      caseloadSize: 15,
    },
  ];

  for (const c of clinicianProfiles) {
    await prisma.clinician.upsert({
      where: { userId: c.userId },
      update: {},
      create: c,
    });
  }

  // ═══════════════════════════════════════════════════
  // 4. TEST PATIENT ACCOUNTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating test patient accounts...');
  const testPatients = [
    { id: USER_PATIENT_1, email: 'test.patient.1@peacefull.cloud', firstName: 'Test', lastName: 'Patient-1' },
    { id: USER_PATIENT_2, email: 'test.patient.2@peacefull.cloud', firstName: 'Test', lastName: 'Patient-2' },
    { id: USER_PATIENT_3, email: 'test.patient.3@peacefull.cloud', firstName: 'Test', lastName: 'Patient-3' },
    { id: USER_PATIENT_4, email: 'test.patient.4@peacefull.cloud', firstName: 'Test', lastName: 'Patient-4' },
    { id: USER_PATIENT_5, email: 'test.patient.5@peacefull.cloud', firstName: 'Test', lastName: 'Patient-5' },
  ];

  for (const u of testPatients) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: u.email } },
      update: {},
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
  // 5. PATIENT PROFILES
  // ═══════════════════════════════════════════════════
  console.log('  → Creating patient profiles...');
  const patientProfiles = [
    {
      id: PATIENT_1,
      userId: USER_PATIENT_1,
      tenantId: TENANT_ID,
      age: 34,
      diagnosisCode: 'F32.1',
      emergencyName: 'Emergency Contact 1',
      emergencyPhone: '555-0001',
      emergencyRel: 'Spouse',
    },
    {
      id: PATIENT_2,
      userId: USER_PATIENT_2,
      tenantId: TENANT_ID,
      age: 28,
      diagnosisCode: 'F41.1',
      emergencyName: 'Emergency Contact 2',
      emergencyPhone: '555-0002',
      emergencyRel: 'Parent',
    },
    {
      id: PATIENT_3,
      userId: USER_PATIENT_3,
      tenantId: TENANT_ID,
      age: 42,
      diagnosisCode: 'F33.0',
      emergencyName: 'Emergency Contact 3',
      emergencyPhone: '555-0003',
      emergencyRel: 'Sibling',
    },
    {
      id: PATIENT_4,
      userId: USER_PATIENT_4,
      tenantId: TENANT_ID,
      age: 31,
      diagnosisCode: 'F40.10',
      emergencyName: 'Emergency Contact 4',
      emergencyPhone: '555-0004',
      emergencyRel: 'Friend',
    },
    {
      id: PATIENT_5,
      userId: USER_PATIENT_5,
      tenantId: TENANT_ID,
      age: 38,
      diagnosisCode: 'F43.10',
      emergencyName: 'Emergency Contact 5',
      emergencyPhone: '555-0005',
      emergencyRel: 'Spouse',
    },
  ];

  for (const p of patientProfiles) {
    await prisma.patient.upsert({
      where: { userId: p.userId },
      update: {},
      create: p,
    });
  }

  // ═══════════════════════════════════════════════════
  // 6. CARE TEAM ASSIGNMENTS
  // ═══════════════════════════════════════════════════
  console.log('  → Creating care team assignments...');
  const careTeamAssignments = [
    { id: 'f0000000-0000-4000-8000-000000000001', patientId: PATIENT_1, clinicianId: CLINICIAN_1, role: 'Primary Therapist' },
    { id: 'f0000000-0000-4000-8000-000000000002', patientId: PATIENT_2, clinicianId: CLINICIAN_1, role: 'Primary Therapist' },
    { id: 'f0000000-0000-4000-8000-000000000003', patientId: PATIENT_3, clinicianId: CLINICIAN_2, role: 'Primary Therapist' },
    { id: 'f0000000-0000-4000-8000-000000000004', patientId: PATIENT_4, clinicianId: CLINICIAN_2, role: 'Primary Therapist' },
    { id: 'f0000000-0000-4000-8000-000000000005', patientId: PATIENT_5, clinicianId: CLINICIAN_3, role: 'Primary Therapist' },
  ];

  for (const ct of careTeamAssignments) {
    await prisma.careTeamAssignment.upsert({
      where: { patientId_clinicianId: { patientId: ct.patientId, clinicianId: ct.clinicianId } },
      update: {},
      create: ct,
    });
  }

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  const tenantCount = await prisma.tenant.count();
  const userCount = await prisma.user.count();
  const clinicianCount = await prisma.clinician.count();
  const patientCount = await prisma.patient.count();
  const careTeamCount = await prisma.careTeamAssignment.count();

  console.log('\n✅ Production seed complete:');
  console.log(`   Tenants:             ${tenantCount}`);
  console.log(`   Users:               ${userCount}`);
  console.log(`   Clinicians:          ${clinicianCount}`);
  console.log(`   Patients:            ${patientCount}`);
  console.log(`   Care Team Assigns:   ${careTeamCount}`);
  console.log(`\n   Temp password for all accounts: ${tempPassword}`);
  console.log('   ⚠️  Clinicians should change password on first login.\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
