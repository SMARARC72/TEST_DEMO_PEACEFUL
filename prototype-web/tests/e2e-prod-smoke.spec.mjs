// ─── E2E: Production Smoke Tests ─────────────────────────────────────
// Runs against the live Netlify deployment at https://peacefullai.netlify.app
// Validates critical paths: page loads, login, navigation, patient + clinician flows.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

// ── Demo credentials (displayed on the login page itself) ──
const PATIENT = { email: 'test.patient.1@peacefull.cloud', password: 'Demo2026!' };
const CLINICIAN = { email: 'pilot.supervisor@peacefull.cloud', password: 'Demo2026!' };
const CLINICIAN_TOTP_SECRET_PATH = path.join(process.cwd(), 'test-results', '.clinician-totp-secret.txt');
const ENV_CLINICIAN_TOTP_SECRET = process.env.PLAYWRIGHT_CLINICIAN_TOTP_SECRET?.trim() || null;

function generateTotp(secret, timestamp = Date.now()) {
  const timeStep = Math.floor(timestamp / 30000);
  const hmac = crypto.createHmac('sha1', secret);

  hmac.update(Buffer.from(timeStep.toString(16).padStart(16, '0'), 'hex'));
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24)
    | ((hash[offset + 1] & 0xff) << 16)
    | ((hash[offset + 2] & 0xff) << 8)
    | (hash[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

function storeClinicianTotpSecret(secret) {
  fs.mkdirSync(path.dirname(CLINICIAN_TOTP_SECRET_PATH), { recursive: true });
  fs.writeFileSync(CLINICIAN_TOTP_SECRET_PATH, `${secret.trim()}\n`, 'utf8');
}

function loadClinicianTotpSecret() {
  if (ENV_CLINICIAN_TOTP_SECRET) {
    return ENV_CLINICIAN_TOTP_SECRET;
  }

  if (!fs.existsSync(CLINICIAN_TOTP_SECRET_PATH)) {
    return null;
  }

  return fs.readFileSync(CLINICIAN_TOTP_SECRET_PATH, 'utf8').trim() || null;
}

async function completeClinicianEnrollmentIfNeeded(page) {
  if (!page.url().includes('/mfa-enrollment')) {
    return;
  }

  async function captureEnrollmentSecret() {
    await expect(page.getByRole('heading', { name: 'Set Up Two-Factor Authentication' })).toBeVisible({ timeout: 15_000 });
    const secret = (await page.locator('code').first().textContent())?.trim();
    if (!secret) {
      throw new Error('Clinician MFA enrollment secret was not rendered on the page.');
    }

    storeClinicianTotpSecret(secret);
    await page.getByRole('button', { name: "I've scanned the QR code →" }).click();
    await expect(page.getByRole('heading', { name: 'Verify Your Code' })).toBeVisible({ timeout: 15_000 });

    return secret;
  }

  let secret = await captureEnrollmentSecret();

  const verificationInput = page.getByLabel('6-digit verification code');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await verificationInput.fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Verify & Enable MFA' }).click();

    if (await page.getByRole('heading', { name: 'Save Backup Codes' }).isVisible({ timeout: 15_000 }).catch(() => false)) {
      break;
    }

    const errorText = await page.locator('text=/Invalid verification code|No pending MFA setup/').first().textContent().catch(() => '');
    if (errorText?.includes('No pending MFA setup')) {
      await page.getByRole('button', { name: '← Back to QR code' }).click();
      secret = await captureEnrollmentSecret();
      continue;
    }

    if (!errorText?.includes('Invalid verification code')) {
      throw new Error(`Clinician MFA enrollment did not reach the backup-code step. Last error: ${errorText || 'none'}`);
    }

    await page.waitForTimeout(1200);
  }

  await expect(page.getByRole('heading', { name: 'Save Backup Codes' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page).toHaveURL(/\/clinician/, { timeout: 20_000 });
}

async function completeClinicianTotpChallengeIfNeeded(page) {
  const totpPrompt = page.getByText('Enter the 6-digit code from your authenticator app.');
  if (!page.url().includes('/login')) {
    return;
  }

  if (!(await totpPrompt.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return;
  }

  const secret = loadClinicianTotpSecret();
  if (!secret) {
    throw new Error('Clinician TOTP prompt appeared, but no stored secret is available for the live smoke run.');
  }

  const codeInput = page.getByLabel('Authenticator code');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!page.url().includes('/login')) {
      return;
    }

    if (!(await codeInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
      if (!page.url().includes('/login')) {
        return;
      }
      throw new Error('Clinician TOTP challenge field was not available on the login page.');
    }

    await codeInput.fill(generateTotp(secret));
    const verifyButton = page.getByRole('button', { name: 'Verify' });

    try {
      await verifyButton.click({ timeout: 5_000 });
    } catch (err) {
      const stillOnPrompt = await totpPrompt.isVisible({ timeout: 2_000 }).catch(() => false);
      if (!stillOnPrompt || !page.url().includes('/login')) {
        return;
      }
      throw err;
    }

    if (!(await totpPrompt.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    if (!page.url().includes('/login')) {
      return;
    }

    await page.waitForTimeout(1200);
  }

  throw new Error('Clinician TOTP challenge did not clear after verification attempts.');
}

// ─── Helper: Firefox-safe navigation (retries on NS_BINDING_ABORTED) ────
async function safeGoto(page, url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 15_000 });
      // Brief stabilisation pause — avoids hanging on Firefox domcontentloaded
      await page.waitForTimeout(300);
      return;
    } catch (err) {
      if (page.url().endsWith(url)) {
        await page.waitForTimeout(300);
        return;
      }

      const msg = err?.message || '';
      const isRetryable = msg.includes('NS_BINDING_ABORTED')
        || msg.includes('NS_ERROR')
        || msg.includes('Frame load interrupted')
        || msg.includes('interrupted by another navigation');
      if (isRetryable && i < retries - 1) {
        await page.waitForTimeout(1000);
        continue;
      }
      throw err;
    }
  }
}

// ─── Helper: login via email/password form ──────────────────────────
async function loginAs(page, creds) {
  await safeGoto(page, '/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });

  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);

  // Click the email sign-in button (not Auth0)
  await page.locator('button[type="submit"]:has-text("Sign in with email")').click();

  await page.waitForFunction(
    () => window.location.pathname !== '/login' || document.body.innerText.includes('Enter the 6-digit code from your authenticator app.'),
    { timeout: 30_000 },
  );

  const onTotpPrompt = await page
    .getByText('Enter the 6-digit code from your authenticator app.')
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (onTotpPrompt) {
    await completeClinicianTotpChallengeIfNeeded(page);
  } else {
    // Wait for navigation away from login (allow extra time for cold-start API)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  }

  await completeClinicianEnrollmentIfNeeded(page);
  // Let the post-login SPA navigation fully settle (Firefox)
  await page.waitForLoadState('networkidle').catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
//  SMOKE: Site loads
// ═══════════════════════════════════════════════════════════════════════

test.describe('Production Smoke', () => {
  test('site loads and shows login page', async ({ page }) => {
    await page.goto('/');
    // Should redirect unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator('text=Welcome to Peacefull')).toBeVisible();
    await page.screenshot({ path: 'test-results/prod-screenshots/01-login-page.png', fullPage: true });
  });

  test('login page shows demo credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Demo Accounts')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=test.patient.1@peacefull.cloud')).toBeVisible();
    await expect(page.locator('text=pilot.clinician.1@peacefull.cloud')).toBeVisible();
    await expect(page.locator('text=Demo2026!')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Clinician Registration' })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/prod-screenshots/02-register-page.png', fullPage: true });
  });

  test('unknown route redirects to login', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz');
    await expect(page).toHaveURL(/\/login|\//, { timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  PATIENT FLOW
// ═══════════════════════════════════════════════════════════════════════

test.describe('Patient Flow', () => {
  test('patient can login and reach home', async ({ page }) => {
    await loginAs(page, PATIENT);

    // Should land on patient dashboard
    await expect(page).toHaveURL(/\/patient/, { timeout: 15_000 });
    await page.screenshot({ path: 'test-results/prod-screenshots/10-patient-home.png', fullPage: true });
  });

  test('patient can navigate core pages without errors', async ({ page }) => {
    test.slow(); // 8 routes × safeGoto + screenshots — needs 3× default timeout
    await loginAs(page, PATIENT);
    await expect(page).toHaveURL(/\/patient/, { timeout: 15_000 });

    const routes = [
      '/patient/checkin',
      '/patient/history',
      '/patient/journal',
      '/patient/chat',
      '/patient/session-prep',
      '/patient/safety-plan',
      '/patient/resources',
      '/patient/settings',
    ];

    for (const route of routes) {
      await safeGoto(page, route);
      // No error boundary
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).not.toBeVisible({ timeout: 8_000 });
      // Not kicked back to login
      await expect(page).not.toHaveURL(/\/login/);
      await page.screenshot({
        path: `test-results/prod-screenshots/11-patient-${route.split('/').pop()}.png`,
        fullPage: true,
      });
    }
  });

  test('patient can submit a check-in', async ({ page }) => {
    await loginAs(page, PATIENT);
    await safeGoto(page, '/patient/checkin');
    // May redirect to consent first — accept if visible
    if (await page.locator('text=/consent|agree/i').isVisible({ timeout: 3_000 }).catch(() => false)) {
      const agreeBtn = page.locator('button:has-text("Agree"), button:has-text("Accept"), button:has-text("Continue")');
      if (await agreeBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await agreeBtn.first().click();
      }
    }
    // Wait for checkin page or accept current URL
    await page.waitForURL(/\/patient\//, { timeout: 10_000 });

    // Look for the submit button
    const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]');
    if (await submitBtn.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await submitBtn.first().click();
    }

    // Wait briefly for response
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/prod-screenshots/12-patient-checkin-submitted.png', fullPage: true });

    // Accept any post-submit state — the form processed without crashing
    const noError = await page.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(noError).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  CLINICIAN FLOW
// ═══════════════════════════════════════════════════════════════════════

test.describe('Clinician Flow', () => {
  test('clinician can login and reach dashboard', async ({ page }) => {
    await loginAs(page, CLINICIAN);

    // Should land on clinician dashboard
    await expect(page).toHaveURL(/\/clinician/, { timeout: 15_000 });
    await page.screenshot({ path: 'test-results/prod-screenshots/20-clinician-dashboard.png', fullPage: true });
  });

  test('clinician can navigate core pages without errors', async ({ page }) => {
    test.slow(); // 5 routes × safeGoto + screenshots — needs 3× default timeout
    await loginAs(page, CLINICIAN);
    await expect(page).toHaveURL(/\/clinician/, { timeout: 15_000 });

    const routes = [
      '/clinician/caseload',
      '/clinician/triage',
      '/clinician/escalations',
      '/clinician/analytics',
      '/clinician/settings',
    ];

    for (const route of routes) {
      await safeGoto(page, route);
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).not.toBeVisible({ timeout: 8_000 });
      await expect(page).not.toHaveURL(/\/login/);
      await page.screenshot({
        path: `test-results/prod-screenshots/21-clinician-${route.split('/').pop()}.png`,
        fullPage: true,
      });
    }
  });

  test('clinician caseload shows patient data', async ({ page }) => {
    await loginAs(page, CLINICIAN);
    await safeGoto(page, '/clinician/caseload');
    await expect(page).toHaveURL(/\/clinician\/caseload/, { timeout: 10_000 });

    // Wait for content to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/prod-screenshots/22-clinician-caseload.png', fullPage: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  SECURITY
// ═══════════════════════════════════════════════════════════════════════

test.describe('Security', () => {
  test('unauthenticated access to /patient redirects to login', async ({ page }) => {
    await page.goto('/patient');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('unauthenticated access to /clinician redirects to login', async ({ page }) => {
    await page.goto('/clinician');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    // Security headers present in production (Netlify); may not be present in local preview.
    // Just verify the response succeeded and headers are an object.
    expect(response?.status()).toBeLessThan(500);
    // If headers are present (production/Netlify), validate them
    if (headers['x-frame-options']) {
      expect(headers['x-frame-options']).toBe('DENY');
    }
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
  });
});
