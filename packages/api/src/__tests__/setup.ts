// ─── Test Setup ──────────────────────────────────────────────────────
// Global setup for API tests. Sets environment variables and mocks
// that are shared across all test files.

import { vi } from 'vitest';

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // random port
process.env.JWT_SECRET = 'test-jwt-secret-minimum-thirty-two-characters-long-for-hs256';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-thirty-two-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-placeholder-for-unit-tests';
process.env.CORS_ORIGIN = '*';

// Mock the Prisma client (all tests use this mock)
vi.mock('../models/index.js', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    clinician: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    treatmentPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    triageItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    aIDraft: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    chatSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    },
    careTeamAssignment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    sessionNote: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    memoryProposal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mBCScore: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    progressData: {
      findUnique: vi.fn(),
    },
    safetyPlan: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    adherenceItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    escalationItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    consentRecord: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  return { prisma: mockPrisma, default: mockPrisma };
});

// Mock Claude service
vi.mock('../services/claude.js', () => ({
  claudeService: {
    summarize: vi.fn().mockResolvedValue({
      id: 'mock-id',
      requestId: 'mock-req',
      type: 'SUMMARIZE',
      output: {
        content: JSON.stringify({
          patientSummary: 'Test summary',
          clinicianSummary: 'Test clinical summary',
          signalBand: 'LOW',
          evidence: [],
          unknowns: [],
        }),
      },
      model: 'claude-test',
      usage: { inputTokens: 100, outputTokens: 50, cost: 0.001 },
      metadata: { latency: 200, cached: false },
      createdAt: new Date().toISOString(),
    }),
    assessRisk: vi.fn().mockResolvedValue({
      id: 'mock-id',
      requestId: 'mock-req',
      type: 'RISK_ASSESS',
      output: {
        content: JSON.stringify({
          signalBand: 'LOW',
          confidence: 0.85,
          reasoning: 'Test reasoning',
          keyIndicators: [],
          recommendations: [],
        }),
      },
      model: 'claude-test',
      usage: { inputTokens: 100, outputTokens: 50, cost: 0.001 },
      metadata: { latency: 200, cached: false },
      createdAt: new Date().toISOString(),
    }),
    extractMemories: vi.fn().mockResolvedValue({
      id: 'mock-id',
      requestId: 'mock-req',
      type: 'MEMORY_EXTRACT',
      output: { content: '[]' },
      model: 'claude-test',
      usage: { inputTokens: 100, outputTokens: 50, cost: 0.001 },
      metadata: { latency: 200, cached: false },
      createdAt: new Date().toISOString(),
    }),
    chat: vi.fn().mockResolvedValue({
      id: 'mock-id',
      requestId: 'mock-req',
      type: 'CHAT',
      output: { content: 'Test response' },
      model: 'claude-test',
      usage: { inputTokens: 100, outputTokens: 50, cost: 0.001 },
      metadata: { latency: 200, cached: false },
      createdAt: new Date().toISOString(),
    }),
  },
}));
