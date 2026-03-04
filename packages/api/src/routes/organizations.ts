// ─── Organization / Practice Routes ──────────────────────────────────
// CRUD for organizations, membership management, and invitation flow.
// Clinicians create practices; patients join via invite tokens.

import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { UserRole } from "@peacefull/shared";
import { prisma } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";
import { apiLogger } from "../utils/logger.js";
import { sendEmail } from "../services/notification.js";

export const organizationRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 64);
}

/** Verify the requesting user is a member of the org with one of the allowed roles. */
async function requireOrgRole(
  userId: string,
  orgId: string,
  ...roles: string[]
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    throw new AppError("Not a member of this organization", 403);
  }
  if (roles.length > 0 && !roles.includes(membership.role)) {
    throw new AppError("Insufficient organization role", 403);
  }
  return membership;
}

// ─── POST /organizations — Create a new practice ─────────────────────

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  npi: z.string().optional(),
  taxId: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
});

organizationRouter.post(
  "/",
  authenticate,
  requireRole(UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const data = createOrgSchema.parse(req.body);
      const userId = req.user!.sub;
      const tenantId = req.user!.tid;

      // Generate unique slug
      let slug = slugify(data.name);
      const existing = await prisma.organization.findFirst({
        where: { tenantId, slug },
      });
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const org = await prisma.$transaction(async (tx) => {
        const newOrg = await tx.organization.create({
          data: {
            tenantId,
            name: data.name,
            slug,
            npi: data.npi ?? null,
            taxId: data.taxId ?? null,
            address: data.address ?? undefined,
            phone: data.phone ?? null,
            website: data.website ?? null,
          },
        });

        // Creator becomes OWNER
        await tx.orgMembership.create({
          data: {
            orgId: newOrg.id,
            userId,
            role: "OWNER",
          },
        });

        return newOrg;
      });

      apiLogger.info({ orgId: org.id, userId }, "Organization created");

      sendSuccess(res, req, org, 201);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /organizations/:id — Get org details ───────────────────────

organizationRouter.get("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const orgId = req.params.id as string;

    await requireOrgRole(userId, orgId);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: { select: { invitations: true } },
      },
    });

    if (!org) throw new AppError("Organization not found", 404);

    sendSuccess(res, req, org);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /organizations/:id — Update org details ──────────────────

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  npi: z.string().optional(),
  taxId: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

organizationRouter.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const orgId = req.params.id as string;

    await requireOrgRole(userId, orgId, "OWNER", "ADMIN");

    const data = updateOrgSchema.parse(req.body);

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.npi !== undefined && { npi: data.npi }),
        ...(data.taxId !== undefined && { taxId: data.taxId }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
    });

    sendSuccess(res, req, org);
  } catch (err) {
    next(err);
  }
});

// ─── GET /organizations/:id/members — List members ──────────────────

