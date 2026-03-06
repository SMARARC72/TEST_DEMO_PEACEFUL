// ─── Job Queue Tests ─────────────────────────────────────────────────
// UGO-1.1: Verifies BullMQ queue initialisation, enqueue helper,
// health metrics, and graceful degradation when Redis is unavailable.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Since tests run without REDIS_URL, the queue falls back to inline mode.
// We verify the inline fallback path and the interface contracts.

describe('job-queue', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure no REDIS_URL so we test the inline fallback
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enqueueSubmission returns inline fallback when no Redis', async () => {
    const { enqueueSubmission } = await import('../services/job-queue.js');
    const result = await enqueueSubmission('sub-test-001');
    expect(result).toEqual({
      jobId: 'inline-sub-test-001',
      queued: false,
    });
  });

  it('getQueue returns null when REDIS_URL is not set', async () => {
    const { getQueue } = await import('../services/job-queue.js');
    expect(getQueue()).toBeNull();
  });

  it('startWorker returns null when REDIS_URL is not set', async () => {
    const { startWorker } = await import('../services/job-queue.js');
    expect(startWorker()).toBeNull();
  });

  it('getQueueHealth returns available=false when no Redis', async () => {
    const { getQueueHealth } = await import('../services/job-queue.js');
    const health = await getQueueHealth();
    expect(health).toEqual({
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    });
  });

  it('shutdownQueue resolves cleanly when no queue is active', async () => {
    const { shutdownQueue } = await import('../services/job-queue.js');
    await expect(shutdownQueue()).resolves.toBeUndefined();
  });

  it('QUEUE_NAME is "submission-pipeline"', async () => {
    const { QUEUE_NAME } = await import('../services/job-queue.js');
    expect(QUEUE_NAME).toBe('submission-pipeline');
  });
});
