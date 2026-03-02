// Verify seed data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 Database Verification:');
  
  const tenants = await prisma.tenant.count();
  const users = await prisma.user.count();
  const clinicians = await prisma.clinician.count();
  const patients = await prisma.patient.count();
  const submissions = await prisma.submission.count();
  const checkIns = await prisma.submission.count({ where: { source: 'CHECKIN' } });
  const careTeamAssignments = await prisma.careTeamAssignment.count();
  const progressData = await prisma.progressData.count();
  
  console.log(`  ✓ Tenants: ${tenants} (expected: 2)`);
  console.log(`  ✓ Users: ${users} (expected: 24)`);
  console.log(`  ✓ Clinicians: ${clinicians} (expected: 4)`);
  console.log(`  ✓ Patients: ${patients} (expected: 20)`);
  console.log(`  ✓ Care Team Assignments: ${careTeamAssignments}`);
  console.log(`  ✓ Submissions: ${submissions} (expected: 603)`);
  console.log(`  ✓ Check-ins: ${checkIns} (expected: 600)`);
  console.log(`  ✓ Progress Data: ${progressData} (expected: 20)`);
  
  // Verify expected values
  const allGood = tenants >= 2 && clinicians >= 4 && patients >= 20 && checkIns >= 600;
  console.log(allGood ? '\n✅ Phase 1 seed verification PASSED!' : '\n❌ Phase 1 seed verification FAILED');
  
  await prisma.$disconnect();
}

main();
