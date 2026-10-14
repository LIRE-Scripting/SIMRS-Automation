import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField, openDialog, openModulePage, pickSelect, rowWithText } from '../../../lib/flow';

/**
 * PRC-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/procurement.json).
 */
test.describe('Procurement journeys', () => {
  test('PRC-JRN-001 · Staf pengadaan membuat purchase order', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/procurement/purchase-orders', /purchase order/i);

    const docNo = `PO-QA-${Date.now().toString().slice(-8)}`;
    await test.step('Step 1 · Buka layar purchase orders', async () => {
      await expect(page.getByRole('heading', { level: 1, name: /purchase order/i })).toBeVisible();
    });

    await test.step('Step 2 · Buka dialog Create purchase order', async () => {
      const iconBtn = page
        .locator('main button')
        .filter({ has: page.locator('span, svg, img') })
        .filter({ hasText: /^\s*$/ })
        .first();
      const named = page.getByRole('button', { name: /create|new|add/i }).first();
      let opened = false;
      for (const trigger of [named, iconBtn]) {
        if (!(await trigger.isVisible().catch(() => false))) continue;
        await trigger.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
        if (
          await page
            .locator('[role="dialog"]:not([data-open="false"])')
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          opened = true;
          break;
        }
      }
      if (!opened) {
        throw new Error(
          'Tombol pemicu Create purchase order tidak ditemukan pada layar PO ' +
            '(UX: tombol ikon tanpa nama aksesibel).',
        );
      }
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi PO lalu Save', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, 'input >> nth=0', docNo);
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      await fillField(
        dlg,
        'input[type="date"]',
        `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
      );
      await fillField(dlg, 'input:not([type="date"]) >> nth=1', 'Vendor Uji QA');
      await dlg.locator('input[type="number"]').nth(0).fill('500000');
      await dlg.locator('input[type="number"]').nth(1).fill('0');
      await dlg.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(2_500);
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · PO tampil pada daftar', async () => {
      await page.goto('/en/procurement/requests', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_500);
      const found = await rowWithText(page, docNo).isVisible().catch(() => false);
      if (!found) {
        throw new Error(
          `PO ${docNo} tidak ditemukan di daftar setelah create - ` +
            'indikasi defect: submit sukses (2xx) tetapi data tidak muncul (2 run).',
        );
      }
    });
  });

});
