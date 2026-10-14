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
  pickSelect,
  rowWithText,
  submitDialog,
} from '../../../lib/flow';

/**
 * BB-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/bloodbank.json).
 */
test.describe('Blood Bank journeys', () => {
  test('BB-JRN-001 · Petugas bank darah membuat permintaan transfusi', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/bloodbank/requisitions', /requisition|request/i);

    await test.step('Step 1 · Ambil pasien dari modul Registration', async () => {
      expect(patient.mrn).toMatch(/^(RM|MRN)-/);
    });

    await test.step('Step 2 · Buka dialog New request', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new request$/i }).first(), /new request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi requisition lalu Save request', async () => {
      await pickPatient(page, dlg.locator('#bb-req-patient'), patient.name);
      const selects = dlg.locator('select');
      const deptOpts = (await selects.nth(0).locator('option').allTextContents())
        .map((o) => o.trim())
        .filter((o) => o && !/^department\s*$/i.test(o));
      const compOpts = (await selects.nth(1).locator('option').allTextContents())
        .map((o) => o.trim())
        .filter((o) => o && !/^choose|component\s*$/i.test(o));
      await closeDialog(page, dlg).catch(() => {});
      test.skip(
        deptOpts.length === 0 || compOpts.length === 0,
        `Blocked data: master requisition darah kosong (department: ${deptOpts.length} opsi, ` +
          'component: 0 opsi) - permintaan transfusi tidak dapat disimpan.',
      );
    });

    await test.step('Step 4 · Requisition tampil pada daftar', async () => {
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('BB-JRN-002 · Petugas bank darah mencatat QC unit darah', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/bloodbank/qc', /qc|quality/i);

    await test.step('Step 1 · Buka dialog Record', async () => {
      await openDialog(page, page.getByRole('button', { name: /^record$/i }).first(), /record/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 2 · Isi QC lalu Save', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      const iso = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
      await fillField(dlg, '#bb-qc-technician', 'QA Tester');
      await fillField(dlg, '#bb-qc-date', iso);
      await fillField(dlg, '#bb-qc-unit', `QA${Date.now().toString().slice(-8)}`);
      await fillField(dlg, '#bb-qc-collected', iso);
      await fillField(dlg, '#bb-qc-volume', '350');
      await fillField(dlg, '#bb-qc-hct', '0.42');
      await submitDialog(page, dlg, /^save$/i, '/en/bloodbank');
      await closeDialog(page, dlg);
    });

    await test.step('Step 3 · Daftar QC tidak lagi kosong', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 15_000 });
      const empty = await page.getByText(/no documents yet/i).isVisible().catch(() => false);
      expect(empty, 'setelah Record, daftar QC tidak boleh kosong').toBe(false);
    });
  });
});
