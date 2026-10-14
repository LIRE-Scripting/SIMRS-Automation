import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  rowWithText,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-LAB - Modul Laboratory.
 * Flow nyata: order laboratorium baru (Create lab order), lalu hasil
 * (Capture result) dan serah terima sampel (Handover) tervalidasi
 * tersedia pada layar orders.
 */
test.describe('TC-FLW-LAB - Modul Laboratory', () => {
  test('Create lab order baru lalu tampil di daftar', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/laboratory/orders', /laborator|order/i);

    const resultType = `Hb QA ${Date.now().toString().slice(-6)}`;
    await test.step('Buka dialog Create lab order', async () => {
      await openDialog(page, page.getByRole('button', { name: /new lab order/i }), /create lab order/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi result type dan remarks lalu Create', async () => {
      await fillField(dlg, '#lab-order-result-type', resultType);
      await fillField(dlg, '#lab-order-remarks', 'Order uji otomatis QA');
      await submitDialog(page, dlg, /^create$/i, '/en/laboratory');
      await closeDialog(page, dlg);
    });

    await test.step('Order tampil di daftar setelah halaman dimuat ulang', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_500);
      const found = await rowWithText(page, resultType).isVisible().catch(() => false);
      if (!found) {
        throw new Error(
          `Order lab ${resultType} tidak ditemukan setelah create - ` +
            'indikasi gagal simpan di server (perlu verifikasi defect).',
        );
      }
    });
  });

  test('Aksi Capture result dan Handover tersedia pada layar orders', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/laboratory/orders', /laborator|order/i);
    const body = (await page.locator('main').textContent()) ?? '';
    expect(body).toMatch(/capture result/i);
    expect(body).toMatch(/handover/i);
  });
});
