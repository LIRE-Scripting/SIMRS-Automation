import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import {
  closeDialog,
  fillField,
  getPatientFromRegistration,
  openDialog,
  openModulePage,
  pickPatient,
  submitDialog,
} from '../../../lib/flow';

/**
 * MRD-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/mrd.json).
 */
test.describe('MRD journeys', () => {
  test('MRD-JRN-001 · Petugas MRD menerbitkan peminjaman berkas RM', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/mrd/records', /record/i);

    await test.step('Step 1 · Ambil pasien dari modul Registration', async () => {
      expect(patient.mrn).toMatch(/^(RM|MRN)-/);
    });

    await test.step('Step 2 · Buka dialog Issue record', async () => {
      await openDialog(page, page.getByRole('button', { name: /issue record/i }).first(), /issue patient record/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Cari pasien, isi dokumen, Find lalu Issue', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      await fillField(
        dlg,
        '#mrd-rec-doc-date',
        `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
      );
      await fillField(dlg, '#mrd-rec-doc-no', `MRD-QA-${Date.now().toString().slice(-8)}`);
      await fillField(dlg, '#mrd-rec-remarks', 'Peminjaman uji QA');
      const searchInput = dlg.locator('input[placeholder*="MRN" i]').first();
      const picked = await pickPatient(page, searchInput, patient.name)
        .then(() => true)
        .catch(() => false);
      const find = dlg.getByRole('button', { name: /^find$/i }).first();
      if (await find.isVisible().catch(() => false)) {
        await find.click({ timeout: 6_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
      }
      const issue = dlg.getByRole('button', { name: /^issue$/i }).first();
      const enabled = await issue.isEnabled().catch(() => false);
      await closeDialog(page, dlg).catch(() => {});
      if (!picked || !enabled) {
        throw new Error(
          'Defect: typeahead pasien pada dialog Issue patient record tidak menampilkan saran ' +
            `(nama & MRN dicoba: ${patient.name}) sehingga tombol Issue tidak aktif.`,
        );
      }
      await issue.click({ timeout: 8_000 });
      await page.waitForTimeout(3_000);
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Pergerakan berkas tampil', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test('MRD-JRN-002 · Koder merekam kode diagnosis discharge', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/mrd/coding', /coding|discharge/i);

    await test.step('Step 1 · Buka MRD, Coding', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Klik Record code pada baris pertama', async () => {
      const rowBtn = page
        .locator('main table tbody tr')
        .first()
        .getByRole('button', { name: /record code/i })
        .first();
      await openDialog(page, rowBtn, /record code/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi kode K35.80 lalu Record code', async () => {
      await fillField(dlg, 'input', 'K35.80');
      await submitDialog(page, dlg, /record code/i, '/en/mrd');
      await closeDialog(page, dlg);
    });
  });
});
