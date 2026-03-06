import { z } from "zod";
/** Validates Patient creation / update payloads. */
export declare const patientSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    age: z.ZodNumber;
    pronouns: z.ZodString;
    language: z.ZodString;
    emergencyContact: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        relationship: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        phone: string;
        relationship: string;
    }, {
        name: string;
        phone: string;
        relationship: string;
    }>;
    diagnosis: z.ZodObject<{
        primary: z.ZodString;
        code: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        primary: string;
    }, {
        code: string;
        primary: string;
    }>;
    treatmentStart: z.ZodString;
    medications: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        dosage: z.ZodString;
        frequency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        dosage: string;
        frequency: string;
    }, {
        name: string;
        dosage: string;
        frequency: string;
    }>, "many">;
    allergies: z.ZodArray<z.ZodString, "many">;
    careTeam: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
    }, {
        name: string;
        role: string;
    }>, "many">;
    preferences: z.ZodObject<{
        notifications: z.ZodBoolean;
        language: z.ZodString;
        theme: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        language: string;
        notifications: boolean;
        theme: string;
    }, {
        language: string;
        notifications: boolean;
        theme: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    name: string;
    age: number;
    pronouns: string;
    language: string;
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    diagnosis: {
        code: string;
        primary: string;
    };
    treatmentStart: string;
    medications: {
        name: string;
        dosage: string;
        frequency: string;
    }[];
    allergies: string[];
    careTeam: {
        name: string;
        role: string;
    }[];
    preferences: {
        language: string;
        notifications: boolean;
        theme: string;
    };
}, {
    id: string;
    tenantId: string;
    name: string;
    age: number;
    pronouns: string;
    language: string;
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    diagnosis: {
        code: string;
        primary: string;
    };
    treatmentStart: string;
    medications: {
        name: string;
        dosage: string;
        frequency: string;
    }[];
    allergies: string[];
    careTeam: {
        name: string;
        role: string;
    }[];
    preferences: {
        language: string;
        notifications: boolean;
        theme: string;
    };
}>;
/** Validates new patient submission payloads. */
export declare const submissionSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    tenantId: z.ZodString;
    source: z.ZodEnum<["JOURNAL", "CHECKIN", "VOICE_MEMO"]>;
    status: z.ZodEnum<["PENDING", "PROCESSING", "READY", "REVIEWED"]>;
    rawContent: z.ZodString;
    patientReport: z.ZodObject<{
        tone: z.ZodString;
        summary: z.ZodString;
        nextStep: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tone: string;
        summary: string;
        nextStep: string;
    }, {
        tone: string;
        summary: string;
        nextStep: string;
    }>;
    clinicianReport: z.ZodObject<{
        signalBand: z.ZodEnum<["LOW", "GUARDED", "MODERATE", "ELEVATED"]>;
        summary: z.ZodString;
        evidence: z.ZodArray<z.ZodString, "many">;
        unknowns: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        signalBand: "LOW" | "GUARDED" | "MODERATE" | "ELEVATED";
        evidence: string[];
        unknowns: string[];
    }, {
        summary: string;
        signalBand: "LOW" | "GUARDED" | "MODERATE" | "ELEVATED";
        evidence: string[];
        unknowns: string[];
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    status: "PENDING" | "PROCESSING" | "READY" | "REVIEWED";
    patientId: string;
    source: "JOURNAL" | "CHECKIN" | "VOICE_MEMO";
    rawContent: string;
    patientReport: {
        tone: string;
        summary: string;
        nextStep: string;
    };
    clinicianReport: {
        summary: string;
        signalBand: "LOW" | "GUARDED" | "MODERATE" | "ELEVATED";
        evidence: string[];
        unknowns: string[];
    };
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    tenantId: string;
    status: "PENDING" | "PROCESSING" | "READY" | "REVIEWED";
    patientId: string;
    source: "JOURNAL" | "CHECKIN" | "VOICE_MEMO";
    rawContent: string;
    patientReport: {
        tone: string;
        summary: string;
        nextStep: string;
    };
    clinicianReport: {
        summary: string;
        signalBand: "LOW" | "GUARDED" | "MODERATE" | "ELEVATED";
        evidence: string[];
        unknowns: string[];
    };
    createdAt: string;
    updatedAt: string;
}>;
/** Validates triage status change requests with transition enforcement. */
export declare const triageUpdateSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    currentStatus: z.ZodEnum<["ACK", "IN_REVIEW", "ESCALATED", "RESOLVED"]>;
    newStatus: z.ZodEnum<["ACK", "IN_REVIEW", "ESCALATED", "RESOLVED"]>;
    assignedTo: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    currentStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    newStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    assignedTo?: string | undefined;
    note?: string | undefined;
}, {
    id: string;
    currentStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    newStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    assignedTo?: string | undefined;
    note?: string | undefined;
}>, {
    id: string;
    currentStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    newStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    assignedTo?: string | undefined;
    note?: string | undefined;
}, {
    id: string;
    currentStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    newStatus: "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
    assignedTo?: string | undefined;
    note?: string | undefined;
}>;
/** Validates AI draft review actions. */
export declare const draftReviewSchema: z.ZodObject<{
    id: z.ZodString;
    submissionId: z.ZodString;
    status: z.ZodEnum<["DRAFT", "REVIEWED", "APPROVED", "REJECTED", "ESCALATED"]>;
    format: z.ZodEnum<["SOAP", "NARRATIVE", "STRUCTURED"]>;
    reviewedBy: z.ZodString;
    reviewNotes: z.ZodOptional<z.ZodString>;
    suppressedItems: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "REVIEWED" | "APPROVED" | "REJECTED" | "ESCALATED" | "DRAFT";
    submissionId: string;
    format: "SOAP" | "NARRATIVE" | "STRUCTURED";
    reviewedBy: string;
    reviewNotes?: string | undefined;
    suppressedItems?: string[] | undefined;
}, {
    id: string;
    status: "REVIEWED" | "APPROVED" | "REJECTED" | "ESCALATED" | "DRAFT";
    submissionId: string;
    format: "SOAP" | "NARRATIVE" | "STRUCTURED";
    reviewedBy: string;
    reviewNotes?: string | undefined;
    suppressedItems?: string[] | undefined;
}>;
/** Validates SOAP session notes. */
export declare const sessionNoteSchema: z.ZodObject<{
    id: z.ZodString;
    patientId: z.ZodString;
    clinicianId: z.ZodString;
    date: z.ZodString;
    format: z.ZodLiteral<"SOAP">;
    subjective: z.ZodString;
    objective: z.ZodString;
    assessment: z.ZodString;
    plan: z.ZodString;
    signed: z.ZodBoolean;
    signedBy: z.ZodOptional<z.ZodString>;
    signedAt: z.ZodOptional<z.ZodString>;
    coSignedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    date: string;
    patientId: string;
    format: "SOAP";
    clinicianId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    signed: boolean;
    signedBy?: string | undefined;
    signedAt?: string | undefined;
    coSignedBy?: string | undefined;
}, {
    id: string;
    date: string;
    patientId: string;
    format: "SOAP";
    clinicianId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    signed: boolean;
    signedBy?: string | undefined;
    signedAt?: string | undefined;
    coSignedBy?: string | undefined;
}>;
/** Validates a 6-digit MFA verification code. */
export declare const mfaVerifySchema: z.ZodObject<{
    userId: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    userId: string;
}, {
    code: string;
    userId: string;
}>;
/** Validates email + password login requests. */
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
/** Validates user registration requests (PRD §3.3). */
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["PATIENT", "CLINICIAN"]>>;
    tenantSlug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "CLINICIAN" | "PATIENT";
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSlug?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "CLINICIAN" | "PATIENT" | undefined;
    tenantSlug?: string | undefined;
}>;
/** Validates pagination query parameters (PRD §3.3). */
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
/** Validates file upload metadata (PRD §3.3). */
export declare const fileUploadSchema: z.ZodObject<{
    fileName: z.ZodString;
    mimeType: z.ZodEnum<["audio/wav", "audio/mpeg", "audio/webm", "audio/ogg", "application/pdf", "text/plain", "image/jpeg", "image/png"]>;
    sizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    mimeType: "audio/wav" | "audio/mpeg" | "audio/webm" | "audio/ogg" | "application/pdf" | "text/plain" | "image/jpeg" | "image/png";
    sizeBytes: number;
}, {
    fileName: string;
    mimeType: "audio/wav" | "audio/mpeg" | "audio/webm" | "audio/ogg" | "application/pdf" | "text/plain" | "image/jpeg" | "image/png";
    sizeBytes: number;
}>;
/** Validates patient daily check-in submissions. */
export declare const checkinSchema: z.ZodObject<{
    mood: z.ZodNumber;
    stress: z.ZodNumber;
    sleep: z.ZodNumber;
    focus: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mood: number;
    stress: number;
    sleep: number;
    focus: number;
    notes?: string | undefined;
}, {
    mood: number;
    stress: number;
    sleep: number;
    focus: number;
    notes?: string | undefined;
}>;
/** Validates patient journal submissions. */
export declare const journalSchema: z.ZodObject<{
    content: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    content: string;
    tags?: string[] | undefined;
}, {
    content: string;
    tags?: string[] | undefined;
}>;
/** Validates crisis escalation reports. */
export declare const crisisReportSchema: z.ZodObject<{
    patientId: z.ZodString;
    severity: z.ZodEnum<["P0", "P1", "P2", "P3"]>;
    description: z.ZodString;
    immediateRisk: z.ZodBoolean;
    contactAttempted: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    severity: "P0" | "P1" | "P2" | "P3";
    description: string;
    immediateRisk: boolean;
    contactAttempted: boolean;
}, {
    patientId: string;
    severity: "P0" | "P1" | "P2" | "P3";
    description: string;
    immediateRisk: boolean;
    contactAttempted?: boolean | undefined;
}>;
/** Validates AI chat message requests. */
export declare const aiChatSchema: z.ZodObject<{
    message: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    context: z.ZodDefault<z.ZodEnum<["therapy", "coping", "general"]>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    context: "therapy" | "coping" | "general";
    sessionId?: string | undefined;
}, {
    message: string;
    sessionId?: string | undefined;
    context?: "therapy" | "coping" | "general" | undefined;
}>;
/** Validates a single UUID route parameter. */
export declare const uuidParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
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
//# sourceMappingURL=index.d.ts.map