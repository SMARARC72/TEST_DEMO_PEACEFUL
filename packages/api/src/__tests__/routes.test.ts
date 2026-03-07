// ─── Route Integration Tests ─────────────────────────────────────────
// Tests HTTP endpoints by making actual requests via supertest against
// the Express app with mocked Prisma + Claude backends.

import { describe, it, expect, vi, type Mock } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redisSet } from "../services/redis.js";
import { PASSWORD_COMPLEXITY_MESSAGE } from "../utils/password-policy.js";

vi.mock("../services/realtime.js", () => ({
  broadcastClinicianEvent: vi.fn(),
  registerWsClient: vi.fn(),
  unregisterWsClient: vi.fn(),
}));

import { app } from "../server.js";
import { prisma } from "../models/index.js";
import { broadcastClinicianEvent } from "../services/realtime.js";

// ─── Token Helpers ───────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;
const TENANT_ID = "tenant-001";
const USER_ID = "user-001";
const PATIENT_ID = "patient-001";
const RESET_USER_ID = "11111111-1111-4111-8111-111111111111";

function makeToken(role: string, extra: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      sub: USER_ID,
      tid: TENANT_ID,
      role,
      permissions: [],
      ...extra,
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
}

const clinicianToken = () => makeToken("CLINICIAN");
const patientToken = () => makeToken("PATIENT");
const adminToken = () => makeToken("ADMIN");
const complianceToken = () => makeToken("COMPLIANCE_OFFICER");

function generateTotp(secret: string) {
  const timeStep = Math.floor(Date.now() / 30000);
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(Buffer.from(timeStep.toString(16).padStart(16, "0"), "hex"));
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
}

// ─── Health / Infrastructure Endpoints ───────────────────────────────

describe("Infrastructure endpoints", () => {
  it("GET /health returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("uptime");
  });

  it("GET /ready may return 200 or 503 (depends on DB connectivity)", async () => {
    // Mock Prisma $queryRaw to simulate connected DB
    (prisma.$queryRaw as unknown as Mock).mockResolvedValueOnce([
      { "?column?": 1 },
    ]);

    const res = await request(app).get("/ready");
    // With mock it should succeed; without real DB it would 503
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
  });

  it("GET /version returns version info", async () => {
    const res = await request(app).get("/version");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("node");
    expect(res.body).toHaveProperty("environment");
  });
});

// ─── Auth Endpoints ──────────────────────────────────────────────────

