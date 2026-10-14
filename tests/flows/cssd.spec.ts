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
 * TC-FLW-CSSD - Modul CSSD.
 * Flow nyata: master indikator (New indicator type) -> master uji
 * (New test name, bergantung indikator) -> master tipe siklus (New).
 * Data operasional (requests/receipts/cycles) sudah ada dan divalidasi.
 */
test.describe('TC-FLW-CSSD - Modul CSSD', () => {
  test('New indicator type lalu New test name bergantung padanya', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const stamp = Date.now().toString().slice(-6);

    await test.step('Tambah indicator type baru', async () => {
      await openModulePage(page, '/en/cssd/indicator-types', /indicator/i);
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first(), /new/i);
      const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
      await fillField(dlg, '#cssd-key', `IT${stamp}`);
      await fillField(dlg, '#cssd-name', `Indikator Uji ${stamp}`);
      await submitDialog(page, dlg, /^save$/i, '/en/cssd');
      await closeDialog(page, dlg);
      await expect(rowWithText(page, `IT${stamp}`)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Tambah test name yang merujuk indicator type', async () => {
      await openModulePage(page, '/en/cssd/test-names', /test/i);
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first(), /new/i);
      const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
      await fillField(dlg, '#cssd-key', `TN${stamp}`);
      await fillField(dlg, '#cssd-name', `Uji Kimia ${stamp}`);
      // select indicator type: pilih opsi terakhir (baru dibuat bila termuat)
      const sel = dlg.locator('select').first();
      const options = await sel.locator('option').allTextContents();
      const target = options.find((o) => o.includes(`IT${stamp}`)) ?? options[1];
      if (target) await sel.selectOption({ label: target.trim() });
      await submitDialog(page, dlg, /^save$/i, '/en/cssd');
      await closeDialog(page, dlg);
      await expect(rowWithText(page, `TN${stamp}`)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Data operasional requests/receipts/cycles tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/cssd/requests', /request/i);
    await expect(page.locator('main table tbody tr').first()).toBeVisible();

    await openModulePage(page, '/en/cssd/receipts', /receipt/i);
    await expect(page.locator('main table tbody tr').first()).toBeVisible();

    await openModulePage(page, '/en/cssd/cycles', /cycle/i);
    await expect(page.locator('main table tbody tr').first()).toBeVisible();
  });
});
