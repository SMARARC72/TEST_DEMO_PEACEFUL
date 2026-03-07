// ─── Notification Service ────────────────────────────────────────────
// Multi-channel notification dispatch (email, SMS, push, escalation).
// Uses AWS SES in production; logs in development.

import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";
import type { EscalationItem } from "@peacefull/shared";

const isProduction = env.NODE_ENV === "production";
const enableNonProdEmailDelivery =
  process.env.ENABLE_NON_PROD_EMAIL_DELIVERY === "true";

// ─── SES Client (lazy-initialized) ──────────────────────────────────

let sesClient: import("@aws-sdk/client-ses").SESClient | null = null;

async function getSESClient(): Promise<
  import("@aws-sdk/client-ses").SESClient | null
> {
  if (!isProduction && !enableNonProdEmailDelivery) return null;
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
  if (!isProduction && !enableNonProdEmailDelivery) {
    apiLogger.info(
      { to, subject, template, data },
      "[DEV] Email notification (logged, not sent — set ENABLE_NON_PROD_EMAIL_DELIVERY=true to enable SES)",
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
    const { prisma } = await import("../models/index.js");
    const assignment = await prisma.careTeamAssignment.findFirst({
      where: { patientId, active: true, role: "Primary Therapist" },
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
    case "welcome":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 520px; margin: 0 auto; background: #f8fafc;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #60A5FA, #2563EB); margin: 0 auto;"></div>
            </div>
            <h2 style="color: #1e293b; text-align: center; margin: 0 0 8px;">Welcome to Peacefull.ai!</h2>
            <p style="color: #64748b; text-align: center; margin: 0 0 24px; font-size: 14px;">Your account has been created successfully</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 14px;"><strong>Name:</strong> ${String(data.firstName ?? "")} ${String(data.lastName ?? "")}</p>
              <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${String(data.email ?? "")}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Role:</strong> ${String(data.role ?? "Patient")}</p>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://peacefullai.netlify.app/login" style="background: #2563eb; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Sign In to Your Account</a>
            </div>
            <div style="background: #fef3c7; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e;">
              <p style="margin: 0;"><strong>Important:</strong> This platform is not a replacement for emergency services. If you or someone you know is in immediate danger, please call 911.</p>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">Peacefull.ai &mdash; AI-Assisted Mental Health Platform</p>
        </body></html>
      `;
    case "pending-approval":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 520px; margin: 0 auto; background: #f8fafc;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #60A5FA, #2563EB); margin: 0 auto;"></div>
            </div>
            <h2 style="color: #1e293b; text-align: center; margin: 0 0 8px;">Registration Received</h2>
            <p style="color: #64748b; text-align: center; margin: 0 0 24px; font-size: 14px;">Your clinician account is pending approval</p>
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;"><strong>What happens next?</strong></p>
              <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #92400e;">
                <li>An administrator will review your registration</li>
                <li>You will receive an email once approved</li>
                <li>After approval, you can sign in and access your dashboard</li>
              </ol>
            </div>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 14px;"><strong>Name:</strong> ${String(data.firstName ?? "")} ${String(data.lastName ?? "")}</p>
              <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${String(data.email ?? "")}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Role:</strong> Clinician</p>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">Peacefull.ai &mdash; AI-Assisted Mental Health Platform</p>
        </body></html>
      `;
    case "supervisor-new-clinician":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Clinician Registration</h2>
          <p>A new clinician has registered and requires administrator approval:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px;"><strong>Name:</strong> ${String(data.firstName ?? "")} ${String(data.lastName ?? "")}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${String(data.email ?? "")}</p>
          </div>
          <p>Please review and approve their account in the administrator dashboard.</p>
          <hr/>
          <p style="color: #94a3b8; font-size: 11px;">Peacefull.ai &mdash; Automated notification</p>
        </body></html>
      `;
    case "org-invitation":
      return `
        <html><body style="font-family: sans-serif; padding: 20px; max-width: 520px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: #2563eb; color: #fff; display: inline-block; padding: 12px 24px; border-radius: 12px; font-size: 20px; font-weight: bold;">Peacefull.ai</div>
          </div>
          <h2 style="color: #1e293b;">You&rsquo;re Invited!</h2>
          <p style="color: #475569; line-height: 1.6;">${String(data.inviterName ?? "A clinician")} has invited you to join <strong>${String(data.organizationName ?? "their practice")}</strong> on Peacefull.ai.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${String(data.inviteUrl ?? "#")}" style="background: #2563eb; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="color: #64748b; font-size: 13px;">This invitation expires on ${String(data.expiresAt ?? "7 days")}.</p>
          <p style="color: #64748b; font-size: 13px;">If you did not expect this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">Peacefull.ai &mdash; AI-Assisted Mental Health Platform</p>
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
