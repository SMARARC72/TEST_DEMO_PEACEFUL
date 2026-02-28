// ─── Notification Service Tests ──────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock logger before importing the service
vi.mock('../utils/logger.js', () => ({
  apiLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  sendEmail,
  sendSMS,
  sendPush,
  escalationCascade,
} from './notification.js';
import { apiLogger } from '../utils/logger.js';
import { EscalationTier, EscalationStatus } from '@peacefull/shared';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a stub message in test/dev environment', async () => {
    await sendEmail(
      'test@example.com',
      'Test Subject',
      'welcome',
      { name: 'Test User' },
    );

    expect(apiLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
      }),
      expect.stringContaining('STUB'),
    );
  });

  it('does not throw on valid input', async () => {
    await expect(
      sendEmail('user@domain.com', 'Hello', 'tpl', {}),
    ).resolves.toBeUndefined();
  });
});

describe('sendSMS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a stub message in test/dev environment', async () => {
    await sendSMS('+15551234567', 'Test message');

    expect(apiLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15551234567',
        message: 'Test message',
      }),
      expect.stringContaining('STUB'),
    );
  });
});

describe('sendPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a stub message in test/dev environment', async () => {
    await sendPush('user-123', 'Alert', 'Body text');

    expect(apiLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        title: 'Alert',
        body: 'Body text',
      }),
      expect.stringContaining('STUB'),
    );
  });
});

describe('escalationCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiates push + email for T2 escalation', async () => {
    const escalation = {
      id: 'esc-1',
      tier: EscalationTier.T2,
      trigger: 'PHQ-9 score ≥ 20',
      patientId: 'patient-001',
      status: EscalationStatus.OPEN,
      assignedTo: 'clinician-001',
      createdAt: new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      auditTrail: [],
    };

    await escalationCascade(escalation);

    // Should log cascade initiated
    expect(apiLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'T2', patientId: 'patient-001' }),
      expect.stringContaining('Escalation cascade'),
    );

    // Push + Email called (2 stub logs for T2), cascade completed (1 info log)
    // In stub mode: push info + email info + cascade completed info = 3 calls
    const infoCalls = (apiLogger.info as ReturnType<typeof vi.fn>).mock.calls;
    expect(infoCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('additionally sends SMS for T3 escalation', async () => {
    const escalation = {
      id: 'esc-2',
      tier: EscalationTier.T3,
      trigger: 'Suicidal ideation detected',
      patientId: 'patient-002',
      status: EscalationStatus.OPEN,
      assignedTo: 'clinician-002',
      createdAt: new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      auditTrail: [],
    };

    await escalationCascade(escalation);

    // T3 has push + email + sms = 3 stub logs + cascade completed
    const infoCalls = (apiLogger.info as ReturnType<typeof vi.fn>).mock.calls;
    expect(infoCalls.length).toBeGreaterThanOrEqual(4);

    // SMS should mention urgent
    const smsCalls = infoCalls.filter(
      (call) => typeof call[0] === 'object' && 'message' in call[0],
    );
    expect(smsCalls.length).toBe(1);
    expect(smsCalls[0][0].message).toContain('URGENT');
  });
});
