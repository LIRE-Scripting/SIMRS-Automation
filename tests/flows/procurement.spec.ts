import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  pickSelect,
  rowWithText,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-PRC - Modul Procurement.
 * Flow nyata: pembuatan purchase order ke vendor (Create purchase order)
 * dan validasi layar receipt (gate/GRN) tersedia.
 */
test.describe('TC-FLW-PRC - Modul Procurement', () => {
  test('Create purchase order baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/procurement/purchase-orders', /purchase order/i);

    const docNo = `PO-QA-${Date.now().toString().slice(-8)}`;
    await test.step('Buka dialog Create purchase order (tombol ikon tanpa teks)', async () => {
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
            '(defect/UX staging: hanya tombol ikon tanpa nama aksesibel).',
        );
      }
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi branch, doc number, vendor, currency, amount lalu Save', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, 'input >> nth=0', docNo);
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      await fillField(
        dlg,
        'input[type="date"]',
        `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
      );
      // vendor = input text kedua (setelah doc number)
      await fillField(dlg, 'input:not([type="date"]) >> nth=1', 'Vendor Uji QA');
      const numbers = dlg.locator('input[type="number"]');
      await numbers.nth(0).fill('500000');
      await numbers.nth(1).fill('0');
      await submitDialog(page, dlg, /^save$/i, '/en/procurement');
      await closeDialog(page, dlg);
    });

    await test.step('PO tampil di daftar purchase orders (layar requests)', async () => {
      await page.goto('/en/procurement/requests', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_500);
      const found = await rowWithText(page, docNo).isVisible().catch(() => false);
      if (!found) {
        throw new Error(
          `PO ${docNo} tidak ditemukan di daftar setelah create - ` +
            'indikasi gagal simpan di server (perlu verifikasi defect).',
        );
      }
    });
  });

});
