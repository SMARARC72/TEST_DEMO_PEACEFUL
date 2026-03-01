import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const models = ['tenant','user','clinician','patient','submission','triageItem','aIDraft','memoryProposal','treatmentPlan','mBCScore','adherenceItem','sessionNote','escalationItem','safetyPlan','progressData','sDOHAssessment','chatSession','chatMessage','enterpriseConfig','auditLog','consentRecord'];
const counts = {};
for (const m of models) {
  try { counts[m] = await p[m].count(); } catch { counts[m] = 'ERR'; }
}
console.table(counts);
await p.$disconnect();
