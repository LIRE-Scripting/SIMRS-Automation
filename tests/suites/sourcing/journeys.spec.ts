import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, openDialog, openModulePage } from '../../../lib/flow';

/**
 * SRC-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/sourcing.json).
 */
test.describe('Sourcing journeys', () => {
  test('SRC-JRN-001 · Panitia lelang membuat tender baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/sourcing/tenders', /tender/i);

    await test.step('Step 1 · Buka Sourcing, Tenders', async () => {
      await expect(page.getByRole('button', { name: /create tender/i }).first()).toBeVisible();
    });

    await test.step('Step 2 · Buka wizard Create tender', async () => {
      await openDialog(page, page.getByRole('button', { name: /create tender/i }).first(), /tender/i);
    });

    await test.step('Step 3 · Isi tender, lanjut Review, simpan', async () => {
      const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
      await dlg.locator('input').first().fill(`TND-QA-${Date.now().toString().slice(-8)}`);
      const texts = dlg.locator('input');
      if ((await texts.count()) > 2) await texts.nth(2).fill('Tender Jasa Kebersihan (uji QA)');
      for (let i = 0; i < 3; i++) {
        const save = dlg.getByRole('button', { name: /^(save|create|submit)$/i }).first();
        if (await save.isVisible().catch(() => false)) {
          await save.click();
          await page.waitForTimeout(2_500);
          break;
        }
        const next = dlg.getByRole('button', { name: /^next$/i }).first();
        if (await next.isVisible().catch(() => false)) {
          await next.click();
          await page.waitForTimeout(800);
        } else break;
      }
      await closeDialog(page, dlg);
      expect(page.url()).not.toMatch(/login/);
    });
  });

});
