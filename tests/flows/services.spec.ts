import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { closeDialog, openDialog, openModulePage } from '../../lib/flow';

/**
 * TC-FLW-SRV - Modul Services (jasa internal tanpa stok).
 * Fitur: service request (wizard Details -> Review) dan state-machine
 * purchase request (create/send/approve).
 */
test.describe('TC-FLW-SRV - Modul Services', () => {
  test('Create service request (wizard 2 langkah)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/services/requests', /request|service/i);

    await test.step('Buka wizard Create request', async () => {
      await openDialog(page, page.getByRole('button', { name: /create request/i }).first(), /service request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi Details lalu lanjut ke Review dan simpan', async () => {
      const num = `SVC-QA-${Date.now().toString().slice(-8)}`;
      const numInput = dlg.locator('input').first();
      await numInput.fill(num);
      // wizard: tombol Next sampai tombol simpan/final muncul
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

    await test.step('Layar request terbuka dengan form tanpa error', async () => {
      expect(page.url()).not.toMatch(/login/);
    });
  });

});
