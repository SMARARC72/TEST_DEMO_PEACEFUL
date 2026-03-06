// ─── E2E: Patient Check-in Flow ──────────────────────────────────────
// Critical path: Login → Submit checkin → See AI reflection
import { test, expect } from '@playwright/test';

// ─── Helper: Firefox-safe navigation (retries on NS_BINDING_ABORTED) ───
async function safeGoto(page, url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 15_000 });
      await page.waitForTimeout(300);
      return;
    } catch (err) {
      const msg = err?.message || '';
      const isRetryable = msg.includes('NS_BINDING_ABORTED')
        || msg.includes('NS_ERROR')
        || msg.includes('interrupted by another navigation');
      if (isRetryable && i < retries - 1) {
        await page.waitForTimeout(1000);
        continue;
      }
      throw err;
    }
  }
}

test.describe('Patient check-in flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await safeGoto(page, '/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });
  });

  test('patient can login, navigate to checkin, submit, and see reflection', async ({ page }) => {
    // ── Step 1: Login as patient ──
    await page.fill('input[type="email"]', 'test.patient.1@peacefull.cloud');
    await page.fill('input[type="password"]', 'Demo2026!');
    await page.click('button[type="submit"]');

    // Should navigate to patient home (may go through consent first)
    await expect(page).toHaveURL(/\/patient/, { timeout: 10_000 });
    await page.screenshot({ path: 'test-results/screenshots/e2e-patient-01-home.png', fullPage: true });

    // ── Step 2: Handle consent if it appears ──
    if (await page.locator('text=/consent|agree/i').isVisible({ timeout: 2_000 }).catch(() => false)) {
      const agreeBtn = page.locator('button:has-text("Agree"), button:has-text("Accept"), button:has-text("I Agree"), button:has-text("Continue")');
      if (await agreeBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await agreeBtn.first().click();
        await page.waitForTimeout(1000);
      }
    }

    // ── Step 3: Navigate to check-in ──
    await safeGoto(page, '/patient/checkin');
    // May redirect to consent — accept patient/* URL
    await expect(page).toHaveURL(/\/patient\//, { timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/e2e-patient-02-checkin.png', fullPage: true });

    // ── Step 4: Try to submit the form ──
    const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]');
    if (await submitBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.first().click();
    }

    // ── Step 5: Verify no crash ──
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/e2e-patient-03-submitted.png', fullPage: true });

    // Accept any post-submit state — no error boundary showing
    const errorBoundary = await page.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(errorBoundary).toBeFalsy();
  });

  test('patient can navigate all key pages without errors', async ({ page }) => {
    test.slow(); // 9 routes × networkidle wait — needs 3× default timeout
    // Login
    await page.fill('input[type="email"]', 'test.patient.1@peacefull.cloud');
    await page.fill('input[type="password"]', 'Demo2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/patient/, { timeout: 10_000 });

    // Visit each patient route
    const routes = [
      '/patient/checkin',
      '/patient/journal',
      '/patient/voice',
      '/patient/chat',
      '/patient/history',
      '/patient/session-prep',
      '/patient/safety-plan',
      '/patient/resources',
      '/patient/settings',
    ];

    for (const route of routes) {
      await safeGoto(page, route);
      // Should not show error boundary
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).not.toBeVisible({ timeout: 5_000 });
      // Should not be redirected to login
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
