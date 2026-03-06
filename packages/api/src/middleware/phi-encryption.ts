// ─── PHI Field-Level Encryption Middleware ───────────────────────────
// Prisma client extension that auto-encrypts PHI fields on create/update
// and auto-decrypts on read. Uses AES-256-GCM via the encryption service.
//
// PHI fields are defined per-model. Only string fields are encrypted
// (JSON fields like medications/allergies are stringified before encryption).

import { Prisma } from "@prisma/client";
import { encryptField, decryptField } from "../services/encryption.js";
import { apiLogger } from "../utils/logger.js";

// ─── PHI Field Map ───────────────────────────────────────────────────
// Maps model names → field names that contain PHI and must be encrypted.
// Only string (or stringified JSON) columns are eligible.

const PHI_FIELD_MAP: Record<string, readonly string[]> = {
  Patient: ["emergencyName", "emergencyPhone", "diagnosisPrimary"],
  Submission: ["rawContent", "patientSummary", "clinicianSummary"],
  TriageItem: ["summary"],
  AIDraft: ["content", "reviewNotes"],
  MemoryProposal: ["statement", "existing"],
  SessionNote: ["subjective", "objective", "assessment", "plan"],
  MBCScore: ["clinicianNote"],
  ChatMessage: ["content"],
  ChatSessionSummary: ["clinicianSummary", "reviewNotes"],
  SDOHAssessment: ["notes"],
} as const;

const JSON_PHI_FIELD_MAP: Record<string, readonly string[]> = {
  ChatSessionSummary: [
    "recommendations",
    "evidenceLog",
    "patternFlags",
    "riskIndicators",
    "unknowns",
  ],
} as const;

// Sentinel prefix to detect already-encrypted values (base64:base64:base64)
const ENCRYPTED_PATTERN =
  /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/;

function isEncrypted(value: string): boolean {
  return ENCRYPTED_PATTERN.test(value);
}

// ─── Encrypt Helpers ─────────────────────────────────────────────────

function encryptFields(
  modelName: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const fields = PHI_FIELD_MAP[modelName];
  const jsonFields = JSON_PHI_FIELD_MAP[modelName];
  if (!fields && !jsonFields) return data;

  const result = { ...data };
  for (const field of fields ?? []) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && !isEncrypted(value)) {
      try {
        result[field] = encryptField(value);
      } catch (err) {
        apiLogger.error(
          { model: modelName, field, err },
          "PHI encryption failed — aborting write to prevent plaintext storage",
        );
        throw new Error(
          `PHI encryption failed for ${modelName}.${field} — write aborted to protect patient data`,
        );
      }
    }
  }

  for (const field of jsonFields ?? []) {
    const value = result[field];
    if (value === undefined || value === null) {
      continue;
    }

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    if (serialized.length === 0 || isEncrypted(serialized)) {
      continue;
    }

    try {
      result[field] = encryptField(serialized);
    } catch (err) {
      apiLogger.error(
        { model: modelName, field, err },
        "PHI JSON encryption failed — aborting write to prevent plaintext storage",
      );
      throw new Error(
        `PHI encryption failed for ${modelName}.${field} — write aborted to protect patient data`,
      );
    }
  }

  return result;
}

function decryptFields(
  modelName: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const fields = PHI_FIELD_MAP[modelName];
  const jsonFields = JSON_PHI_FIELD_MAP[modelName];
  if (!fields && !jsonFields) return data;

  const result = { ...data };
  for (const field of fields ?? []) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && isEncrypted(value)) {
      try {
        result[field] = decryptField(value);
      } catch (err) {
        apiLogger.error(
          { model: modelName, field, err },
          "PHI decryption failed — returning encrypted value",
        );
      }
    }
  }

  for (const field of jsonFields ?? []) {
    const value = result[field];
    if (typeof value === "string" && value.length > 0 && isEncrypted(value)) {
      try {
        const decrypted = decryptField(value);
        try {
          result[field] = JSON.parse(decrypted);
        } catch {
          result[field] = decrypted;
        }
      } catch (err) {
        apiLogger.error(
          { model: modelName, field, err },
          "PHI JSON decryption failed — returning encrypted value",
        );
      }
    }
  }

  return result;
}

// ─── Recursive decrypt for nested includes ───────────────────────────

function decryptResult(modelName: string, result: unknown): unknown {
  if (result === null || result === undefined) return result;

  if (Array.isArray(result)) {
    return result.map((item) => decryptResult(modelName, item));
  }

  if (typeof result === "object") {
    return decryptFields(modelName, result as Record<string, unknown>);
  }

  return result;
}

// ─── Prisma Extension ────────────────────────────────────────────────

/**
 * Prisma client extension that intercepts all queries to encrypt/decrypt
 * PHI fields automatically. Apply via `prisma.$extends(phiEncryptionExtension)`.
 */
export const phiEncryptionExtension = Prisma.defineExtension({
  name: "phi-encryption",
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (args.data && PHI_FIELD_MAP[model]) {
          (args as { data: unknown }).data = encryptFields(
            model,
            args.data as Record<string, unknown>,
          );
        }
        const result = await query(args);
        return decryptResult(model, result);
      },

      async createMany({ model, args, query }) {
        if (args.data && PHI_FIELD_MAP[model]) {
          if (Array.isArray(args.data)) {
            (args as { data: unknown }).data = (
              args.data as Record<string, unknown>[]
            ).map((d) => encryptFields(model, d));
          } else {
            (args as { data: unknown }).data = encryptFields(
              model,
              args.data as Record<string, unknown>,
            );
          }
        }
        return query(args);
      },

      async update({ model, args, query }) {
        if (args.data && PHI_FIELD_MAP[model]) {
          (args as { data: unknown }).data = encryptFields(
            model,
            args.data as Record<string, unknown>,
          );
        }
        const result = await query(args);
        return decryptResult(model, result);
      },

      async updateMany({ model, args, query }) {
        if (args.data && PHI_FIELD_MAP[model]) {
          (args as { data: unknown }).data = encryptFields(
            model,
            args.data as Record<string, unknown>,
          );
        }
        return query(args);
      },

      async upsert({ model, args, query }) {
        if (PHI_FIELD_MAP[model]) {
          if (args.create) {
            (args as { create: unknown }).create = encryptFields(
              model,
              args.create as Record<string, unknown>,
            );
          }
          if (args.update) {
            (args as { update: unknown }).update = encryptFields(
              model,
              args.update as Record<string, unknown>,
            );
          }
        }
        const result = await query(args);
        return decryptResult(model, result);
      },

      async findUnique({ model, args, query }) {
        const result = await query(args);
        return decryptResult(model, result);
      },

      async findUniqueOrThrow({ model, args, query }) {
        const result = await query(args);
        return decryptResult(model, result);
      },

      async findFirst({ model, args, query }) {
        const result = await query(args);
        return decryptResult(model, result);
      },

      async findFirstOrThrow({ model, args, query }) {
        const result = await query(args);
        return decryptResult(model, result);
      },

      async findMany({ model, args, query }) {
        const result = await query(args);
        return decryptResult(model, result);
      },
    },
  },
});

export { PHI_FIELD_MAP };
export { JSON_PHI_FIELD_MAP, encryptFields, decryptFields };
