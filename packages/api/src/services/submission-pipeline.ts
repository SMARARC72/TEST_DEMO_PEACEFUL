// ─── Submission Processing Pipeline ──────────────────────────────────
// Orchestrates AI analysis when a new submission is created.
// Steps: summarize → risk assess → extract memories → create triage item.
// V2: Invoked by BullMQ worker (job-queue.ts) with retry + dead-letter.
// Falls back to inline execution when Redis is unavailable.

import { Prisma } from "@prisma/client";
import { prisma } from "../models/index.js";
import { claudeService } from "./claude.js";
import { apiLogger } from "../utils/logger.js";
import { escalationCascade, sendEmail } from "./notification.js";
import { broadcastClinicianEvent } from "./realtime.js";
import { EscalationTier, EscalationStatus } from "@peacefull/shared";
import type { EscalationItem } from "@peacefull/shared";

const logger = apiLogger.child({ service: "submission-pipeline" });

type JsonInput =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonInput | null }
  | Array<JsonInput | null>;
type JsonInputArray = Array<JsonInput | null>;

export interface ProcessingResult {
  submissionId: string;
  status: "READY" | "PROCESSING";
  signalBand: string;
  triageItemId?: string;
  aiDraftId?: string;
  memoriesProposed: number;
  error?: string;
}

/**
 * Processes a pending submission through the full AI pipeline:
 * 1. Update status to PROCESSING
 * 2. Run Claude summarize → populate patient/clinician summaries
 * 3. Run Claude risk assess → determine signal band
 * 4. Run Claude memory extract → create MemoryProposal records
 * 5. Create TriageItem for clinician queue
 * 6. Create AIDraft with the full clinical summary
 * 7. Update submission status to READY
 *
 * All AI results require clinician review before finalization.
 */
