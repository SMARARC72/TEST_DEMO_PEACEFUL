"use strict";
// ─── Zod Validation Schemas ──────────────────────────────────────────
// Runtime validators that mirror the TypeScript interfaces.
// Used at API boundaries for request validation.
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidParamSchema = exports.aiChatSchema = exports.crisisReportSchema = exports.journalSchema = exports.checkinSchema = exports.fileUploadSchema = exports.paginationSchema = exports.registerSchema = exports.loginSchema = exports.mfaVerifySchema = exports.sessionNoteSchema = exports.draftReviewSchema = exports.triageUpdateSchema = exports.submissionSchema = exports.patientSchema = void 0;
const zod_1 = require("zod");
// ─── Reusable Enum Values ────────────────────────────────────────────
const signalBandValues = ["LOW", "GUARDED", "MODERATE", "ELEVATED"];
const submissionSourceValues = ["JOURNAL", "CHECKIN", "VOICE_MEMO"];
const submissionStatusValues = [
    "PENDING",
    "PROCESSING",
    "READY",
    "REVIEWED",
];
const triageStatusValues = [
    "ACK",
    "IN_REVIEW",
    "ESCALATED",
    "RESOLVED",
];
const draftStatusValues = [
    "DRAFT",
    "REVIEWED",
    "APPROVED",
    "REJECTED",
    "ESCALATED",
];
const draftFormatValues = ["SOAP", "NARRATIVE", "STRUCTURED"];
// ─── Patient Schema ──────────────────────────────────────────────────
/** Validates Patient creation / update payloads. */
exports.patientSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(200),
    age: zod_1.z.number().int().min(0).max(150),
    pronouns: zod_1.z.string().min(1),
    language: zod_1.z.string().min(2).max(10),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().min(1),
        phone: zod_1.z.string().min(7).max(20),
        relationship: zod_1.z.string().min(1),
    }),
    diagnosis: zod_1.z.object({
        primary: zod_1.z.string().min(1),
        code: zod_1.z
            .string()
            .regex(/^[A-Z]\d{2}(\.\d{1,4})?$/, "Must be a valid ICD-10 code"),
    }),
    treatmentStart: zod_1.z.string().datetime(),
    medications: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        dosage: zod_1.z.string().min(1),
        frequency: zod_1.z.string().min(1),
    })),
    allergies: zod_1.z.array(zod_1.z.string()),
    careTeam: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        role: zod_1.z.string().min(1),
    })),
    preferences: zod_1.z.object({
        notifications: zod_1.z.boolean(),
        language: zod_1.z.string().min(2),
        theme: zod_1.z.string().min(1),
    }),
});
// ─── Submission Schema ───────────────────────────────────────────────
/** Validates new patient submission payloads. */
exports.submissionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    patientId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    source: zod_1.z.enum(submissionSourceValues),
    status: zod_1.z.enum(submissionStatusValues),
    rawContent: zod_1.z.string().min(1).max(50_000),
    patientReport: zod_1.z.object({
        tone: zod_1.z.string().min(1),
        summary: zod_1.z.string().min(1),
        nextStep: zod_1.z.string().min(1),
    }),
    clinicianReport: zod_1.z.object({
        signalBand: zod_1.z.enum(signalBandValues),
        summary: zod_1.z.string().min(1),
        evidence: zod_1.z.array(zod_1.z.string()),
        unknowns: zod_1.z.array(zod_1.z.string()),
    }),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Triage Update Schema ────────────────────────────────────────────
/**
 * Valid triage status transitions:
 *   ACK → IN_REVIEW → RESOLVED
 *   any → ESCALATED
 */
