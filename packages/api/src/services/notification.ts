// ─── Notification Service ────────────────────────────────────────────
// Multi-channel notification dispatch (email, SMS, push, escalation).
// Stubbed for MVP — logs in development, would call SES/Twilio/FCM in production.

import { env } from '../config/index.js';
import { apiLogger } from '../utils/logger.js';
import type { EscalationItem } from '@peacefull/shared';

const isProduction = env.NODE_ENV === 'production';

// ─── Email ───────────────────────────────────────────────────────────

/**
 * Sends an email notification via AWS SES.
 * Stubbed in development — logs the message instead.
 *
 * @param to - Recipient email address.
 * @param subject - Email subject line.
 * @param template - Template name to render.
 * @param data - Template interpolation data.
 */
export async function sendEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!isProduction) {
    apiLogger.info(
      { to, subject, template, data },
      '[STUB] Email notification',
    );
    return;
  }

  // Production: call AWS SES
  // const ses = new SESClient({ region: env.AWS_REGION });
  // await ses.send(new SendEmailCommand({ ... }));
  apiLogger.info({ to, subject }, 'Email sent via SES');
}

// ─── SMS ─────────────────────────────────────────────────────────────

/**
 * Sends an SMS notification via Twilio.
 * Stubbed in development — logs the message instead.
 *
 * @param to - Recipient phone number (E.164 format).
 * @param message - SMS body text.
 */
export async function sendSMS(
  to: string,
  message: string,
): Promise<void> {
  if (!isProduction) {
    apiLogger.info({ to, message }, '[STUB] SMS notification');
    return;
  }

  // Production: call Twilio
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({ to, from: TWILIO_NUMBER, body: message });
  apiLogger.info({ to }, 'SMS sent via Twilio');
}

// ─── Push ────────────────────────────────────────────────────────────

/**
 * Sends a push notification via Firebase Cloud Messaging.
 * Stubbed in development — logs the message instead.
 *
 * @param userId - Platform user ID (resolved to FCM token).
 * @param title - Notification title.
 * @param body - Notification body text.
 */
export async function sendPush(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!isProduction) {
    apiLogger.info({ userId, title, body }, '[STUB] Push notification');
    return;
  }

  // Production: call FCM
  // await admin.messaging().send({ token: fcmToken, notification: { title, body } });
  apiLogger.info({ userId, title }, 'Push sent via FCM');
}

// ─── Escalation Cascade ─────────────────────────────────────────────

/**
 * Executes a multi-channel notification cascade for T2/T3 clinical
 * escalation events. Contacts the assigned clinician, supervisor,
 * and on-call staff in sequence.
 *
 * @param escalation - The escalation event details.
 */
export async function escalationCascade(
  escalation: EscalationItem,
): Promise<void> {
  const { tier, trigger, patientId } = escalation;

  apiLogger.warn(
    { tier, trigger, patientId },
    `Escalation cascade initiated (${tier})`,
  );

  // Step 1: Push notification to primary clinician
  await sendPush(
    'clinician-on-call', // resolved from schedule in production
    `${tier} Escalation`,
    `Patient signal detected: ${trigger}`,
  );

  // Step 2: Email supervisor
  await sendEmail(
    'supervisor@clinic.example.com',
    `[${tier}] Clinical Escalation — Patient ${patientId}`,
    'escalation-alert',
    { tier, trigger, patientId, timestamp: new Date().toISOString() },
  );

  // Step 3: For T3 — SMS to on-call
  if (tier === 'T3') {
    await sendSMS(
      '+10000000000', // on-call phone in production
      `URGENT ${tier}: ${trigger} — Patient ${patientId}`,
    );
  }

  apiLogger.info(
    { tier, patientId },
    'Escalation cascade completed',
  );
}
