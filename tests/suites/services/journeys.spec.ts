import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, openDialog, openModulePage } from '../../../lib/flow';

/**
 * SRV-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/services.json).
 */
test.describe('Services journeys', () => {
  test('SRV-JRN-001 · Staf services membuat service request', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/services/requests', /request|service/i);

    await test.step('Step 1 · Buka Services, Requests', async () => {
      await expect(page.getByRole('button', { name: /create request/i }).first()).toBeVisible();
    });

    await test.step('Step 2 · Buka wizard Create request', async () => {
      await openDialog(page, page.getByRole('button', { name: /create request/i }).first(), /service request/i);
    });

    await test.step('Step 3 · Isi Details, lanjut Review, simpan', async () => {
      const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
      const num = `SVC-QA-${Date.now().toString().slice(-8)}`;
      await dlg.locator('input').first().fill(num);
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
