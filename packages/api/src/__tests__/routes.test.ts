// ─── Route Integration Tests ─────────────────────────────────────────
// Tests HTTP endpoints by making actual requests via supertest against
// the Express app with mocked Prisma + Claude backends.

import { describe, it, expect, vi, type Mock } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { app } from '../server.js';
import { prisma } from '../models/index.js';

// ─── Token Helpers ───────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;
const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const PATIENT_ID = 'patient-001';

function makeToken(
  role: string,
  extra: Record<string, unknown> = {},
): string {
  return jwt.sign(
    {
      sub: USER_ID,
      tid: TENANT_ID,
      role,
      permissions: [],
      ...extra,
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

const clinicianToken = () => makeToken('CLINICIAN');
const patientToken = () => makeToken('PATIENT');
const adminToken = () => makeToken('ADMIN');
const complianceToken = () => makeToken('COMPLIANCE_OFFICER');

// ─── Health / Infrastructure Endpoints ───────────────────────────────

describe('Infrastructure endpoints', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /ready may return 200 or 503 (depends on DB connectivity)', async () => {
    // Mock Prisma $queryRaw to simulate connected DB
    (prisma.$queryRaw as unknown as Mock).mockResolvedValueOnce([{ '?column?': 1 }]);
    
    const res = await request(app).get('/ready');
    // With mock it should succeed; without real DB it would 503
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });

  it('GET /version returns version info', async () => {
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('node');
    expect(res.body).toHaveProperty('environment');
  });
});

// ─── Auth Endpoints ──────────────────────────────────────────────────

describe('Auth routes', () => {
  it('POST /api/v1/auth/login returns 400 on missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    // Zod validation fails → 400
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/login returns 401 on invalid credentials', async () => {
    // Login first resolves tenant, then looks up user
    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({ id: 'tenant-001', slug: 'default' });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpass123' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login returns 403 for suspended clinicians', async () => {
    const passwordHash = await bcrypt.hash('DemoPassword2026!', 10);

    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: TENANT_ID,
      slug: 'default',
    });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: USER_ID,
      tenantId: TENANT_ID,
      email: 'pending.clinician@example.com',
      passwordHash,
      role: 'CLINICIAN',
      status: 'SUSPENDED',
      mfaEnabled: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'pending.clinician@example.com',
        password: 'DemoPassword2026!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/pending supervisor approval/i);
  });

  it('POST /api/v1/auth/refresh returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    // Should error — needs refreshToken in body
    expect([400, 401]).toContain(res.status);
  });

  it('GET /api/v1/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me returns user with valid token', async () => {
    const mockUser = {
      id: USER_ID,
      tenantId: TENANT_ID,
      email: 'dr.smith@clinic.com',
      role: 'CLINICIAN',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: null,
      mfaEnabled: false,
      mfaMethod: null,
      lastLogin: null,
      status: 'ACTIVE',
      createdAt: new Date(),
    };
    (prisma.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('email', 'dr.smith@clinic.com');
  });

  it('POST /api/v1/auth/logout requires authentication', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─── Patient Endpoints ───────────────────────────────────────────────

describe('Patient routes', () => {
  it('GET /api/v1/patients returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/patients');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/patients returns 200 for clinician', async () => {
    (prisma.patient.findMany as Mock).mockResolvedValueOnce([]);
    (prisma.patient.count as Mock).mockResolvedValueOnce(0);

    const res = await request(app)
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${clinicianToken()}`);

    // May return data array or object with data property
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/patients/:id returns 404 when not found', async () => {
    (prisma.patient.findUnique as Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}`)
      .set('Authorization', `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/patients/:id/consent returns canonical consent fields', async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({ id: PATIENT_ID, tenantId: TENANT_ID, userId: USER_ID });
    (prisma.consentRecord.findMany as Mock).mockResolvedValueOnce([
      {
        id: 'consent-001',
        patientId: PATIENT_ID,
        type: 'data-collection',
        version: 3,
        granted: true,
        grantedAt: new Date('2026-03-06T00:00:00.000Z'),
        revokedAt: null,
        createdAt: new Date('2026-03-06T00:00:00.000Z'),
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/consent`)
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: 'consent-001',
      patientId: PATIENT_ID,
      consentType: 'data-collection',
      accepted: true,
      version: '3',
      type: 'data-collection',
      granted: true,
    });
  });
});

