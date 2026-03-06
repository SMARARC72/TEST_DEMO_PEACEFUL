/** Signal severity band used in clinician reports and triage. */
export declare enum SignalBand {
    LOW = "LOW",
    GUARDED = "GUARDED",
    MODERATE = "MODERATE",
    ELEVATED = "ELEVATED"
}
/** Source channel for a patient submission. */
export declare enum SubmissionSource {
    JOURNAL = "JOURNAL",
    CHECKIN = "CHECKIN",
    VOICE_MEMO = "VOICE_MEMO"
}
/** Processing lifecycle status for a submission. */
export declare enum SubmissionStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    READY = "READY",
    REVIEWED = "REVIEWED"
}
/** Approval lifecycle for patient memory items. */
export declare enum MemoryStatus {
    PROPOSED = "PROPOSED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CONFLICT_FLAGGED = "CONFLICT_FLAGGED"
}
/** Demographic + clinical baseline for a single patient. */
export interface Patient {
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
    /** Primary diagnosis with ICD-10 code. */
    diagnosis: {
        primary: string;
        /** ICD-10 code, e.g. "F33.1" */
        code: string;
    };
    treatmentStart: string;
    medications: Medication[];
    allergies: string[];
    careTeam: CareTeamMember[];
    preferences: PatientPreferences;
}
export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
}
export interface CareTeamMember {
    name: string;
    role: string;
}
export interface PatientPreferences {
    notifications: boolean;
    language: string;
    theme: string;
}
/**
 * A patient submission (journal, check-in, or voice memo) together with
 * the AI-generated patient-facing and clinician-facing reports.
 */
export interface PatientSubmission {
    id: string;
    patientId: string;
    tenantId: string;
    source: SubmissionSource;
    status: SubmissionStatus;
    rawContent: string;
    /** AI-generated summary shown to the patient. */
    patientReport: {
        tone: string;
        summary: string;
        nextStep: string;
    };
    /** AI-generated clinical summary for the care team. */
    clinicianReport: {
        signalBand: SignalBand;
        summary: string;
        evidence: string[];
        unknowns: string[];
    };
    createdAt: string;
    updatedAt: string;
}
/** Numeric daily check-in data (all scales 1-10). */
export interface CheckinData {
    mood: number;
    stress: number;
    sleep: number;
    focus: number;
    notes?: string;
}
export interface JournalEntry {
    id: string;
    patientId: string;
    content: string;
    promptId?: string;
    category: string;
    createdAt: string;
}
export interface VoiceMemo {
    id: string;
    patientId: string;
    audioUrl: string;
    transcription: string;
    duration: number;
    createdAt: string;
}
/** Pre-session preparation data surfaced to the clinician. */
export interface SessionPrep {
    date: string;
    time: string;
    duration: number;
    format: string;
    therapistId: string;
    topics: string[];
    customTopics: string[];
    goals: string[];
    previousSummary: string;
}
/** Gamification / engagement progress for a patient. */
export interface ProgressData {
    streak: number;
    xp: number;
    level: number;
    levelName: string;
    badges: Badge[];
    weeklyMood: number[];
    milestones: Milestone[];
}
export interface Badge {
    name: string;
    earnedAt: string;
    icon: string;
}
export interface Milestone {
    title: string;
    date: string;
    achieved: boolean;
}
/** Structured safety plan with versioned steps. */
export interface SafetyPlan {
    id: string;
    patientId: string;
    reviewedDate: string;
    steps: SafetyPlanStep[];
    version: number;
}
export interface SafetyPlanStep {
    title: string;
    items: string[];
}
/**
 * A single memory item extracted from patient interactions,
 * subject to clinician approval before use by AI agents.
 */
export interface PatientMemory {
    id: string;
    patientId: string;
    strategy: string;
    category: string;
    description: string;
    approvedBy: string;
    approvedDate: string;
    status: MemoryStatus;
}
//# sourceMappingURL=patient.d.ts.map