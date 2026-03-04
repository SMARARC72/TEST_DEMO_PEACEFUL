import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { phiEncryptionExtension } from '../middleware/phi-encryption.js';

// ─── Neon Serverless Configuration ─────────────────────────────────
// Uses WebSockets for connection pooling in serverless environments.
// Falls back to standard PrismaClient in local/Docker mode when
// DATABASE_URL points to localhost.

const isNeonUrl = (url: string) =>
  url.includes('.neon.tech') || url.includes('neon.tech');

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? '';

  let baseClient: PrismaClient;

  if (isNeonUrl(databaseUrl)) {
    // Neon serverless path — uses WebSocket-based connection pooling
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: databaseUrl });

    baseClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  } else {
    // Local / Docker / CI path — standard TCP connection
    baseClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  // Apply PHI field-level encryption extension
  return baseClient.$extends(phiEncryptionExtension);
}

// Use PrismaClient as the export type so model accessors remain visible.
// The $extends() return type strips model generics in some Prisma versions;
// since the extension only adds query hooks (no model shape changes),
// PrismaClient is a safe type annotation.
type ExtendedPrismaClient = PrismaClient;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? (createPrismaClient() as unknown as ExtendedPrismaClient);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
