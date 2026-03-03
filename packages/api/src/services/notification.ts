// ─── Notification Service ────────────────────────────────────────────
// Multi-channel notification dispatch (email, SMS, push, escalation).
// Uses AWS SES in production; logs in development.

import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";
import { prisma } from "../models/index.js";
import type { EscalationItem } from "@peacefull/shared";

const isProduction = env.NODE_ENV === "production";

// ─── SES Client (lazy-initialized) ──────────────────────────────────

let sesClient: import("@aws-sdk/client-ses").SESClient | null = null;

async function getSESClient(): Promise<
  import("@aws-sdk/client-ses").SESClient | null
> {
  if (!isProduction) return null;
  if (sesClient) return sesClient;
  try {
    const { SESClient } = await import("@aws-sdk/client-ses");
    sesClient = new SESClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
    return sesClient;
  } catch {
    apiLogger.warn(
      "AWS SES SDK not available — falling back to log-only notifications",
    );
    return null;
  }
}

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@peacefull.cloud";

// ─── Email ───────────────────────────────────────────────────────────

/**
 * Sends an email notification via AWS SES.
 * Falls back to logging if SES is unavailable.
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
      "[DEV] Email notification (logged, not sent)",
    );
    return;
  }

  const client = await getSESClient();
  if (!client) {
    apiLogger.info(
      { to, subject },
      "Email notification (SES unavailable, logged only)",
    );
    return;
  }

  try {
    const { SendEmailCommand } = await import("@aws-sdk/client-ses");
    const body = renderTemplate(template, data);
    await client.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: body, Charset: "UTF-8" } },
        },
      }),
    );
    apiLogger.info({ to, subject }, "Email sent via SES");
  } catch (err) {
    apiLogger.error({ err, to, subject }, "SES email send failed");
  }
}

// ─── SMS ─────────────────────────────────────────────────────────────

/**
 * Sends an SMS notification. Uses SNS publish for production.
 * Falls back to logging if SNS is unavailable.
 */
export async function sendSMS(to: string, message: string): Promise<void> {
  if (!isProduction) {
    apiLogger.info(
      { to, message },
      "[DEV] SMS notification (logged, not sent)",
    );
    return;
  }

  // Production: SMS via SNS (HIPAA-eligible)
  try {
    const { SNSClient, PublishCommand } = await import("@aws-sdk/client-sns");
    const sns = new SNSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
    await sns.send(
      new PublishCommand({
        PhoneNumber: to,
        Message: message,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      }),
    );
    apiLogger.info({ to }, "SMS sent via SNS");
  } catch (err) {
    apiLogger.error({ err, to }, "SNS SMS send failed");
  }
}

// ─── Push ────────────────────────────────────────────────────────────

/**
 * Sends a push notification. Placeholder — logs for now.
 * FCM integration deferred until mobile client ships.
 */
export async function sendPush(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  // No FCM until mobile client — log only
  apiLogger.info(
    { userId, title, body },
    "Push notification (FCM not configured — logged)",
  );
}

// ─── Escalation Cascade ─────────────────────────────────────────────

/**
 * Executes a multi-channel notification cascade for T2/T3 clinical
 * escalation events. Resolves real clinician/supervisor contacts from
 * the database before dispatching.
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

  // Resolve clinician assigned to this patient
  let clinicianEmail = "";
  let supervisorEmail = "";
  let onCallPhone = "";

  try {
    const assignment = await prisma.careTeamAssignment.findFirst({
      where: { patientId, active: true, role: "PRIMARY" },
      include: {
        clinician: {
          include: { user: { select: { email: true, phone: true } } },
        },
      },
    });

    if (assignment?.clinician?.user) {
      clinicianEmail = assignment.clinician.user.email;
    }

    // Find supervisor for the tenant
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { tenantId: true },
    });
    if (patient) {
      const supervisor = await prisma.user.findFirst({
        where: {
          tenantId: patient.tenantId,
          role: "SUPERVISOR",
          status: "ACTIVE",
        },
        select: { email: true, phone: true },
      });
      if (supervisor) {
        supervisorEmail = supervisor.email;
        onCallPhone = supervisor.phone ?? "";
      }
    }
  } catch (err) {
    apiLogger.error(
      { err, patientId },
      "Failed to resolve escalation contacts",
    );
  }

  // Step 1: Push notification to primary clinician
  await sendPush(
    clinicianEmail || "clinician-on-call",
    `${tier} Escalation`,
    `Patient signal detected: ${trigger}`,
  );

  // Step 2: Email supervisor (or clinician if no supervisor found)
  const emailTarget =
    supervisorEmail || clinicianEmail || "alerts@peacefull.cloud";
  await sendEmail(
    emailTarget,
    `[${tier}] Clinical Escalation — Patient ${patientId}`,
    "escalation-alert",
    { tier, trigger, patientId, timestamp: new Date().toISOString() },
  );

  // Step 3: For T3 — SMS to on-call (supervisor phone)
  if (tier === "T3" && onCallPhone) {
    await sendSMS(
      onCallPhone,
      `URGENT ${tier}: ${trigger} — Patient ${patientId}`,
    );
  }

  apiLogger.info(
    {
      tier,
      patientId,
      clinicianEmail: clinicianEmail || "none",
      supervisorEmail: supervisorEmail || "none",
    },
    "Escalation cascade completed",
  );
}

// ─── Template Renderer ───────────────────────────────────────────────

function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  switch (template) {
    case "escalation-alert":
      return `
        <html><body style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #dc2626;">Clinical Escalation — ${String(data.tier)}</h2>
          <p><strong>Trigger:</strong> ${String(data.trigger)}</p>
          <p><strong>Patient ID:</strong> ${String(data.patientId)}</p>
          <p><strong>Time:</strong> ${String(data.timestamp)}</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">
            This is an automated alert from Peacefull.ai. Please respond promptly.
          </p>
        </body></html>
      `;
    case "mfa-code":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Peacefull verification code</h2>
          <p>Use the following code to complete your sign-in. It expires in 5 minutes.</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${String(data.code)}</span>
          </div>
          <p style="color: #666; font-size: 13px;">If you did not request this code, please ignore this email or contact support.</p>
          <hr/>
          <p style="color: #94a3b8; font-size: 11px;">Peacefull.ai — Secure Mental Health Platform</p>
        </body></html>
      `;
    case "password-reset":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset your Peacefull password</h2>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${String(data.resetUrl)}" style="background: #2563eb; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
          <hr/>
          <p style="color: #94a3b8; font-size: 11px;">Peacefull.ai — Secure Mental Health Platform</p>
        </body></html>
      `;
    default:
      return `
        <html><body style="font-family: sans-serif; padding: 20px;">
          <h2>Peacefull.ai Notification</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </body></html>
      `;
  }
}