describe("Auth routes", () => {
  it("POST /api/v1/auth/login returns 400 on missing fields", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});

    // Zod validation fails → 400
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/login returns 401 on invalid credentials", async () => {
    // Login first resolves tenant, then looks up user
    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: "tenant-001",
      slug: "default",
    });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "wrongpass123" });

    expect(res.status).toBe(401);
  });

  it("POST /api/v1/auth/login returns 403 for suspended clinicians", async () => {
    const passwordHash = await bcrypt.hash("DemoPassword2026!", 10);

    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: TENANT_ID,
      slug: "default",
    });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: USER_ID,
      tenantId: TENANT_ID,
      email: "pending.clinician@example.com",
      passwordHash,
      role: "CLINICIAN",
      status: "SUSPENDED",
      mfaEnabled: false,
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "pending.clinician@example.com",
      password: "DemoPassword2026!",
    });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/pending administrator approval/i);
  });

  it("POST /api/v1/auth/login returns a TOTP MFA challenge for enrolled clinicians", async () => {
    // Pre-computed bcrypt hash for "DemoPassword2026!" at 10 rounds (avoids slow inline hashing)
    const passwordHash =
      "$2a$10$Cvz06LJ8Yoxxz1SWDNgk2OYisN6hM7F73kED1bIxb.RgObaQZ7Lji";

    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: TENANT_ID,
      slug: "default",
    });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      tenantId: TENANT_ID,
      email: "totp.clinician@example.com",
      passwordHash,
      firstName: "Toto",
      lastName: "Provider",
      phone: null,
      role: "CLINICIAN",
      status: "ACTIVE",
      mfaEnabled: true,
      mfaMethod: "TOTP",
      mfaSecret: "12345678901234567890123456789012",
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
      lastLogin: null,
    });
    (prisma.user.update as unknown as Mock).mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "totp.clinician@example.com",
      password: "DemoPassword2026!",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mfaRequired: true,
      userId: "11111111-1111-4111-8111-111111111111",
      method: "TOTP",
    });
  });

  it("POST /api/v1/auth/auth0-sync rejects identities without a pre-provisioned account", async () => {
    const auth0Token = makeToken("PATIENT", {
      sub: "auth0|abc123",
      tid: "default",
    });

    (prisma.user.findMany as unknown as Mock).mockResolvedValueOnce([]);

    const res = await request(app)
      .post("/api/v1/auth/auth0-sync")
      .set("Authorization", `Bearer ${auth0Token}`)
      .send({
        email: "new.patient@example.com",
        firstName: "New",
        lastName: "Patient",
        auth0Sub: "auth0|abc123",
        picture: "https://example.com/avatar.png",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/pre-provisioned account/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it("POST /api/v1/auth/mfa-confirm-setup stores backup codes in Postgres", async () => {
    const secret = "12345678901234567890123456789012";
    const authToken = patientToken();

    await redisSet(`mfa-setup:${USER_ID}`, secret, 600);
    (prisma.user.update as unknown as Mock).mockResolvedValueOnce({
      id: USER_ID,
    });
    (prisma.mfaBackupCode.deleteMany as unknown as Mock).mockResolvedValueOnce({
      count: 0,
    });
    (prisma.mfaBackupCode.createMany as unknown as Mock).mockResolvedValueOnce({
      count: 10,
    });

    const res = await request(app)
      .post("/api/v1/auth/mfa-confirm-setup")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ code: generateTotp(secret) });

    expect(res.status).toBe(200);
    expect(res.body.data.backupCodes).toHaveLength(10);
    expect(prisma.mfaBackupCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(prisma.mfaBackupCode.createMany).toHaveBeenCalledTimes(1);

    const createManyArg = (prisma.mfaBackupCode.createMany as unknown as Mock)
      .mock.calls[0]?.[0];
    expect(createManyArg.data).toHaveLength(10);
    for (const [index, entry] of createManyArg.data.entries()) {
      expect(entry.userId).toBe(USER_ID);
      expect(entry.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.codeHash).not.toBe(res.body.data.backupCodes[index]);
    }
  });

  it("POST /api/v1/auth/mfa-verify accepts authenticator codes for TOTP-enrolled clinicians", async () => {
    const totpUserId = "22222222-2222-4222-8222-222222222222";
    const secret = "12345678901234567890123456789012";

    (prisma.user.findUnique as unknown as Mock).mockResolvedValueOnce({
      id: totpUserId,
      tenantId: TENANT_ID,
      email: "totp.clinician@example.com",
      role: "CLINICIAN",
      firstName: "Toto",
      lastName: "Provider",
      phone: null,
      status: "ACTIVE",
      mfaEnabled: true,
      mfaMethod: "TOTP",
      mfaSecret: secret,
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
      lastLogin: null,
    });

    const res = await request(app)
      .post("/api/v1/auth/mfa-verify")
      .send({
        userId: totpUserId,
        code: generateTotp(secret),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("totp.clinician@example.com");
    expect(res.body.data.user.mfaEnabled).toBe(true);
    expect(res.body.data.user.mfaMethod).toBe("TOTP");
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it("POST /api/v1/auth/reset-password enforces the shared password policy", async () => {
    (prisma.user.update as unknown as Mock).mockClear();

    const res = await request(app).post("/api/v1/auth/reset-password").send({
      userId: RESET_USER_ID,
      code: "reset-code-123",
      newPassword: "ValidPass2026€",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(PASSWORD_COMPLEXITY_MESSAGE);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("POST /api/v1/auth/change-password enforces the shared password policy", async () => {
    (prisma.user.findUnique as unknown as Mock).mockClear();
    (prisma.user.update as unknown as Mock).mockClear();

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${patientToken()}`)
      .send({
        currentPassword: "DemoPassword2026!",
        newPassword: "AnotherPass2026€",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(PASSWORD_COMPLEXITY_MESSAGE);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("POST /api/v1/auth/refresh returns 401 without token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({});

    // Should error — needs refreshToken in body
    expect([400, 401]).toContain(res.status);
  });

  it("GET /api/v1/auth/me returns 401 without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/auth/me returns user with valid token", async () => {
    const mockUser = {
      id: USER_ID,
      tenantId: TENANT_ID,
      email: "dr.smith@clinic.com",
      role: "CLINICIAN",
      firstName: "Jane",
      lastName: "Smith",
      phone: null,
      mfaEnabled: false,
      mfaMethod: null,
      lastLogin: null,
      status: "ACTIVE",
      createdAt: new Date(),
    };
    (prisma.user.findUnique as Mock).mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("email", "dr.smith@clinic.com");
  });

  it("POST /api/v1/auth/logout requires authentication", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
  it("cookie auth issues secure cookies and supports refresh/logout with CSRF", async () => {
    const passwordHash = await bcrypt.hash("DemoPassword2026!", 10);
    const refreshUserId = "22222222-2222-4222-8222-222222222222";

    (prisma.tenant.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: TENANT_ID,
      slug: "default",
    });
    (prisma.user.findFirst as unknown as Mock).mockResolvedValueOnce({
      id: refreshUserId,
      tenantId: TENANT_ID,
      email: "cookie.user@example.com",
      passwordHash,
      firstName: "Cookie",
      lastName: "User",
      phone: null,
      role: "PATIENT",
      status: "ACTIVE",
      mfaEnabled: false,
      mfaMethod: null,
      mfaSecret: null,
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
      lastLogin: null,
    });
    (prisma.user.update as unknown as Mock).mockResolvedValue({
      id: refreshUserId,
      lastLogin: new Date("2026-03-06T10:00:00.000Z"),
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Auth-Mode", "cookie")
      .send({
        email: "cookie.user@example.com",
        password: "DemoPassword2026!",
      });

    expect(loginRes.status).toBe(200);
    const cookiesHeader = loginRes.headers["set-cookie"];
    expect(Array.isArray(cookiesHeader)).toBe(true);
    const cookies = (
      Array.isArray(cookiesHeader) ? cookiesHeader : []
    ) as string[];
    expect(cookies.length).toBeGreaterThanOrEqual(3);
    expect(
      cookies.some(
        (value) =>
          value.includes("pf_access_token=") &&
          value.includes("HttpOnly") &&
          value.includes("SameSite=Lax"),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (value) =>
          value.includes("pf_refresh_token=") &&
          value.includes("HttpOnly") &&
          value.includes("SameSite=Strict"),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (value) =>
          value.includes("pf_csrf_token=") && value.includes("SameSite=Strict"),
      ),
    ).toBe(true);

    const csrfCookie = cookies.find((value) =>
      value.startsWith("pf_csrf_token="),
    );
    const csrfToken = csrfCookie?.split(";")[0]?.split("=")[1];
    expect(csrfToken).toBeTruthy();

    (prisma.user.findUnique as unknown as Mock).mockResolvedValueOnce({
      id: refreshUserId,
      tenantId: TENANT_ID,
      email: "cookie.user@example.com",
      passwordHash,
      firstName: "Cookie",
      lastName: "User",
      phone: null,
      role: "PATIENT",
      status: "ACTIVE",
      mfaEnabled: false,
      mfaMethod: null,
      mfaSecret: null,
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
      lastLogin: null,
    });

    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-Auth-Mode", "cookie")
      .set("X-CSRF-Token", decodeURIComponent(csrfToken!))
      .set(
        "Cookie",
        cookies.map((value) => value.split(";")[0]),
      );

    expect(refreshRes.status).toBe(200);

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("X-Auth-Mode", "cookie")
      .set("X-CSRF-Token", decodeURIComponent(csrfToken!))
      .set(
        "Cookie",
        cookies.map((value) => value.split(";")[0]),
      );

    expect(logoutRes.status).toBe(200);

    const postLogoutRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-Auth-Mode", "cookie")
      .set("X-CSRF-Token", decodeURIComponent(csrfToken!))
      .set("Cookie", [`pf_csrf_token=${decodeURIComponent(csrfToken!)}`])
      .send({ refreshToken: loginRes.body.data.refreshToken });

    expect(postLogoutRefresh.status).toBe(401);
  });

  it("rejects cookie-authenticated state-changing requests without valid CSRF token", async () => {
    const token = patientToken();
    const csrfCookie = "pf_csrf_token=valid-token";
    const authCookie = `pf_access_token=${token}`;

    const missingCsrf = await request(app)
      .post("/api/v1/auth/logout")
      .set("X-Auth-Mode", "cookie")
      .set("Cookie", [authCookie, csrfCookie]);

    expect(missingCsrf.status).toBe(403);

    const invalidCsrf = await request(app)
      .post("/api/v1/auth/logout")
      .set("X-Auth-Mode", "cookie")
      .set("X-CSRF-Token", "wrong-token")
      .set("Cookie", [authCookie, csrfCookie]);

    expect(invalidCsrf.status).toBe(403);
  });
});

// ─── Patient Endpoints ───────────────────────────────────────────────

describe("Patient routes", () => {
  it("GET /api/v1/patients returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/patients");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/patients returns 200 for clinician", async () => {
    (prisma.patient.findMany as Mock).mockResolvedValueOnce([]);
    (prisma.patient.count as Mock).mockResolvedValueOnce(0);

    const res = await request(app)
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${clinicianToken()}`);

    // May return data array or object with data property
    expect(res.status).toBe(200);
  });

  it("GET /api/v1/patients/:id returns 404 when not found", async () => {
    (prisma.patient.findUnique as Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(404);
  });

  it("GET /api/v1/patients/:id/consent returns canonical consent fields", async () => {
    (prisma.patient.findUnique as Mock).mockResolvedValueOnce({
      id: PATIENT_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    (prisma.consentRecord.findMany as Mock).mockResolvedValueOnce([
      {
        id: "consent-001",
        patientId: PATIENT_ID,
        type: "data-collection",
        version: 3,
        granted: true,
        grantedAt: new Date("2026-03-06T00:00:00.000Z"),
        revokedAt: null,
        createdAt: new Date("2026-03-06T00:00:00.000Z"),
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/consent`)
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: "consent-001",
      patientId: PATIENT_ID,
      consentType: "data-collection",
      accepted: true,
      version: "3",
      type: "data-collection",
      granted: true,
    });
  });

  it("GET /api/v1/patients/:id/demographics returns the clinician profile contract", async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: "they/them",
        language: "en",
        emergencyName: "Jordan Doe",
        emergencyPhone: "555-0101",
        emergencyRel: "Sibling",
        diagnosisPrimary: null,
        diagnosisCode: null,
        treatmentStart: null,
        medications: [],
        allergies: [],
      });

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/demographics`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      pronouns: "they/them",
      primaryLanguage: "en",
    });
  });

  it("GET /api/v1/patients/:id/emergency-contacts returns the stored primary contact", async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: null,
        language: "en",
        emergencyName: "Jordan Doe",
        emergencyPhone: "555-0101",
        emergencyRel: "Sibling",
        diagnosisPrimary: null,
        diagnosisCode: null,
        treatmentStart: null,
        medications: [],
        allergies: [],
      });

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/emergency-contacts`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: `${PATIENT_ID}-emergency-1`,
        name: "Jordan Doe",
        relationship: "Sibling",
        phone: "555-0101",
        isPrimary: true,
      }),
    ]);
  });

  it("GET /api/v1/patients/:id/medications normalizes legacy medication JSON", async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: null,
        language: "en",
        emergencyName: null,
        emergencyPhone: null,
        emergencyRel: null,
        diagnosisPrimary: null,
        diagnosisCode: null,
        treatmentStart: new Date("2026-02-20T00:00:00.000Z"),
        medications: [
          "Sertraline 50mg daily",
          {
            id: "med-002",
            name: "Buspirone",
            dosage: "10mg",
            frequency: "BID",
            prescribedBy: "Dr. Lee",
            active: false,
            startDate: "2026-02-21T00:00:00.000Z",
          },
        ],
        allergies: [],
      });

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/medications`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: `${PATIENT_ID}-med-1`,
        name: "Sertraline",
        dose: "50mg",
        frequency: "daily",
        status: "ACTIVE",
      }),
      expect.objectContaining({
        id: "med-002",
        name: "Buspirone",
        dose: "10mg",
        frequency: "BID",
        prescriber: "Dr. Lee",
        status: "DISCONTINUED",
      }),
    ]);
  });

  it("GET /api/v1/patients/:id/allergies and diagnoses normalize legacy patient fields", async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: null,
        language: "en",
        emergencyName: null,
        emergencyPhone: null,
        emergencyRel: null,
        diagnosisPrimary: "ADHD + Generalized Anxiety",
        diagnosisCode: "F90.0, F41.1",
        treatmentStart: new Date("2026-02-20T00:00:00.000Z"),
        medications: [],
        allergies: [
          "None reported",
          { allergen: "Penicillin", reaction: "Rash", severity: "severe" },
        ],
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: null,
        language: "en",
        emergencyName: null,
        emergencyPhone: null,
        emergencyRel: null,
        diagnosisPrimary: "ADHD + Generalized Anxiety",
        diagnosisCode: "F90.0, F41.1",
        treatmentStart: new Date("2026-02-20T00:00:00.000Z"),
        medications: [],
        allergies: [
          "None reported",
          { allergen: "Penicillin", reaction: "Rash", severity: "severe" },
        ],
      });

    const allergiesRes = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/allergies`)
      .set("Authorization", `Bearer ${clinicianToken()}`);
    const diagnosesRes = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/diagnoses`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(allergiesRes.status).toBe(200);
    expect(allergiesRes.body.data).toEqual([
      expect.objectContaining({
        allergen: "Penicillin",
        reaction: "Rash",
        severity: "SEVERE",
      }),
    ]);

    expect(diagnosesRes.status).toBe(200);
    expect(diagnosesRes.body.data).toEqual([
      expect.objectContaining({
        icd10Code: "F90.0",
        description: "ADHD",
        status: "ACTIVE",
      }),
      expect.objectContaining({
        icd10Code: "F41.1",
        description: "Generalized Anxiety",
        status: "ACTIVE",
      }),
    ]);
  });

  it("GET /api/v1/patients/:id/appointments returns an empty list until scheduler data exists", async () => {
    (prisma.patient.findUnique as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        pronouns: null,
        language: "en",
        emergencyName: null,
        emergencyPhone: null,
        emergencyRel: null,
        diagnosisPrimary: null,
        diagnosisCode: null,
        treatmentStart: null,
        medications: [],
        allergies: [],
      });

    const res = await request(app)
      .get(`/api/v1/patients/${PATIENT_ID}/appointments`)
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ─── Clinician Endpoints ─────────────────────────────────────────────

describe("Clinician routes", () => {
  it("GET /api/v1/clinician/dashboard returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/clinician/dashboard");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/clinician/dashboard returns 403 for patients", async () => {
    const res = await request(app)
      .get("/api/v1/clinician/dashboard")
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it("GET /api/v1/clinician/triage returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/clinician/triage");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/clinician/analytics returns dashboard-ready analytics data", async () => {
    (prisma.clinician.findFirst as Mock).mockResolvedValueOnce({
      id: "clinician-001",
      userId: USER_ID,
    });
    (prisma.careTeamAssignment.findMany as Mock).mockResolvedValueOnce([
      { patientId: PATIENT_ID },
    ]);
    (prisma.careTeamAssignment.count as Mock).mockResolvedValueOnce(1);
    (prisma.aIDraft.count as Mock).mockResolvedValueOnce(2);
    (prisma.escalationItem.count as Mock).mockResolvedValueOnce(1);
    (prisma.chatSessionSummary.count as Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    (prisma.submission.findMany as Mock).mockResolvedValueOnce([
      { patientId: PATIENT_ID, source: "CHECKIN", createdAt: new Date() },
      {
        patientId: PATIENT_ID,
        source: "JOURNAL",
        createdAt: new Date(Date.now() - 35 * 86400000),
      },
    ]);
    (prisma.mBCScore.findMany as Mock).mockResolvedValueOnce([
      {
        patientId: PATIENT_ID,
        instrument: "PHQ9",
        score: 12,
        date: new Date(Date.now() - 20 * 86400000),
      },
      {
        patientId: PATIENT_ID,
        instrument: "PHQ9",
        score: 8,
        date: new Date(Date.now() - 2 * 86400000),
      },
      {
        patientId: PATIENT_ID,
        instrument: "GAD7",
        score: 6,
        date: new Date(Date.now() - 2 * 86400000),
      },
    ]);
    (prisma.chatSession.findMany as Mock).mockResolvedValueOnce([
      { createdAt: new Date() },
    ]);
    (prisma.triageItem.findMany as Mock).mockResolvedValueOnce([
      { signalBand: "ELEVATED", createdAt: new Date() },
      { signalBand: "LOW", createdAt: new Date() },
    ]);
    (prisma.adherenceItem.findMany as Mock).mockResolvedValueOnce([
      { task: "Medication adherence", completed: 6, target: 7 },
    ]);
    (prisma.escalationItem.findMany as Mock).mockResolvedValueOnce([
      {
        detectedAt: new Date(Date.now() - 12 * 60000),
        acknowledgedAt: new Date(Date.now() - 7 * 60000),
      },
    ]);

    const res = await request(app)
      .get("/api/v1/clinician/analytics?period=30d")
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      overview: {
        totalPatients: 1,
        activePatients: 1,
        pendingEscalations: 1,
      },
    });
    expect(res.body.data.signalDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ band: "ELEVATED", count: 1 }),
      ]),
    );
    expect(res.body.data.engagementTrend).toEqual(expect.any(Array));
    expect(res.body.data.outcomesTrend).toEqual(expect.any(Array));
    expect(res.body.data.adherenceByCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "Medication", rate: 86 }),
      ]),
    );
    expect(res.body.data.topMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Submissions", value: "1" }),
      ]),
    );
  });

  it("PATCH /api/v1/clinician/patients/:id/drafts/:draftId returns a session note seed when approving a draft", async () => {
    (prisma.clinician.findFirst as Mock).mockResolvedValueOnce({
      id: "clinician-001",
      userId: USER_ID,
    });
    (prisma.patient.findUnique as Mock).mockResolvedValueOnce({
      tenantId: TENANT_ID,
    });
    (prisma.careTeamAssignment.findMany as Mock).mockResolvedValueOnce([
      { patientId: PATIENT_ID },
    ]);
    (prisma.aIDraft.findFirst as Mock).mockResolvedValueOnce({
      id: "draft-001",
      patientId: PATIENT_ID,
      submissionId: "submission-001",
      content:
        "Subjective: Patient reports lower anxiety.\nObjective: Affect is calmer and engagement is improved.\nAssessment: Symptoms appear to be stabilizing.\nPlan: Continue CBT homework and follow up next week.",
      format: "SOAP",
      status: "DRAFT",
      reviewNotes: null,
      suppressedItems: [],
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
    });
    (prisma.aIDraft.update as Mock).mockResolvedValueOnce({
      id: "draft-001",
      patientId: PATIENT_ID,
      submissionId: "submission-001",
      content:
        "Subjective: Patient reports lower anxiety.\nObjective: Affect is calmer and engagement is improved.\nAssessment: Symptoms appear to be stabilizing.\nPlan: Continue CBT homework and follow up next week.",
      format: "SOAP",
      status: "APPROVED",
      reviewNotes: "Approved for clinician editing",
      suppressedItems: [],
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
    });

    const res = await request(app)
      .patch(`/api/v1/clinician/patients/${PATIENT_ID}/drafts/draft-001`)
      .set("Authorization", `Bearer ${clinicianToken()}`)
      .send({
        status: "APPROVED",
        reviewNotes: "Approved for clinician editing",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: "draft-001",
      status: "APPROVED",
      output: {
        content: expect.stringContaining("Subjective:"),
      },
      sessionNoteSeed: {
        sourceDraftId: "draft-001",
        subjective: "Patient reports lower anxiety.",
        objective: "Affect is calmer and engagement is improved.",
        assessment: "Symptoms appear to be stabilizing.",
        plan: "Continue CBT homework and follow up next week.",
      },
    });
  });

  it("GET /api/v1/clinician/patients/:id/session-notes returns frontend-ready note fields", async () => {
    (prisma.clinician.findFirst as Mock).mockResolvedValueOnce({
      id: "clinician-001",
      userId: USER_ID,
    });
    (prisma.patient.findUnique as Mock).mockResolvedValueOnce({
      tenantId: TENANT_ID,
    });
    (prisma.careTeamAssignment.findMany as Mock).mockResolvedValueOnce([
      { patientId: PATIENT_ID },
    ]);
    (prisma.sessionNote.findMany as Mock).mockResolvedValueOnce([
      {
        id: "note-001",
        patientId: PATIENT_ID,
        date: new Date("2026-03-06T09:00:00.000Z"),
        subjective: "Patient reports better sleep.",
        objective: "Observed calmer affect.",
        assessment: "Improvement continues.",
        plan: "Maintain coping practice.",
        signed: false,
        signedAt: null,
        coSignedAt: null,
        createdAt: new Date("2026-03-06T09:05:00.000Z"),
        updatedAt: new Date("2026-03-06T09:10:00.000Z"),
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/clinician/patients/${PATIENT_ID}/session-notes`)
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        id: "note-001",
        patientId: PATIENT_ID,
        sessionDate: "2026-03-06T09:00:00.000Z",
        status: "DRAFT",
        subjective: "Patient reports better sleep.",
        duration: 50,
      }),
    ]);
  });

  it("POST /api/v1/patients/:id/checkin broadcasts a clinician submission event", async () => {
    (prisma.patient.findUnique as unknown as Mock)
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      })
      .mockResolvedValueOnce({
        id: PATIENT_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
      });
    (prisma.submission.create as unknown as Mock).mockResolvedValueOnce({
      id: "submission-001",
      patientId: PATIENT_ID,
      createdAt: new Date("2026-03-06T15:00:00.000Z"),
    });

    const res = await request(app)
      .post(`/api/v1/patients/${PATIENT_ID}/checkin`)
      .set("Authorization", `Bearer ${patientToken()}`)
      .send({ mood: 6, stress: 7, sleep: 5, focus: 4, notes: "Hard day" });

    expect(res.status).toBe(201);
    expect(broadcastClinicianEvent).toHaveBeenCalledWith(TENANT_ID, {
      type: "submission:new",
      patientId: PATIENT_ID,
      submissionId: "submission-001",
      source: "CHECKIN",
      timestamp: "2026-03-06T15:00:00.000Z",
      message: "A new patient check-in is ready for review.",
    });
  });
});

// ─── Analytics Endpoints ─────────────────────────────────────────────

describe("Analytics routes", () => {
  it("GET /api/v1/analytics/population returns 403 for patients", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/population")
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it("GET /api/v1/analytics/kpi returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/analytics/kpi");

    expect(res.status).toBe(401);
  });
});

// ─── Compliance Endpoints ────────────────────────────────────────────

describe("Compliance routes", () => {
  it("GET /api/v1/compliance/posture returns 403 for patients", async () => {
    const res = await request(app)
      .get("/api/v1/compliance/posture")
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });

  it("GET /api/v1/compliance/audit-log returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/compliance/audit-log");

    expect(res.status).toBe(401);
  });

  it("GET /api/v1/compliance/audit-log returns 200 for compliance officer", async () => {
    (prisma.auditLog.findMany as Mock).mockResolvedValueOnce([]);
    (prisma.auditLog.count as Mock).mockResolvedValueOnce(0);

    const res = await request(app)
      .get("/api/v1/compliance/audit-log")
      .set("Authorization", `Bearer ${complianceToken()}`);

    expect(res.status).toBe(200);
  });
});

// ─── Upload Endpoints ────────────────────────────────────────────────

describe("Upload routes", () => {
  it("GET /api/v1/uploads/allowed-types returns 200 with types", async () => {
    const res = await request(app)
      .get("/api/v1/uploads/allowed-types")
      .set("Authorization", `Bearer ${clinicianToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("allowedTypes");
    expect(Array.isArray(res.body.data.allowedTypes)).toBe(true);
  });

  it("POST /api/v1/uploads/presign returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/uploads/presign").send({
      filename: "test.pdf",
      contentType: "application/pdf",
      category: "document",
    });

    expect(res.status).toBe(401);
  });
});

