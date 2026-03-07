import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

type CliOptions = {
  dryRun: boolean;
  email?: string;
  password?: string;
  tenantSlug?: string;
  firstName?: string;
  lastName?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--email":
        options.email = next;
        index += 1;
        break;
      case "--password":
        options.password = next;
        index += 1;
        break;
      case "--tenant-slug":
        options.tenantSlug = next;
        index += 1;
        break;
      case "--first-name":
        options.firstName = next;
        index += 1;
        break;
      case "--last-name":
        options.lastName = next;
        index += 1;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        break;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Usage:
  DATABASE_URL=<prod-db-url> npm run db:seed-super-admin -- --email admin@peacefull.cloud --tenant-slug peacefull-health

Options:
  --email         Email address for the platform admin account
  --password      Optional bootstrap password (generated automatically if omitted)
  --tenant-slug   Target tenant slug (falls back to SUPER_ADMIN_TENANT_SLUG or the only tenant in the database)
  --first-name    Optional first name (default: Platform)
  --last-name     Optional last name (default: Admin)
  --dry-run       Print the resolved action without writing to the database
`);
}

function generateBootstrapPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

  const pick = () => alphabet[crypto.randomInt(0, alphabet.length)];
  const required = ["A", "a", "7", "!"];
  const generated = [...required];

  while (generated.length < 20) {
    generated.push(pick());
  }

  for (let index = generated.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    const current = generated[index];
    generated[index] = generated[swapIndex]!;
    generated[swapIndex] = current!;
  }

  return generated.join("");
}

async function resolveTenantSlug(
  prisma: PrismaClient,
  requestedTenantSlug?: string,
) {
  if (requestedTenantSlug) {
    return requestedTenantSlug;
  }

  const tenants = await prisma.tenant.findMany({
    select: { slug: true },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (tenants.length === 1) {
    return tenants[0]!.slug;
  }

  throw new Error(
    "Multiple tenants exist. Provide --tenant-slug or SUPER_ADMIN_TENANT_SLUG explicitly.",
  );
}

function assertDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const obviouslyNonProdMarkers = ["localhost", "127.0.0.1", "test", "demo"];
  if (obviouslyNonProdMarkers.some((marker) => databaseUrl.includes(marker))) {
    throw new Error(
      "DATABASE_URL looks non-production. Refusing to provision a live bootstrap admin.",
    );
  }
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const email =
    cli.email?.trim().toLowerCase() ??
    process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const tenantSlug =
    cli.tenantSlug?.trim() ?? process.env.SUPER_ADMIN_TENANT_SLUG?.trim();
  const firstName = cli.firstName?.trim() || process.env.SUPER_ADMIN_FIRST_NAME || "Platform";
  const lastName = cli.lastName?.trim() || process.env.SUPER_ADMIN_LAST_NAME || "Admin";
  const password = cli.password ?? process.env.SUPER_ADMIN_PASSWORD ?? generateBootstrapPassword();
  const passwordWasGenerated =
    !cli.password && !process.env.SUPER_ADMIN_PASSWORD;

  if (!email) {
    throw new Error("Provide --email or SUPER_ADMIN_EMAIL.");
  }

  if (cli.dryRun) {
    console.log("Dry run only. No database changes were made.");
    console.log(
      JSON.stringify(
        {
          email,
          tenantSlug: tenantSlug ?? "(resolve from live database)",
          firstName,
          lastName,
          role: "ADMIN",
          status: "ACTIVE",
          passwordStrategy: passwordWasGenerated ? "generated" : "provided",
        },
        null,
        2,
      ),
    );
    if (passwordWasGenerated) {
      console.log(`Generated bootstrap password: ${password}`);
    }
    return;
  }

  assertDatabaseUrl();

  const prisma = new PrismaClient();

  try {
    const resolvedTenantSlug = await resolveTenantSlug(prisma, tenantSlug);
    const tenant = await prisma.tenant.findUnique({
      where: { slug: resolvedTenantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      throw new Error(`Tenant "${resolvedTenantSlug}" was not found.`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
      update: {
        passwordHash,
        role: "ADMIN",
        firstName,
        lastName,
        status: "ACTIVE",
      },
      create: {
        email,
        tenantId: tenant.id,
        passwordHash,
        role: "ADMIN",
        firstName,
        lastName,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });

    console.log(
      `${existingUser ? "Updated" : "Created"} platform admin ${user.email} for tenant ${tenant.slug}.`,
    );
    console.log(`User ID: ${user.id}`);
    console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
    if (passwordWasGenerated) {
      console.log(`Bootstrap password: ${password}`);
    }
    console.log(
      "Next step: sign in once, enroll MFA immediately, then rotate the bootstrap password.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Super admin provisioning failed: ${message}`);
  process.exit(1);
});
