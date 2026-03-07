// ─── BullMQ Job Queue ────────────────────────────────────────────────
// Wraps submission-pipeline.processSubmission() in a BullMQ worker with
// retry, backoff, and dead-letter semantics.  Uses the existing Redis
// connection configured via REDIS_URL.
//
// UGO-1.1 (HIGH-004): Moves the synchronous AI pipeline off the HTTP
// request path so callers get 202 Accepted immediately.

import { createRequire } from "node:module";
import type { Queue, Worker, Job, ConnectionOptions } from "bullmq";
import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";
import type { ProcessingResult } from "./submission-pipeline.js";

const require = createRequire(import.meta.url);
const logger = apiLogger.child({ service: "job-queue" });

type BullMqModule = typeof import("bullmq");

let bullMqModule: BullMqModule | null = null;

function getBullMqModule(): BullMqModule {
  bullMqModule ??= require("bullmq") as BullMqModule;
  return bullMqModule;
}

// ─── Queue name ──────────────────────────────────────────────────────
export const QUEUE_NAME = "submission-pipeline";

// ─── Redis connection (reuses REDIS_URL from env) ────────────────────
function getRedisConnection(): ConnectionOptions | undefined {
  if (!env.REDIS_URL) return undefined;
  return { url: env.REDIS_URL };
}

// ─── Queue singleton (lazy) ──────────────────────────────────────────

let _queue: Queue | null = null;

/**
 * Returns the BullMQ queue instance.  Falls back to a lightweight
 * in-memory shim when Redis is unavailable (dev / test) that simply
 * calls processSubmission() directly.
 */
export function getQueue(): Queue | null {
  if (_queue) return _queue;
  const conn = getRedisConnection();
  if (!conn) {
    logger.warn("REDIS_URL not set — job queue will run inline (no BullMQ)");
    return null;
  }
  const { Queue } = getBullMqModule();
  _queue = new Queue(QUEUE_NAME, {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 500, age: 86_400 }, // keep 500 or 24h
      removeOnFail: { count: 1_000, age: 604_800 }, // keep 1000 or 7d
    },
  });
  logger.info("BullMQ queue initialised: %s", QUEUE_NAME);
  return _queue;
}

// ─── Worker ──────────────────────────────────────────────────────────

let _worker: Worker | null = null;

async function runSubmissionPipeline(
  submissionId: string,
): Promise<ProcessingResult> {
  const { processSubmission } = await import("./submission-pipeline.js");
  return processSubmission(submissionId);
}

/**
 * Starts the BullMQ worker that processes submission-pipeline jobs.
 * Idempotent — safe to call multiple times.
 */
export function startWorker(): Worker | null {
  if (_worker) return _worker;
  const conn = getRedisConnection();
  if (!conn) return null;
  const { Worker } = getBullMqModule();

  _worker = new Worker<{ submissionId: string }, ProcessingResult>(
    QUEUE_NAME,
    async (job: Job<{ submissionId: string }>) => {
      logger.info(
        {
          jobId: job.id,
          submissionId: job.data.submissionId,
          attempt: job.attemptsMade + 1,
        },
        "Processing submission job",
      );
      return runSubmissionPipeline(job.data.submissionId);
    },
    {
      connection: conn,
      concurrency: 3,
      limiter: { max: 10, duration: 60_000 }, // max 10 jobs / minute
    },
  );

  _worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Submission job completed");
  });

  _worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      "Submission job failed",
    );
  });

  logger.info("BullMQ worker started: %s (concurrency=3)", QUEUE_NAME);
  return _worker;
}

// ─── Enqueue helper ──────────────────────────────────────────────────

export interface EnqueueResult {
  jobId: string;
  queued: boolean;
}

/**
 * Enqueue a submission for async processing.
 * Falls back to synchronous (fire-and-forget) when Redis / BullMQ
 * is unavailable.
 */
export async function enqueueSubmission(
  submissionId: string,
): Promise<EnqueueResult> {
  const queue = getQueue();

  if (queue) {
    const job = await queue.add(
      "process",
      { submissionId },
      {
        jobId: `sub-${submissionId}`, // idempotent: same submission → same job
      },
    );
    logger.info({ jobId: job.id, submissionId }, "Submission enqueued");
    return { jobId: job.id ?? `sub-${submissionId}`, queued: true };
  }

  // Fallback: run inline (same as V1 behaviour)
  logger.info(
    { submissionId },
    "Running submission pipeline inline (no Redis)",
  );
  if (env.NODE_ENV === "test") {
    return { jobId: `inline-${submissionId}`, queued: false };
  }

  queueMicrotask(() => {
    void runSubmissionPipeline(submissionId).catch((err: unknown) => {
      // Errors handled inside processSubmission (resets to PENDING)
      void err;
    });
  });
  return { jobId: `inline-${submissionId}`, queued: false };
}

// ─── Queue health metrics ────────────────────────────────────────────

export interface QueueHealth {
  available: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Returns current queue depth metrics for the /ready health endpoint.
 */
export async function getQueueHealth(): Promise<QueueHealth> {
  const queue = getQueue();
  if (!queue) {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
  try {
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
    );
    return {
      available: true,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  } catch {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
}

// ─── Graceful shutdown ───────────────────────────────────────────────

export async function shutdownQueue(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
  logger.info("BullMQ queue shut down");
}
