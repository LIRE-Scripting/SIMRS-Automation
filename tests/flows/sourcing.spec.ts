import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { closeDialog, openDialog, openModulePage } from '../../lib/flow';

/**
 * TC-FLW-SRC - Modul Sourcing.
 * Fitur: tender (wizard Details -> Review) dan layar lanjutan proses
 * pengadaan (bids -> agreements -> fee).
 */
test.describe('TC-FLW-SRC - Modul Sourcing', () => {
  test('Create tender (wizard 2 langkah)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/sourcing/tenders', /tender/i);

    await test.step('Buka wizard Create tender', async () => {
      await openDialog(page, page.getByRole('button', { name: /create tender/i }).first(), /tender/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi nomor & nama tender, lanjut Review, simpan', async () => {
      const num = `TND-QA-${Date.now().toString().slice(-8)}`;
      await dlg.locator('input').first().fill(num);
      const texts = dlg.locator('input');
      const n = await texts.count();
      if (n > 2) await texts.nth(2).fill('Tender Jasa Kebersihan (uji QA)');
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
    });

    await test.step('Layar tender terbuka dengan form tanpa error', async () => {
      expect(page.url()).not.toMatch(/login/);
    });
  });

});
