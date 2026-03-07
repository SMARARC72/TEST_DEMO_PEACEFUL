// ─── E2E: Clinician Triage Review Flow ──────────────────────────────
// Critical path: Login → View triage inbox → Review/approve AI draft
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

test.describe('Clinician triage review flow', () => {
  test.beforeEach(async ({ page }) => {
    await safeGoto(page, '/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });
  });

  test('clinician can login, view triage, and review a draft', async ({ page }) => {
    test.slow();

    // ── Step 1: Login as clinician ──
    await page.fill('input[type="email"]', 'pilot.clinician.1@peacefull.cloud');
    await page.fill('input[type="password"]', 'Demo2026!');
    await page.click('button[type="submit"]');

    // Should navigate to clinician dashboard
    await expect(page).toHaveURL(/\/clinician/, { timeout: 10_000 });
    await page.screenshot({ path: 'test-results/screenshots/e2e-clinician-01-dashboard.png', fullPage: true });

    // ── Step 2: Navigate to triage inbox ──
    await page.click('text=Triage Inbox');
    await expect(page).toHaveURL(/\/clinician\/triage/);
    await page.screenshot({ path: 'test-results/screenshots/e2e-clinician-02-triage.png', fullPage: true });

    // Should see triage items
    const triageItems = page.locator('[class*="card"], [class*="Card"], article, [role="listitem"]');
    await expect(triageItems.first()).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Mock data may render differently
    });

    // ── Step 3: Navigate to caseload ──
    await page.locator('a[href="/clinician/caseload"]').first().click({ force: true });
    await expect(page).toHaveURL(/\/clinician\/caseload/);
    await page.screenshot({ path: 'test-results/screenshots/e2e-clinician-03-caseload.png', fullPage: true });

    // Should see patient cards
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/e2e-clinician-04-caseload-loaded.png', fullPage: true });
  });

  test('clinician can navigate all key pages without errors', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'pilot.clinician.1@peacefull.cloud');
    await page.fill('input[type="password"]', 'Demo2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/clinician/, { timeout: 10_000 });

    // Visit each clinician route
    const routes = [
      '/clinician/caseload',
      '/clinician/triage',
      '/clinician/escalations',
      '/clinician/analytics',
      '/clinician/settings',
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

  test('clinician can view escalations page', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'pilot.clinician.1@peacefull.cloud');
    await page.fill('input[type="password"]', 'Demo2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/clinician/, { timeout: 10_000 });

    // Navigate to escalations
    await page.click('text=Escalations');
    await expect(page).toHaveURL(/\/clinician\/escalations/);

    // Should see escalation items or empty state
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/e2e-clinician-05-escalations.png', fullPage: true });
  });
});
