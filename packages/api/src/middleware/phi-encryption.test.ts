// ─── PHI Encryption Middleware Tests ─────────────────────────────────
import { describe, it, expect } from "vitest";
import {
  PHI_FIELD_MAP,
  JSON_PHI_FIELD_MAP,
  encryptFields,
  decryptFields,
} from "../middleware/phi-encryption.js";
import { encryptField, decryptField } from "../services/encryption.js";

describe("PHI Field Map", () => {
  it("defines PHI fields for all expected models", () => {
    const expectedModels = [
      "Patient",
      "Submission",
      "TriageItem",
      "AIDraft",
      "MemoryProposal",
      "SessionNote",
      "MBCScore",
      "ChatMessage",
      "ChatSessionSummary",
      "SDOHAssessment",
    ];

    for (const model of expectedModels) {
      expect(PHI_FIELD_MAP[model]).toBeDefined();
      expect(PHI_FIELD_MAP[model].length).toBeGreaterThan(0);
    }
  });

  it("SessionNote has all SOAP fields", () => {
    const fields = PHI_FIELD_MAP["SessionNote"];
    expect(fields).toContain("subjective");
    expect(fields).toContain("objective");
    expect(fields).toContain("assessment");
    expect(fields).toContain("plan");
  });

  it("Patient has emergency contact and diagnosis fields", () => {
    const fields = PHI_FIELD_MAP["Patient"];
    expect(fields).toContain("emergencyName");
    expect(fields).toContain("emergencyPhone");
    expect(fields).toContain("diagnosisPrimary");
  });

  it("ChatSessionSummary has encrypted string and JSON PHI fields", () => {
    expect(PHI_FIELD_MAP["ChatSessionSummary"]).toEqual(
      expect.arrayContaining(["clinicianSummary", "reviewNotes"]),
    );
    expect(JSON_PHI_FIELD_MAP["ChatSessionSummary"]).toEqual(
      expect.arrayContaining([
        "recommendations",
        "evidenceLog",
        "patternFlags",
        "riskIndicators",
        "unknowns",
      ]),
    );
  });
});

describe("encrypt/decrypt round-trip for PHI fields", () => {
  it("encrypts Patient emergency contact fields", () => {
    const name = "Jane Doe";
    const phone = "+1-555-0123";

    const encName = encryptField(name);
    const encPhone = encryptField(phone);

    expect(encName).not.toBe(name);
    expect(encPhone).not.toBe(phone);
    expect(decryptField(encName)).toBe(name);
    expect(decryptField(encPhone)).toBe(phone);
  });

  it("encrypts Submission clinical content", () => {
    const rawContent = "I have been feeling very anxious about work lately.";
    const encrypted = encryptField(rawContent);
    expect(encrypted).not.toBe(rawContent);
    expect(decryptField(encrypted)).toBe(rawContent);
  });

  it("encrypts SessionNote SOAP fields", () => {
    const soap = {
      subjective: "Patient reports increased anxiety.",
      objective: "Psychomotor agitation observed.",
      assessment: "GAD, moderate severity.",
      plan: "Continue CBT, add breathing exercises.",
    };

    for (const [, value] of Object.entries(soap)) {
      const encrypted = encryptField(value);
      expect(encrypted).not.toBe(value);
      expect(decryptField(encrypted)).toBe(value);
    }
  });

  it("encrypts and decrypts ChatSessionSummary PHI fields", () => {
    const original = {
      clinicianSummary: "Patient described panic symptoms after work meetings.",
      reviewNotes: "Supervisor requested manual follow-up before approval.",
      recommendations: [
        {
          title: "Grounding exercise reinforcement",
          description: "Encourage 5-4-3-2-1 grounding after meetings.",
        },
      ],
      evidenceLog: [
        {
          patientStatement: "I dread the Monday staff meeting all weekend.",
          clinicalPattern: "anticipatory anxiety",
        },
      ],
      patternFlags: [{ pattern: "avoidance", frequency: "weekly" }],
      riskIndicators: [
        {
          indicator: "sleep disruption",
          contextQuote: "I only slept 3 hours.",
        },
      ],
      unknowns: ["Whether panic symptoms occur outside work settings"],
    };

    const encrypted = encryptFields("ChatSessionSummary", original);

    expect(encrypted.clinicianSummary).not.toBe(original.clinicianSummary);
    expect(encrypted.reviewNotes).not.toBe(original.reviewNotes);
    expect(typeof encrypted.recommendations).toBe("string");
    expect(typeof encrypted.evidenceLog).toBe("string");
    expect(typeof encrypted.patternFlags).toBe("string");
    expect(typeof encrypted.riskIndicators).toBe("string");
    expect(typeof encrypted.unknowns).toBe("string");

    const decrypted = decryptFields("ChatSessionSummary", encrypted);

    expect(decrypted).toEqual(original);
  });
});