// ─── Clinician Endpoints ─────────────────────────────────────────────

describe('Clinician routes', () => {
  it('GET /api/v1/clinician/dashboard returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/clinician/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/clinician/dashboard returns 403 for patients', async () => {
    const res = await request(app)
      .get('/api/v1/clinician/dashboard')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/clinician/triage returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/clinician/triage');
    expect(res.status).toBe(401);
  });
});

// ─── Analytics Endpoints ─────────────────────────────────────────────

describe('Analytics routes', () => {
  it('GET /api/v1/analytics/population returns 403 for patients', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/population')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/analytics/kpi returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/kpi');

    expect(res.status).toBe(401);
  });
});

// ─── Compliance Endpoints ────────────────────────────────────────────

describe('Compliance routes', () => {
  it('GET /api/v1/compliance/posture returns 403 for patients', async () => {
    const res = await request(app)
      .get('/api/v1/compliance/posture')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/compliance/audit-log returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/v1/compliance/audit-log');

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/compliance/audit-log returns 200 for compliance officer', async () => {
    (prisma.auditLog.findMany as Mock).mockResolvedValueOnce([]);
    (prisma.auditLog.count as Mock).mockResolvedValueOnce(0);

    const res = await request(app)
      .get('/api/v1/compliance/audit-log')
      .set('Authorization', `Bearer ${complianceToken()}`);

    expect(res.status).toBe(200);
  });
});

// ─── Upload Endpoints ────────────────────────────────────────────────

describe('Upload routes', () => {
  it('GET /api/v1/uploads/allowed-types returns 200 with types', async () => {
    const res = await request(app)
      .get('/api/v1/uploads/allowed-types')
      .set('Authorization', `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('allowedTypes');
    expect(Array.isArray(res.body.data.allowedTypes)).toBe(true);
  });

  it('POST /api/v1/uploads/presign returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/presign')
      .send({ filename: 'test.pdf', contentType: 'application/pdf', category: 'document' });

    expect(res.status).toBe(401);
  });
});

// ─── AI Endpoints ────────────────────────────────────────────────────

describe('AI routes', () => {
  it('POST /api/v1/ai/chat returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
  });
});

// ─── Crisis Endpoints ────────────────────────────────────────────────

describe('Crisis routes', () => {
  it('POST /api/v1/crisis/alert returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/crisis/alert')
      .send({ patientId: PATIENT_ID, severity: 'T3', summary: 'test' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/crisis/alert returns 400 on empty body', async () => {
    const res = await request(app)
      .post('/api/v1/crisis/alert')
      .set('Authorization', `Bearer ${clinicianToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── Voice Upload Gate ───────────────────────────────────────────────

describe('Voice upload gate (UGO-1.2)', () => {
  it('POST /api/v1/patients/:id/voice returns 501 (feature stub)', async () => {
    const res = await request(app)
      .post(`/api/v1/patients/${PATIENT_ID}/voice`)
      .set('Authorization', `Bearer ${patientToken()}`)
      .send({});

    expect(res.status).toBe(501);
    expect(res.body.error).toHaveProperty('code', 'FEATURE_COMING_SOON');
  });
});

// ─── Clinician Extended Routes ───────────────────────────────────────

describe('Clinician extended routes', () => {
  it('GET /api/v1/clinician/caseload returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/clinician/caseload');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/clinician/escalations returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/clinician/escalations');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/clinician/escalations returns 403 for patients', async () => {
    const res = await request(app)
      .get('/api/v1/clinician/escalations')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });
});

// ─── Compliance Extended Routes ──────────────────────────────────────

describe('Compliance extended routes', () => {
  it('GET /api/v1/compliance/regulatory returns 200 for compliance officer', async () => {
    const res = await request(app)
      .get('/api/v1/compliance/regulatory')
      .set('Authorization', `Bearer ${complianceToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hipaa');
    expect(res.body.data).toHaveProperty('soc2');
  });
});

// ─── Auth Extended Routes ────────────────────────────────────────────

describe('Auth extended routes', () => {
  it('POST /api/v1/auth/forgot-password returns 200 (always)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'test@example.com' });

    // Always returns 200 to prevent email enumeration
    expect(res.status).toBe(200);
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('404 response includes error code', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.body.error).toHaveProperty('code', 'REQUEST_ERROR');
    expect(res.body.error).toHaveProperty('message');
  });
});