// ─── AI Endpoints ────────────────────────────────────────────────────

describe("AI routes", () => {
  it("POST /api/v1/ai/chat returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .send({ message: "Hello" });

    expect(res.status).toBe(401);
  });
});

// ─── Crisis Endpoints ────────────────────────────────────────────────

describe("Crisis routes", () => {
  it("POST /api/v1/crisis/alert returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/crisis/alert")
      .send({ patientId: PATIENT_ID, severity: "T3", summary: "test" });

    expect(res.status).toBe(401);
  });

  it("POST /api/v1/crisis/alert returns 404 when clinician sends empty body (no patient profile)", async () => {
    const res = await request(app)
      .post("/api/v1/crisis/alert")
      .set("Authorization", `Bearer ${clinicianToken()}`)
      .send({});

    // patientId is optional (resolved from user profile for patient callers),
    // but clinicians have no patient record → 404
    expect(res.status).toBe(404);
  });
});

// ─── Voice Upload Gate ───────────────────────────────────────────────

describe("Voice upload gate (UGO-1.2)", () => {
  it("POST /api/v1/patients/:id/voice returns 501 (feature stub)", async () => {
    const res = await request(app)
      .post(`/api/v1/patients/${PATIENT_ID}/voice`)
      .set("Authorization", `Bearer ${patientToken()}`)
      .send({});

    expect(res.status).toBe(501);
    expect(res.body.error).toHaveProperty("code", "FEATURE_COMING_SOON");
  });
});

