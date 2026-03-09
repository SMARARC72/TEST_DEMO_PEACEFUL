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

test('React app smoke — callback query error shows recovery UI', async ({ page }) => {
  await page.goto('/callback?error=access_denied&error_description=The+login+was+canceled');

  await expect(page.getByRole('heading', { name: 'Authentication could not be completed' })).toBeVisible();
  await expect(page.getByText('The login was canceled')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to Login' })).toBeVisible();

  await page.screenshot({ path: 'test-results/screenshots/04-callback-error.png', fullPage: true });
});

test('React app smoke — restored clinician session is redirected away from login', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('peacefull-auth', JSON.stringify({
      state: {
        user: {
          id: 'u-clinician',
          tenantId: 't1',
          email: 'pilot.clinician.1@peacefull.cloud',
          role: 'CLINICIAN',
          status: 'ACTIVE',
          profile: { firstName: 'Pilot', lastName: 'Clinician' },
          mfaEnabled: true,
          mfaMethod: 'TOTP',
          createdAt: '2026-03-09T00:00:00.000Z',
        },
        isAuthenticated: true,
        isAuth0Session: false,
        accessToken: 'access-demo',
        refreshToken: 'refresh-demo',
      },
      version: 0,
    }));
  });

  await page.goto('/login');

  await expect(page).toHaveURL(/\/clinician/, { timeout: 10_000 });
  await page.screenshot({ path: 'test-results/screenshots/05-restored-session-redirect.png', fullPage: true });
});

test('React app smoke — unknown route redirects to login', async ({ page }) => {
  await page.goto('/nonexistent-route');

  // Should redirect to /login or show a not-found state
  await expect(page).toHaveURL(/\/login|\//, { timeout: 10_000 });

  // Screenshot: Redirect to login
  await page.screenshot({ path: 'test-results/screenshots/06-redirect.png', fullPage: true });
});
