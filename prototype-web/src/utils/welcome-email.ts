// ─── Welcome Email Template (Stub) ───────────────────────────────────
// This is a stub for the welcome email that would be sent to new patients
// after registration. In production, wire this to SendGrid/SES/Postmark.
//
// Usage (in backend): import { getWelcomeEmailHtml } from './welcome-email';
//   await sendEmail({ to: user.email, subject: 'Welcome to Peacefull', html: getWelcomeEmailHtml(firstName) });

export function getWelcomeEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Peacefull</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:40px;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#a78bfa,#6c5ce7);padding:32px;text-align:center;">
        <h1 style="color:#ffffff;font-size:28px;margin:0;">Welcome to Peacefull</h1>
        <p style="color:#e0d5ff;font-size:14px;margin:8px 0 0;">Your mental health companion</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#4a4a6a;line-height:1.6;margin:0 0 16px;">
          Welcome to Peacefull! We're glad you're here. Your account has been created, and
          you can start using the platform right away.
        </p>
        <p style="font-size:14px;color:#4a4a6a;line-height:1.6;margin:0 0 24px;">
          Here's what you can do:
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="padding:12px;background:#f5f3ff;border-radius:8px;margin-bottom:8px;">
              <strong style="color:#6c5ce7;">✅ Daily Check-in</strong>
              <p style="font-size:13px;color:#4a4a6a;margin:4px 0 0;">Track your mood, stress, sleep, and focus daily.</p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px;background:#f5f3ff;border-radius:8px;">
              <strong style="color:#6c5ce7;">📝 Journal</strong>
              <p style="font-size:13px;color:#4a4a6a;margin:4px 0 0;">Write reflections with guided prompts or free-form.</p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px;background:#f5f3ff;border-radius:8px;">
              <strong style="color:#6c5ce7;">💬 AI Companion</strong>
              <p style="font-size:13px;color:#4a4a6a;margin:4px 0 0;">Chat with your AI companion for between-session support.</p>
            </td>
          </tr>
        </table>

        <p style="text-align:center;margin:0 0 24px;">
          <a href="https://peacefullai.netlify.app/login" style="display:inline-block;background:#6c5ce7;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Get Started →
          </a>
        </p>

        <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">
          If you're ever in crisis, please call <strong>988</strong> (Suicide & Crisis Lifeline)
          or <strong>911</strong> for emergencies. This platform is not a substitute for professional care.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          © ${new Date().getFullYear()} Peacefull.ai · <a href="https://peacefullai.netlify.app/privacy" style="color:#6c5ce7;text-decoration:none;">Privacy</a> · <a href="https://peacefullai.netlify.app/terms" style="color:#6c5ce7;text-decoration:none;">Terms</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
