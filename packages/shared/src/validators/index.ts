// ─── Zod Validation Schemas ──────────────────────────────────────────
// Runtime validators that mirror the TypeScript interfaces.
// Used at API boundaries for request validation.

import { z } from "zod";

// ─── Reusable Enum Values ────────────────────────────────────────────

const signalBandValues = ["LOW", "GUARDED", "MODERATE", "ELEVATED"] as const;
const submissionSourceValues = ["JOURNAL", "CHECKIN", "VOICE_MEMO"] as const;
const submissionStatusValues = [
  "PENDING",
  "PROCESSING",
  "READY",
  "REVIEWED",
] as const;
const triageStatusValues = [
  "ACK",
  "IN_REVIEW",
  "ESCALATED",
  "RESOLVED",
] as const;
const draftStatusValues = [
  "DRAFT",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
  "ESCALATED",
] as const;
const draftFormatValues = ["SOAP", "NARRATIVE", "STRUCTURED"] as const;

// ─── Patient Schema ──────────────────────────────────────────────────

/** Validates Patient creation / update payloads. */
export const patientSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(150),
  pronouns: z.string().min(1),
  language: z.string().min(2).max(10),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(7).max(20),
    relationship: z.string().min(1),
  }),
  diagnosis: z.object({
    primary: z.string().min(1),
    code: z
      .string()
      .regex(/^[A-Z]\d{2}(\.\d{1,4})?$/, "Must be a valid ICD-10 code"),
  }),
  treatmentStart: z.string().datetime(),
  medications: z.array(
    z.object({
      name: z.string().min(1),
      dosage: z.string().min(1),
      frequency: z.string().min(1),
    }),
  ),
  allergies: z.array(z.string()),
  careTeam: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
    }),
  ),
  preferences: z.object({
    notifications: z.boolean(),
    language: z.string().min(2),
    theme: z.string().min(1),
  }),
});

// ─── Submission Schema ───────────────────────────────────────────────

/** Validates new patient submission payloads. */
export const submissionSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  tenantId: z.string().uuid(),
  source: z.enum(submissionSourceValues),
  status: z.enum(submissionStatusValues),
  rawContent: z.string().min(1).max(50_000),
  patientReport: z.object({
    tone: z.string().min(1),
    summary: z.string().min(1),
    nextStep: z.string().min(1),
  }),
  clinicianReport: z.object({
    signalBand: z.enum(signalBandValues),
    summary: z.string().min(1),
    evidence: z.array(z.string()),
    unknowns: z.array(z.string()),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Triage Update Schema ────────────────────────────────────────────

/**
 * Valid triage status transitions:
 *   ACK → IN_REVIEW → RESOLVED
 *   any → ESCALATED
 */
const VALID_TRIAGE_TRANSITIONS: Record<string, readonly string[]> = {
  ACK: ["IN_REVIEW", "ESCALATED"],
  IN_REVIEW: ["RESOLVED", "ESCALATED"],
  ESCALATED: ["RESOLVED"],
  RESOLVED: [],
};

/** Validates triage status change requests with transition enforcement. */
export const triageUpdateSchema = z
  .object({
    id: z.string().uuid(),
    currentStatus: z.enum(triageStatusValues),
    newStatus: z.enum(triageStatusValues),
    assignedTo: z.string().uuid().optional(),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      const allowed = VALID_TRIAGE_TRANSITIONS[data.currentStatus];
      return allowed !== undefined && allowed.includes(data.newStatus);
    },
    {
      message: "Invalid triage status transition",
      path: ["newStatus"],
    },
  );

// ─── Draft Review Schema ────────────────────────────────────────────

/** Validates AI draft review actions. */
export const draftReviewSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  status: z.enum(draftStatusValues),
  format: z.enum(draftFormatValues),
  reviewedBy: z.string().uuid(),
  reviewNotes: z.string().max(5000).optional(),
  suppressedItems: z.array(z.string()).optional(),
});

// ─── Session Note Schema ─────────────────────────────────────────────

/** Validates SOAP session notes. */
export const sessionNoteSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  clinicianId: z.string().uuid(),
  date: z.string().datetime(),
  format: z.literal("SOAP"),
  subjective: z.string().min(1).max(10_000),
  objective: z.string().min(1).max(10_000),
  assessment: z.string().min(1).max(10_000),
  plan: z.string().min(1).max(10_000),
  signed: z.boolean(),
  signedBy: z.string().uuid().optional(),
  signedAt: z.string().datetime().optional(),
  coSignedBy: z.string().uuid().optional(),
});

// ─── MFA Verification Schema ────────────────────────────────────────

/** Validates a 6-digit MFA verification code. */
export const mfaVerifySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "MFA code must be exactly 6 digits"),
});

// ─── Login Schema ────────────────────────────────────────────────────

/** Validates email + password login requests. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ─── Register Schema ─────────────────────────────────────────────────

/** Validates user registration requests (PRD §3.3). */
export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
      "Password must contain uppercase, lowercase, digit, and special character",
    ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["PATIENT", "CLINICIAN"]).default("PATIENT"),
  tenantSlug: z.string().min(1).max(100).optional(),
});

// ─── Pagination Schema ───────────────────────────────────────────────

/** Validates pagination query parameters (PRD §3.3). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().min(1).max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── File Upload Schema ──────────────────────────────────────────────

/** Validates file upload metadata (PRD §3.3). */
export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._\-\s]+$/, "File name contains invalid characters"),
  mimeType: z.enum([
    "audio/wav",
    "audio/mpeg",
    "audio/webm",
    "audio/ogg",
    "application/pdf",
    "text/plain",
    "image/jpeg",
    "image/png",
  ]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024), // 50 MB max
});

// ─── Check-In Schema ─────────────────────────────────────────────────

/** Validates patient daily check-in submissions. */
export const checkinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  sleep: z.number().int().min(0).max(24),
  focus: z.number().int().min(1).max(10),
  notes: z.string().max(5000).optional(),
});

// ─── Journal Schema ──────────────────────────────────────────────────

/** Validates patient journal submissions. */
export const journalSchema = z.object({
  content: z.string().min(1, "Journal entry cannot be empty").max(50_000),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// ─── Crisis Report Schema ─────────────────────────────────────────────

/** Validates crisis escalation reports. */
export const crisisReportSchema = z.object({
  patientId: z.string().uuid(),
  severity: z.enum(["P0", "P1", "P2", "P3"]),
  description: z.string().min(1).max(10_000),
  immediateRisk: z.boolean(),
  contactAttempted: z.boolean().default(false),
});

// ─── AI Chat Schema ──────────────────────────────────────────────────

/** Validates AI chat message requests. */
export const aiChatSchema = z.object({
  message: z.string().min(1).max(10_000),
  sessionId: z.string().uuid().optional(),
  context: z.enum(["therapy", "coping", "general"]).default("general"),
});

// ─── UUID Param Schema ───────────────────────────────────────────────

/** Validates a single UUID route parameter. */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Inferred Types ──────────────────────────────────────────────────

export type PatientInput = z.infer<typeof patientSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type TriageUpdateInput = z.infer<typeof triageUpdateSchema>;
export type DraftReviewInput = z.infer<typeof draftReviewSchema>;
export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;
export type MFAVerifyInput = z.infer<typeof mfaVerifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type JournalInput = z.infer<typeof journalSchema>;
export type CrisisReportInput = z.infer<typeof crisisReportSchema>;
export type AIChatInput = z.infer<typeof aiChatSchema>;
export type UUIDParamInput = z.infer<typeof uuidParamSchema>;
