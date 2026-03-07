/**
 * Emergency DB Repair Script — Approve All Pending Clinicians
 *
 * Activates all SUSPENDED clinician accounts in the target tenant so they
 * can log in and be tested. Safe to run multiple times (idempotent).
 *
 * Usage (against production Neon DB):
 *   DATABASE_URL=<your-neon-connection-string> npx tsx prisma/approve-pending-clinicians.ts
 *
 * Usage (against local dev DB):
 *   npx tsx prisma/approve-pending-clinicians.ts
 *
 * Optional env overrides:
 *   TENANT_SLUG=peacefull-health   (default: first tenant found)
 *   DRY_RUN=true                   (print what would change, don't mutate)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantSlug = process.env.TENANT_SLUG ?? null;
  const dryRun = process.env.DRY_RUN === 'true';

  console.log('--- Peacefull Pending Clinician Approval Script ---');
  if (dryRun) console.log('DRY RUN mode — no mutations will be made.\n');

  // Resolve tenant
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!tenant) {
    console.error('No tenant found. Check DATABASE_URL or TENANT_SLUG.');
    process.exit(1);
  }

  console.log(`Tenant: ${tenant.name} (${tenant.slug})\n`);

  // Find all SUSPENDED clinicians
  const suspended = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: 'CLINICIAN',
      status: 'SUSPENDED',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (suspended.length === 0) {
    console.log('No SUSPENDED clinician accounts found. Nothing to do.');
    return;
  }

  console.log(`Found ${suspended.length} SUSPENDED clinician account(s):\n`);
  for (const u of suspended) {
    console.log(`  ${u.firstName} ${u.lastName} <${u.email}> — registered ${u.createdAt.toISOString()}`);
  }

  if (dryRun) {
    console.log('\nDRY RUN: would set status = ACTIVE for all of the above.');
    return;
  }

  // Activate each account
  const ids = suspended.map((u) => u.id);
  const { count } = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { status: 'ACTIVE' },
  });

  console.log(`\nActivated ${count} account(s).`);

  // Verify
  const stillSuspended = await prisma.user.count({
    where: { tenantId: tenant.id, role: 'CLINICIAN', status: 'SUSPENDED' },
  });
  const nowActive = await prisma.user.count({
    where: { tenantId: tenant.id, role: 'CLINICIAN', status: 'ACTIVE' },
  });

  console.log(`Active clinicians:    ${nowActive}`);
  console.log(`Still suspended:      ${stillSuspended}`);
  console.log('\nDone. Approved accounts can now log in.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Script failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