organizationRouter.get("/:id/members", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const orgId = req.params.id as string;

    await requireOrgRole(userId, orgId);

    const members = await prisma.orgMembership.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
            lastLogin: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    sendSuccess(res, req, { members });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /organizations/:id/members/:userId — Remove member ──────

organizationRouter.delete(
  "/:id/members/:userId",
  authenticate,
  async (req, res, next) => {
    try {
      const requesterId = req.user!.sub;
      const orgId = req.params.id as string;
      const targetUserId = req.params.userId as string;

      const requesterMembership = await requireOrgRole(
        requesterId,
        orgId,
        "OWNER",
        "ADMIN",
      );

      // Owners can't remove themselves (must transfer ownership first)
      if (
        targetUserId === requesterId &&
        requesterMembership.role === "OWNER"
      ) {
        throw new AppError(
          "Owners cannot remove themselves. Transfer ownership first.",
          400,
        );
      }

      await prisma.orgMembership.delete({
        where: { orgId_userId: { orgId, userId: targetUserId } },
      });

      apiLogger.info(
        { orgId, removedUserId: targetUserId, removedBy: requesterId },
        "Organization member removed",
      );

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /organizations/:id/invite — Send invitation ───────────────

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["MEMBER", "ADMIN", "BILLING"]).default("MEMBER"),
});

organizationRouter.post("/:id/invite", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const orgId = req.params.id as string;

    await requireOrgRole(userId, orgId, "OWNER", "ADMIN");

    const data = inviteSchema.parse(req.body);

    // Check if already invited and pending
    const existingInvite = await prisma.orgInvitation.findFirst({
      where: {
        orgId,
        email: data.email,
        status: "PENDING",
      },
    });
    if (existingInvite) {
      throw new AppError(
        "An invitation is already pending for this email",
        409,
      );
    }

    // Check if already a member
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, tenantId: req.user!.tid },
    });
    if (existingUser) {
      const existingMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId, userId: existingUser.id } },
      });
      if (existingMembership) {
        throw new AppError(
          "User is already a member of this organization",
          409,
        );
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new AppError("Organization not found", 404);

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const invitation = await prisma.orgInvitation.create({
      data: {
        orgId,
        email: data.email,
        role: data.role,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send invitation email (fire-and-forget)
    const inviteUrl = `${process.env.FRONTEND_URL ?? "https://peacefullai.netlify.app"}/register?invite=${invitation.token}`;
    sendEmail(
      data.email,
      `You're invited to join ${org.name} on Peacefull`,
      "org-invitation",
      {
        organizationName: org.name,
        inviterName:
          `${inviter?.firstName ?? ""} ${inviter?.lastName ?? ""}`.trim(),
        inviteUrl,
        expiresAt: invitation.expiresAt.toLocaleDateString(),
      },
    ).catch((err) =>
      apiLogger.error(
        { err, email: data.email },
        "Failed to send org invitation email",
      ),
    );

    apiLogger.info(
      { orgId, invitationId: invitation.id, invitedEmail: data.email },
      "Organization invitation sent",
    );

    sendSuccess(res, req, { invitation }, 201);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /organizations/:id/invitations/:inviteId — Revoke ───────

organizationRouter.delete(
  "/:id/invitations/:inviteId",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const orgId = req.params.id as string;
      const inviteId = req.params.inviteId as string;

      await requireOrgRole(userId, orgId, "OWNER", "ADMIN");

      await prisma.orgInvitation.update({
        where: { id: inviteId, orgId },
        data: { status: "REVOKED" },
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /invitations/:token — Validate invite (public) ─────────────

organizationRouter.get("/invitations/:token", async (req, res, next) => {
  try {
    const invitation = await prisma.orgInvitation.findUnique({
      where: { token: req.params.token },
      include: {
        organization: { select: { name: true, slug: true } },
        inviter: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }
    if (invitation.status !== "PENDING") {
      throw new AppError(
        `Invitation has been ${invitation.status.toLowerCase()}`,
        410,
      );
    }
    if (invitation.expiresAt < new Date()) {
      // Auto-expire
      await prisma.orgInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new AppError("Invitation has expired", 410);
    }

    sendSuccess(res, req, {
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug,
      inviterName: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
      expiresAt: invitation.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /invitations/:token/accept — Accept invite + register ─────

const acceptInviteSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

organizationRouter.post(
  "/invitations/:token/accept",
  async (req, res, next) => {
    try {
      const data = acceptInviteSchema.parse(req.body);
      const token = req.params.token;

      const invitation = await prisma.orgInvitation.findUnique({
        where: { token },
        include: { organization: true },
      });

      if (!invitation) {
        throw new AppError("Invitation not found", 404);
      }
      if (invitation.status !== "PENDING") {
        throw new AppError(
          `Invitation has been ${invitation.status.toLowerCase()}`,
          410,
        );
      }
      if (invitation.expiresAt < new Date()) {
        await prisma.orgInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        throw new AppError("Invitation has expired", 410);
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Check if user already exists in this tenant
      let user = await prisma.user.findFirst({
        where: {
          tenantId: invitation.organization.tenantId,
          email: invitation.email,
        },
      });

      const result = await prisma.$transaction(async (tx) => {
        if (!user) {
          // Create new user
          user = await tx.user.create({
            data: {
              tenantId: invitation.organization.tenantId,
              email: invitation.email,
              passwordHash,
              role: "PATIENT",
              firstName: data.firstName,
              lastName: data.lastName,
              status: "ACTIVE",
            },
          });

          // Create patient profile
          await tx.patient.create({
            data: {
              userId: user.id,
              tenantId: invitation.organization.tenantId,
              age: 0,
            },
          });
        }

        // Add org membership
        await tx.orgMembership.create({
          data: {
            orgId: invitation.orgId,
            userId: user!.id,
            role: invitation.role,
          },
        });

        // Mark invitation as accepted
        await tx.orgInvitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });

        return user;
      });

      // Send welcome email (fire-and-forget)
      sendEmail(
        invitation.email,
        `Welcome to ${invitation.organization.name}`,
        "welcome",
        {
          firstName: data.firstName,
          email: invitation.email,
          role: "Patient",
          organizationName: invitation.organization.name,
        },
      ).catch((err) =>
        apiLogger.error(
          { err },
          "Failed to send welcome email after invite accept",
        ),
      );

      apiLogger.info(
        {
          userId: result!.id,
          orgId: invitation.orgId,
          invitationId: invitation.id,
        },
        "Invitation accepted, user joined organization",
      );

      sendSuccess(
        res,
        req,
        {
          message: "Invitation accepted. You can now sign in.",
          userId: result!.id,
        },
        201,
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /organizations (list user's orgs) ──────────────────────────

organizationRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.sub;

    const memberships = await prisma.orgMembership.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            npi: true,
            phone: true,
            createdAt: true,
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const organizations = memberships.map((m: typeof memberships[number]) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    sendSuccess(res, req, { organizations });
  } catch (err) {
    next(err);
  }
});

// ─── GET /organizations/:id/invitations — List pending invites ──────

organizationRouter.get(
  "/:id/invitations",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const orgId = req.params.id as string;

      await requireOrgRole(userId, orgId, "OWNER", "ADMIN");

      const invitations = await prisma.orgInvitation.findMany({
        where: { orgId },
        include: {
          inviter: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      sendSuccess(res, req, { invitations });
    } catch (err) {
      next(err);
    }
  },
);
