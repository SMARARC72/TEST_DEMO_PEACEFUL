// ─── Seed Demo Clinician with MFA Pre-Enrolled ───────────────────────
// Option A: Seeds demo clinician accounts with TOTP already configured.
// The TOTP secrets are documented below for use with any authenticator app.
//
// Usage:
//   cd packages/api
//   DATABASE_URL=<neon-url> npx tsx prisma/seed-demo-totp.ts
//
// ── DEMO TOTP SECRETS (for authenticator apps) ──
//   demo-clinician@peacefull.ai  → TOTP secret: a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8
//   demo-supervisor@peacefull.ai → TOTP secret: f8e7d6c5b4a3f2e1f8e7d6c5b4a3f2e1
//
// These are DEMO-ONLY secrets. Never reuse in production.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const DEMO_ACCOUNTS = [
  {
    email: "demo-clinician@peacefull.ai",
    password: "DemoClinician2026!",
    role: "CLINICIAN" as const,
    firstName: "Demo",
    lastName: "Clinician",
    mfaSecret: "a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8",
    credentials: "PsyD, LCSW",
    specialty: "Cognitive Behavioral Therapy",
  },
  {
    email: "demo-supervisor@peacefull.ai",
    password: "DemoSupervisor2026!",
    role: "SUPERVISOR" as const,
    firstName: "Demo",
    lastName: "Supervisor",
    mfaSecret: "f8e7d6c5b4a3f2e1f8e7d6c5b4a3f2e1",
    credentials: "PhD, Licensed Psychologist",
    specialty: "Clinical Supervision",
  },
];

function hashBackupCode(userId: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${code}`)
    .digest("hex");
}

async function main() {
  // Find the target tenant
  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!tenant) {
    throw new Error("No tenant found. Run the main seed first.");
  }

  console.log(`Using tenant: ${tenant.name} (${tenant.slug})`);

  for (const account of DEMO_ACCOUNTS) {
    const existing = await prisma.user.findFirst({
      where: { email: account.email, tenantId: tenant.id },
    });

    if (existing) {
      // Update existing account with MFA
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          mfaEnabled: true,
          mfaMethod: "TOTP",
          mfaSecret: account.mfaSecret,
          status: "ACTIVE",
        },
      });
      console.log(`✅ Updated ${account.email} — MFA enabled`);
      continue;
    }

    const passwordHash = await bcrypt.hash(account.password, 12);
    const userId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        tenantId: tenant.id,
        email: account.email,
        passwordHash,
        role: account.role,
        firstName: account.firstName,
        lastName: account.lastName,
        mfaEnabled: true,
        mfaMethod: "TOTP",
        mfaSecret: account.mfaSecret,
        status: "ACTIVE",
      },
    });

    // Create clinician profile
    await prisma.clinician.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        credentials: account.credentials,
        specialty: account.specialty,
      },
    });

    // Generate and store backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }
    await prisma.mfaBackupCode.createMany({
      data: backupCodes.map((code) => ({
        userId,
        codeHash: hashBackupCode(userId, code),
      })),
    });

    console.log(`✅ Created ${account.email} (${account.role})`);
    console.log(`   TOTP Secret: ${account.mfaSecret}`);
    console.log(`   Password: ${account.password}`);
    console.log(`   Backup codes: ${backupCodes.join(", ")}`);
  }

  console.log("\n── Done! Use the TOTP secrets above in any authenticator app ──");
  console.log("   otpauth://totp/Peacefull:demo-clinician@peacefull.ai?secret=a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8&issuer=Peacefull&digits=6&period=30");
  console.log("   otpauth://totp/Peacefull:demo-supervisor@peacefull.ai?secret=f8e7d6c5b4a3f2e1f8e7d6c5b4a3f2e1&issuer=Peacefull&digits=6&period=30");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
