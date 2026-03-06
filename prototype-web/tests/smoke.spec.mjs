import { test, expect } from '@playwright/test';

test('React app smoke — login page loads', async ({ page }) => {
  await page.goto('/');

  // Should redirect to /login (AuthGuard)
  await expect(page).toHaveURL(/\/login/);

  // Screenshot: Login page
  await page.screenshot({ path: 'test-results/screenshots/01-login.png', fullPage: true });

  // Login form elements
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  // Screenshot: Login form visible
  await page.screenshot({ path: 'test-results/screenshots/02-login-form.png', fullPage: true });
});

test('React app smoke — register page loads', async ({ page }) => {
  await page.goto('/register');

  // Registration page should show clinician registration heading
  await expect(page.getByRole('heading', { name: 'Clinician Registration' })).toBeVisible();

  // Screenshot: Register page
  await page.screenshot({ path: 'test-results/screenshots/03-register.png', fullPage: true });
});

test('React app smoke — unknown route redirects to login', async ({ page }) => {
  await page.goto('/nonexistent-route');

  // Should redirect to /login or show a not-found state
  await expect(page).toHaveURL(/\/login|\//, { timeout: 10_000 });

  // Screenshot: Redirect to login
  await page.screenshot({ path: 'test-results/screenshots/04-redirect.png', fullPage: true });
});