export async function processSubmission(
  submissionId: string,
): Promise<ProcessingResult> {
  logger.info({ submissionId }, "Starting submission processing");

  // Step 1: Mark as PROCESSING
  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "PROCESSING" },
    include: {
      patient: {
        select: {
          id: true,
          tenantId: true,
          diagnosisPrimary: true,
          diagnosisCode: true,
          language: true,
          careTeam: {
            where: { active: true, role: "Primary Therapist" },
            select: { clinicianId: true },
            take: 1,
          },
        },
      },
    },
  });

  const patientContext = {
    diagnosisPrimary: submission.patient.diagnosisPrimary,
    diagnosisCode: submission.patient.diagnosisCode,
    language: submission.patient.language,
    source: submission.source,
  };

  const primaryClinicianId =
    submission.patient.careTeam[0]?.clinicianId ?? null;

  try {
    // Step 2: Summarize
    const summaryResponse = await claudeService.summarize(
      submission.rawContent,
      patientContext,
    );

    let patientSummary = "Processing complete";
    let clinicianSummary = "AI summary generated — review required";
    let evidence: unknown[] = [];
    let unknowns: unknown[] = [];

    // Parse structured output (Claude returns JSON in content)
    try {
      const parsed = JSON.parse(summaryResponse.output.content);
      patientSummary = parsed.patientSummary ?? patientSummary;
      clinicianSummary = parsed.clinicianSummary ?? clinicianSummary;
      evidence = parsed.evidence ?? [];
      unknowns = parsed.unknowns ?? [];
    } catch {
      // If Claude doesn't return valid JSON, use the raw content
      clinicianSummary = summaryResponse.output.content;
    }

    // Step 3: Risk Assessment
    const riskResponse = await claudeService.assessRisk(submission.rawContent);

    let signalBand = "LOW";
    try {
      const parsed = JSON.parse(riskResponse.output.content);
      signalBand = parsed.signalBand ?? "LOW";
    } catch {
      signalBand = riskResponse.output.signalBand ?? "LOW";
    }

    // Validate signal band
    if (!["LOW", "GUARDED", "MODERATE", "ELEVATED"].includes(signalBand)) {
      signalBand = "LOW";
    }

    // Step 4: Memory Extraction
    const memoryResponse = await claudeService.extractMemories(
      submission.rawContent,
    );

    let memories: Array<{
      statement: string;
      category: string;
      confidence: number;
      evidence: string;
    }> = [];

    try {
      const parsed = JSON.parse(memoryResponse.output.content);
      if (Array.isArray(parsed)) {
        memories = parsed;
      }
    } catch {
      // No memories extracted — that's fine
    }

    // Step 5–7: Database writes in a transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update submission with AI results
        await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: "READY",
            patientSummary,
            patientTone: signalBand === "ELEVATED" ? "concerned" : "processed",
            patientNextStep:
              signalBand === "ELEVATED"
                ? "Your care team has been notified and will follow up soon."
                : "Your submission has been reviewed. Check back for updates.",
            clinicianSignalBand: signalBand as
              | "LOW"
              | "GUARDED"
              | "MODERATE"
              | "ELEVATED",
            clinicianSummary,
            clinicianEvidence: evidence as JsonInputArray,
            clinicianUnknowns: unknowns as JsonInputArray,
            processedAt: new Date(),
          },
        });

        // Create triage item
        // HIGH-003 FIX: ELEVATED starts as OPEN for immediate review;
        // all others start as ACK (acknowledged, queued for review).
        const triageItem = await tx.triageItem.create({
          data: {
            submissionId,
            patientId: submission.patientId,
            clinicianId: primaryClinicianId,
            signalBand: signalBand as
              | "LOW"
              | "GUARDED"
              | "MODERATE"
              | "ELEVATED",
            summary: clinicianSummary,
            status: signalBand === "ELEVATED" ? "IN_REVIEW" : "ACK",
          },
        });

        // Create AI draft
        const aiDraft = await tx.aIDraft.create({
          data: {
            submissionId,
            patientId: submission.patientId,
            content: clinicianSummary,
            format: "STRUCTURED",
            status: "DRAFT",
            modelVersion: summaryResponse.model,
            tokenUsage: {
              summarize: summaryResponse.usage,
              risk: riskResponse.usage,
              memory: memoryResponse.usage,
            },
          },
        });

        // Create memory proposals
        let memoriesCreated = 0;
        for (const mem of memories) {
          try {
            await tx.memoryProposal.create({
              data: {
                patientId: submission.patientId,
                category: mem.category ?? "GENERAL",
                statement: mem.statement,
                confidence: Math.max(0, Math.min(1, mem.confidence ?? 0.5)),
                status: "PROPOSED",
                evidence: mem.evidence ? [mem.evidence] : [],
              },
            });
            memoriesCreated++;
          } catch (err) {
            logger.warn(
              { err, memory: mem },
              "Failed to create memory proposal",
            );
          }
        }

        return {
          triageItemId: triageItem.id,
          aiDraftId: aiDraft.id,
          memoriesProposed: memoriesCreated,
        };
      },
    );

    logger.info(
      { submissionId, signalBand, ...result },
      "Submission processing complete",
    );

    const timestamp = new Date().toISOString();

    broadcastClinicianEvent(submission.patient.tenantId, {
      type: "triage:new",
      triageId: result.triageItemId,
      patientId: submission.patientId,
      signal: signalBand,
      timestamp,
      message: `A ${signalBand.toLowerCase()} signal submission requires clinician review.`,
    });

    broadcastClinicianEvent(submission.patient.tenantId, {
      type: "draft:ready",
      draftId: result.aiDraftId,
      patientId: submission.patientId,
      timestamp,
      message: "An AI draft is ready for clinician review.",
    });

    // If signal is ELEVATED, trigger escalation cascade (T2)
    // MED-012: Deduplicate — skip if OPEN/ACK T2 already exists within 60min
    if (signalBand === "ELEVATED") {
      const DEDUP_WINDOW_MS = 60 * 60 * 1000;
      const existingEscalation = await prisma.escalationItem.findFirst({
        where: {
          patientId: submission.patientId,
          tier: "T2",
          status: { in: ["OPEN", "ACK"] },
          detectedAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
        },
      });

      if (existingEscalation) {
        logger.info(
          { submissionId, existingId: existingEscalation.id },
          "Duplicate T2 escalation suppressed — existing OPEN found",
        );
      } else {
        const escalationPayload: EscalationItem = {
          id: result.triageItemId,
          patientId: submission.patientId,
          tier: EscalationTier.T2,
          trigger: `Elevated signal detected in ${submission.source} submission`,
          status: EscalationStatus.OPEN,
          detectedAt: new Date().toISOString(),
          auditTrail: [
            {
              action: "AI_ESCALATION",
              by: "system",
              at: new Date().toISOString(),
              note: `Automated T2 escalation — signal band: ${signalBand}`,
            },
          ],
        };
        escalationCascade(escalationPayload).catch((err) => {
          logger.error(
            { err, submissionId },
            "Escalation cascade failed after submission processing",
          );
        });
      }
    } else if (signalBand === "MODERATE") {
      // For MODERATE signals, send clinician email notification only (no full cascade)
      sendEmail(
        "alerts@peacefull.cloud",
        `[MODERATE] Patient submission requires attention — ${submission.patientId}`,
        "escalation-alert",
        {
          tier: "MODERATE",
          trigger: `Moderate signal in ${submission.source} submission`,
          patientId: submission.patientId,
          timestamp: new Date().toISOString(),
        },
      ).catch((err) => {
        logger.error(
          { err, submissionId },
          "Moderate signal notification failed",
        );
      });
    }

    return {
      submissionId,
      status: "READY",
      signalBand,
      ...result,
    };
  } catch (err) {
    // On failure, mark as PENDING again so it can be retried
    logger.error({ submissionId, err }, "Submission processing failed");

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "PENDING",
        clinicianSummary: "AI processing failed — manual review required",
      },
    });

    return {
      submissionId,
      status: "PROCESSING",
      signalBand: "LOW",
      memoriesProposed: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
