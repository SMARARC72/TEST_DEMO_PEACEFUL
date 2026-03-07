import { describe, it, expect, vi, type Mock } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../services/realtime.js", () => ({
  broadcastClinicianEvent: vi.fn(),
  registerWsClient: vi.fn(),
  unregisterWsClient: vi.fn(),
}));

import { app } from "../server.js";
import { prisma } from "../models/index.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const TENANT_ID = "tenant-001";
const ADMIN_ID = "admin-001";

function adminToken() {
  return jwt.sign(
    {
      sub: ADMIN_ID,
      tid: TENANT_ID,
      role: "ADMIN",
      permissions: [],
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
}

describe("Organization approval routes", () => {
  it("GET /api/v1/organizations/pending-clinicians lists tenant-scoped pending clinicians for admins", async () => {
    (prisma.user.findMany as Mock).mockResolvedValueOnce([
      {
        id: "pending-001",
        tenantId: TENANT_ID,
        email: "pending.clinician@example.com",
        firstName: "Pending",
        status: "SUSPENDED",
        role: "CLINICIAN",
        createdAt: new Date("2026-03-07T08:00:00.000Z"),
        orgMemberships: [
          {
            role: "MEMBER",
            organization: {
              id: "org-001",
              name: "North Clinic",
              slug: "north-clinic",
            },
          },
        ],
      },
    ]);

    const res = await request(app)
      .get("/api/v1/organizations/pending-clinicians")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pendingClinicians).toEqual([
      expect.objectContaining({
        id: "pending-001",
        email: "pending.clinician@example.com",
        firstName: "Pending",
        organizations: [
          expect.objectContaining({
            id: "org-001",
            name: "North Clinic",
            role: "MEMBER",
          }),
        ],
      }),
    ]);
  });

  it("PATCH /api/v1/organizations/pending-clinicians/:userId/approve activates a suspended clinician", async () => {
    (prisma.user.findUnique as Mock).mockResolvedValueOnce({
      id: "pending-001",
      tenantId: TENANT_ID,
      email: "pending.clinician@example.com",
      firstName: "Pending",
      status: "SUSPENDED",
      role: "CLINICIAN",
      createdAt: new Date("2026-03-07T08:00:00.000Z"),
      orgMemberships: [],
    });
    (prisma.user.update as Mock).mockResolvedValueOnce({
      id: "pending-001",
      status: "ACTIVE",
    });

    const res = await request(app)
      .patch("/api/v1/organizations/pending-clinicians/pending-001/approve")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "pending-001" },
      data: { status: "ACTIVE" },
    });
    expect(res.body.data).toMatchObject({
      message: "User approved successfully",
      userId: "pending-001",
    });
  });

  it("PATCH /api/v1/organizations/:id/members/:userId/approve lets platform admins bypass org membership checks", async () => {
    (prisma.user.findUnique as Mock).mockResolvedValueOnce({
      id: "pending-002",
      tenantId: TENANT_ID,
      email: "org.pending@example.com",
      firstName: "OrgPending",
      status: "SUSPENDED",
      role: "CLINICIAN",
      createdAt: new Date("2026-03-07T08:00:00.000Z"),
      orgMemberships: [
        {
          role: "MEMBER",
          organization: {
            id: "org-123",
            name: "Care Clinic",
            slug: "care-clinic",
          },
        },
      ],
    });
    (prisma.user.update as Mock).mockResolvedValueOnce({
      id: "pending-002",
      status: "ACTIVE",
    });

    const res = await request(app)
      .patch("/api/v1/organizations/org-123/members/pending-002/approve")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      message: "User approved successfully",
      userId: "pending-002",
    });
  });
});
