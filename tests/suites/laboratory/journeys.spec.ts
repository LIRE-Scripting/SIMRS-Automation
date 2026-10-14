import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField, openDialog, openModulePage, rowWithText, submitDialog } from '../../../lib/flow';

/**
 * LAB-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/laboratory.json).
 */
test.describe('Laboratory journeys', () => {
  test('LAB-JRN-001 · Analis membuat order laboratorium', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/laboratory/orders', /laborator|order/i);

    const resultType = `Hb QA ${Date.now().toString().slice(-6)}`;
    await test.step('Step 1 · Buka Laboratory, Orders', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New lab order', async () => {
      await openDialog(page, page.getByRole('button', { name: /new lab order/i }), /create lab order/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi order lalu Create', async () => {
      await fillField(dlg, '#lab-order-result-type', resultType);
      await fillField(dlg, '#lab-order-remarks', 'Order uji otomatis QA');
      await submitDialog(page, dlg, /^create$/i, '/en/laboratory');
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Order baru ditemukan pada daftar', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_500);
      const found = await rowWithText(page, resultType).isVisible().catch(() => false);
      if (!found) {
        throw new Error(
          `Order lab "${resultType}" tidak ditemukan setelah create - ` +
            'indikasi defect: submit sukses (2xx) tetapi data tidak muncul (3 run).',
        );
      }
    });
  });

  test('LAB-JRN-002 · Validasi aksi hasil dan serah terima sampel', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Step 1 · Buka Laboratory, Orders', async () => {
      await openModulePage(page, '/en/laboratory/orders', /laborator|order/i);
    });

    await test.step('Step 2 · Capture result dan Handover tersedia', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/capture result/i);
      expect(body).toMatch(/handover/i);
    });
  });
});
