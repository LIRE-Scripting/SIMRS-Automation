import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  pickSelect,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-HK - Modul Housekeeping.
 * Flow nyata: master lokasi (New location, data sudah ada) -> kontrak
 * (Save contract) -> catatan harian (Log) -> tagihan kontrak (Bills).
 */
test.describe('TC-FLW-HK - Modul Housekeeping', () => {
  test('New location: simpan lokasi baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/locations', /location/i);

    await test.step('Buka dialog New location (aksi Save location)', async () => {
      await openDialog(page, page.getByRole('button', { name: /new location/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Pilih aksi Save location, isi kode & nama lalu Save', async () => {
      // dialog ini punya select "Action" untuk memilih sub-form
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Save location' });
      await page.waitForTimeout(500);
      const code = `HK${Date.now().toString().slice(-6)}`;
      const codeInput = dlg.locator('input').first();
      await codeInput.fill(code);
      const name = dlg.locator('input').nth(1);
      if (await name.count()) await name.fill(`Lokasi Uji ${code}`);
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });

  test('Contracts: simpan kontrak kebersihan baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/contracts', /contract/i);

    await test.step('Buka dialog New kontrak', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Pilih aksi Save contract, isi nomor & nama lalu Save', async () => {
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Save contract' });
      await page.waitForTimeout(500);
      const num = `HKC-QA-${Date.now().toString().slice(-8)}`;
      await dlg.locator('input').first().fill(num);
      const name = dlg.locator('input').nth(1);
      if (await name.count()) await name.fill('Kontrak Kebersihan Uji QA');
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });

  test('Daily logs: catat log kegiatan harian', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/logs', /log/i);

    await test.step('Buka dialog New log', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Pilih aksi Log, isi nomor & lokasi lalu Save', async () => {
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Log' });
      await page.waitForTimeout(500);
      const num = `HKL-QA-${Date.now().toString().slice(-8)}`;
      await dlg.locator('input').first().fill(num);
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });
});
