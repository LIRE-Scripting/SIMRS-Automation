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
 * TC-FLW-DIET - Modul Dietary.
 * Flow nyata: permintaan diet pasien (New diet request) dan kalkulator TPN
 * (Calculate) dengan data pasien rawat inap yang ada.
 */
test.describe('TC-FLW-DIET - Modul Dietary', () => {
  test('New diet request lalu tampil di daftar', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/diet/requests', /diet|request/i);

    const docNo = `DRT-QA-${Date.now().toString().slice(-8)}`;
    await test.step('Buka dialog New diet request', async () => {
      await openDialog(page, page.getByRole('button', { name: /new request/i }).first(), /diet request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi branch, doc no, bed, kategori, komentar lalu Save', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#diet-doc-no', docNo);
      await fillField(dlg, '#diet-bed-no', 'ANG1');
      await fillField(dlg, '#diet-bed-cat', 'Kelas 1');
      await fillField(dlg, '#diet-comments', 'Diet rendah garam (uji QA)');
      await submitDialog(page, dlg, /^save$/i, '/en/diet');
      await closeDialog(page, dlg);
    });

    await test.step('Request tampil di daftar', async () => {
      await expect(rowWithText(page, docNo)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Kalkulator TPN: hitung dengan tinggi/berat pasien', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await page.goto('/en/diet/tpn', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_500);
    expect(page.url()).not.toMatch(/login/);
    await expect(page.getByRole('button', { name: /^calculate$/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    await test.step('Isi tinggi & berat lalu Calculate', async () => {
      await fillField(page.locator('main'), '#tpn-height', '170');
      await fillField(page.locator('main'), '#tpn-weight', '65');
      await page.getByRole('button', { name: /^calculate$/i }).first().click();
      await page.waitForTimeout(1_500);
    });

    await test.step('Hasil perhitungan (BMI/makronutrien) tampil', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/BMI|Protein|Dextrose/i);
    });
  });
});