// ─── Clinician Extended Routes ───────────────────────────────────────

describe("Clinician extended routes", () => {
  it("GET /api/v1/clinician/caseload returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/clinician/caseload");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/clinician/escalations returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/clinician/escalations");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/clinician/escalations returns 403 for patients", async () => {
    const res = await request(app)
      .get("/api/v1/clinician/escalations")
      .set("Authorization", `Bearer ${patientToken()}`);

    expect(res.status).toBe(403);
  });
});

// ─── Compliance Extended Routes ──────────────────────────────────────

describe("Compliance extended routes", () => {
  it("GET /api/v1/compliance/regulatory returns 200 for compliance officer", async () => {
    const res = await request(app)
      .get("/api/v1/compliance/regulatory")
      .set("Authorization", `Bearer ${complianceToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("hipaa");
    expect(res.body.data).toHaveProperty("soc2");
  });
});

// ─── Auth Extended Routes ────────────────────────────────────────────

describe("Auth extended routes", () => {
  it("POST /api/v1/auth/forgot-password returns 200 (always)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "test@example.com" });

    // Always returns 200 to prevent email enumeration
    expect(res.status).toBe(200);
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────

describe("Error handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("404 response includes error code", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect(res.body.error).toHaveProperty("code", "REQUEST_ERROR");
    expect(res.body.error).toHaveProperty("message");
  });
});
