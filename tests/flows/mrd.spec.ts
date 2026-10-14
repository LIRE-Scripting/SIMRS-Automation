import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  getPatientFromRegistration,
  pickPatient,
  openDialog,
  openModulePage,
  pickSuggestion,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-MRD - Modul MRD (rekam medis).
 * Flow nyata: peminjaman berkas RM (Issue patient record dengan pencarian
 * pasien) dan koding diagnosis pada data discharge (Record code).
 */
test.describe('TC-FLW-MRD - Modul MRD', () => {
  test('Issue patient record: cari pasien lalu pinjamkan berkas', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/mrd/records', /record/i);

    await test.step('Buka dialog Issue record', async () => {
      await openDialog(page, page.getByRole('button', { name: /issue record/i }).first(), /issue patient record/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Cari pasien (MRN), isi doc number & tanggal, lalu Issue', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      const iso = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
      const docNo = `MRD-QA-${Date.now().toString().slice(-8)}`;

      // kolom pasien: typeahead MRN/nama + tombol Find
      const searchInput = dlg.locator('input[placeholder*="MRN" i]').first();
      await pickPatient(page, searchInput, patient.name);

      await fillField(dlg, '#mrd-rec-doc-no', docNo);
      await fillField(dlg, '#mrd-rec-doc-date', iso);
      await fillField(dlg, '#mrd-rec-remarks', 'Peminjaman uji QA');
      const find = dlg.getByRole('button', { name: /^find$/i }).first();
      if (await find.isVisible().catch(() => false)) {
        await find.click({ timeout: 6_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
      }
      const issue = dlg.getByRole('button', { name: /^issue$/i }).first();
      if (!(await issue.isEnabled().catch(() => false))) {
        await closeDialog(page, dlg);
        throw new Error(
          'Tombol Issue tidak aktif: pasien tidak terpilih pada typeahead ' +
            `(dicoba MRN ${patient.mrn}). Perlu pemetaan manual picker pasien MRD.`,
        );
      }
      await issue.click({ timeout: 8_000 });
      await page.waitForTimeout(3_000);
      await closeDialog(page, dlg);
    });

    await test.step('Daftar records menunjukkan pergerakan berkas', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Coding: rekam kode diagnosis untuk discharge yang belum dikode', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/mrd/coding', /coding|discharge/i);

    await test.step('Klik Record code pada baris pertama', async () => {
      const rowBtn = page.locator('main table tbody tr').first().getByRole('button', { name: /record code/i }).first();
      await openDialog(page, rowBtn, /record code/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi kode diagnosis lalu Record code', async () => {
      await fillField(dlg, 'input', 'K35.80');
      await submitDialog(page, dlg, /record code/i, '/en/mrd');
      await closeDialog(page, dlg);
    });
  });
});