const VALID_TRIAGE_TRANSITIONS = {
    ACK: ["IN_REVIEW", "ESCALATED"],
    IN_REVIEW: ["RESOLVED", "ESCALATED"],
    ESCALATED: ["RESOLVED"],
    RESOLVED: [],
};
/** Validates triage status change requests with transition enforcement. */
exports.triageUpdateSchema = zod_1.z
    .object({
    id: zod_1.z.string().uuid(),
    currentStatus: zod_1.z.enum(triageStatusValues),
    newStatus: zod_1.z.enum(triageStatusValues),
    assignedTo: zod_1.z.string().uuid().optional(),
    note: zod_1.z.string().max(2000).optional(),
})
    .refine((data) => {
    const allowed = VALID_TRIAGE_TRANSITIONS[data.currentStatus];
    return allowed !== undefined && allowed.includes(data.newStatus);
}, {
    message: "Invalid triage status transition",
    path: ["newStatus"],
});
// ─── Draft Review Schema ────────────────────────────────────────────
/** Validates AI draft review actions. */
exports.draftReviewSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    submissionId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(draftStatusValues),
    format: zod_1.z.enum(draftFormatValues),
    reviewedBy: zod_1.z.string().uuid(),
    reviewNotes: zod_1.z.string().max(5000).optional(),
    suppressedItems: zod_1.z.array(zod_1.z.string()).optional(),
});
// ─── Session Note Schema ─────────────────────────────────────────────
/** Validates SOAP session notes. */
exports.sessionNoteSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    patientId: zod_1.z.string().uuid(),
    clinicianId: zod_1.z.string().uuid(),
    date: zod_1.z.string().datetime(),
    format: zod_1.z.literal("SOAP"),
    subjective: zod_1.z.string().min(1).max(10_000),
    objective: zod_1.z.string().min(1).max(10_000),
    assessment: zod_1.z.string().min(1).max(10_000),
    plan: zod_1.z.string().min(1).max(10_000),
    signed: zod_1.z.boolean(),
    signedBy: zod_1.z.string().uuid().optional(),
    signedAt: zod_1.z.string().datetime().optional(),
    coSignedBy: zod_1.z.string().uuid().optional(),
});
// ─── MFA Verification Schema ────────────────────────────────────────
/** Validates a 6-digit MFA verification code. */
exports.mfaVerifySchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    code: zod_1.z.string().regex(/^\d{6}$/, "MFA code must be exactly 6 digits"),
});
// ─── Login Schema ────────────────────────────────────────────────────
/** Validates email + password login requests. */
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
// ─── Register Schema ─────────────────────────────────────────────────
/** Validates user registration requests (PRD §3.3). */
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z
        .string()
        .min(12, "Password must be at least 12 characters")
        .max(128)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/, "Password must contain uppercase, lowercase, digit, and special character"),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    role: zod_1.z.enum(["PATIENT", "CLINICIAN"]).default("PATIENT"),
    tenantSlug: zod_1.z.string().min(1).max(100).optional(),
});
// ─── Pagination Schema ───────────────────────────────────────────────
/** Validates pagination query parameters (PRD §3.3). */
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).max(1000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().min(1).max(50).optional(),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
// ─── File Upload Schema ──────────────────────────────────────────────
/** Validates file upload metadata (PRD §3.3). */
exports.fileUploadSchema = zod_1.z.object({
    fileName: zod_1.z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-zA-Z0-9._\-\s]+$/, "File name contains invalid characters"),
    mimeType: zod_1.z.enum([
        "audio/wav",
        "audio/mpeg",
        "audio/webm",
        "audio/ogg",
        "application/pdf",
        "text/plain",
        "image/jpeg",
        "image/png",
    ]),
    sizeBytes: zod_1.z
        .number()
        .int()
        .min(1)
        .max(50 * 1024 * 1024), // 50 MB max
});
// ─── Check-In Schema ─────────────────────────────────────────────────
/** Validates patient daily check-in submissions. */
exports.checkinSchema = zod_1.z.object({
    mood: zod_1.z.number().int().min(1).max(10),
    stress: zod_1.z.number().int().min(1).max(10),
    sleep: zod_1.z.number().int().min(0).max(24),
    focus: zod_1.z.number().int().min(1).max(10),
    notes: zod_1.z.string().max(5000).optional(),
});
// ─── Journal Schema ──────────────────────────────────────────────────
/** Validates patient journal submissions. */
exports.journalSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Journal entry cannot be empty").max(50_000),
    tags: zod_1.z.array(zod_1.z.string().max(50)).max(10).optional(),
});
// ─── Crisis Report Schema ─────────────────────────────────────────────
/** Validates crisis escalation reports. */
exports.crisisReportSchema = zod_1.z.object({
    patientId: zod_1.z.string().uuid(),
    severity: zod_1.z.enum(["P0", "P1", "P2", "P3"]),
    description: zod_1.z.string().min(1).max(10_000),
    immediateRisk: zod_1.z.boolean(),
    contactAttempted: zod_1.z.boolean().default(false),
});
// ─── AI Chat Schema ──────────────────────────────────────────────────
/** Validates AI chat message requests. */
exports.aiChatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(10_000),
    sessionId: zod_1.z.string().uuid().optional(),
    context: zod_1.z.enum(["therapy", "coping", "general"]).default("general"),
});
// ─── UUID Param Schema ───────────────────────────────────────────────
/** Validates a single UUID route parameter. */
exports.uuidParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
//# sourceMappingURL=index.js.map