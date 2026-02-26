import { test, expect } from '@playwright/test';

test('Security Command Center smoke', async ({ page }) => {
  await page.goto('/');

  // Screenshot: Landing page
  await page.screenshot({ path: 'test-results/screenshots/01-landing.png', fullPage: true });

  // Open Security Command Center
  const sccBtn = page.locator('text=Security Command Center').first();
  await sccBtn.click();

  const scc = page.locator('#security-command-center');
  await expect(scc).toBeVisible();

  // Screenshot: Security Command Center initial
  await page.screenshot({ path: 'test-results/screenshots/02-security-command-center.png', fullPage: true });

  // Smart contract validation -> deterministic VALID when signature ends with 00
  await page.fill('#contract-version', 'v1.0.0');
  await page.fill('#signature-hash', 'abcde00');
  await page.click('text=Validate Contract');
  await expect(page.locator('#contract-result')).toContainText('Status: VALID');

  // Screenshot: Contract validation
  await page.screenshot({ path: 'test-results/screenshots/03-contract-validation.png', fullPage: true });

  // Merkle verification -> VALID when root contains first 4 chars of leaf
  await page.fill('#merkle-leaf', 'abcd1234');
  await page.fill('#merkle-root', 'root-xxxxabcd-yyy');
  await page.fill('#merkle-path', 'n1,n2');
  await page.click('text=Verify Merkle Path');
  await expect(page.locator('#merkle-result')).toContainText('Result: VALID');

  // Screenshot: Merkle verification
  await page.screenshot({ path: 'test-results/screenshots/04-merkle-verification.png', fullPage: true });

  // Trigger reset and verify baseline posture values restored
  await page.click('text=Reset Demo');
  // Re-open SCC to inspect state
  await sccBtn.click();
  await expect(page.locator('#posture-identity')).toHaveText('42');
  await expect(page.locator('#posture-contract')).toHaveText('58');
  await expect(page.locator('#posture-data')).toHaveText('72');

  // Audit log should contain reset event
  await expect(page.locator('#security-audit-log')).toContainText('Security demo state reset');

  // Screenshot: After reset
  await page.screenshot({ path: 'test-results/screenshots/05-after-reset.png', fullPage: true });

  //-- Decision Room checks --
  const drBtn = page.locator('text=Decision Room').first();
  await drBtn.click();
  const dr = page.locator('#decision-room');
  await expect(dr).toBeVisible();
  await expect(page.locator('#readiness-verdict')).toBeVisible();

  // Screenshot: Decision Room initial
  await page.screenshot({ path: 'test-results/screenshots/06-decision-room.png', fullPage: true });

  await page.click('text=Generate Procurement Packet');
  await expect(page.locator('#procurement-packet')).toContainText('controlsChecklist');

  // Screenshot: Decision Room with packet
  await page.screenshot({ path: 'test-results/screenshots/07-decision-room-packet.png', fullPage: true });

  // Reset again and ensure page returns to baseline
  await page.click('text=Reset Demo');
  await drBtn.click();
  await expect(page.locator('#readiness-verdict')).toBeVisible();
  await expect(page.locator('#procurement-packet')).toHaveText('');

  // Screenshot: Final state
  await page.screenshot({ path: 'test-results/screenshots/08-final.png', fullPage: true });
});
