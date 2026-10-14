import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
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
} from '../../lib/flow';

/**
 * TC-FLW-BB - Modul Transfusion Medicine (blood bank).
 * Flow nyata: permintaan transfusi untuk pasien dari modul Registration
 * (requisition), lalu pencatatan QC unit darah.
 */
test.describe('TC-FLW-BB - Modul Transfusion Medicine', () => {
  test('New request transfusi darah untuk pasien dari Registration', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/bloodbank/requisitions', /requisition|request/i);

    await test.step('Buka dialog New request', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new request$/i }).first(), /new request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi pasien, departemen, diagnosis, komponen, prioritas lalu Save request', async () => {
      await pickPatient(page, dlg.locator('#bb-req-patient'), patient.name);
      // Department & Component wajib: bila master datanya kosong (hanya
      // placeholder), requisition tidak bisa disimpan - laporkan blocker.
      const selects = dlg.locator('select');
      const deptOpts = (await selects.nth(0).locator('option').allTextContents())
        .map((o) => o.trim())
        .filter((o) => o && !/^department\s*$/i.test(o));
      const compSelect = selects.nth(1);
      const compOpts = (await compSelect.locator('option').allTextContents())
        .map((o) => o.trim())
        .filter((o) => o && !/^choose|component\s*$/i.test(o));
      if (deptOpts.length === 0 || compOpts.length === 0) {
        await closeDialog(page, dlg);
        throw new Error(
          `Blocked data: master requisition darah kosong ` +
            `(department: ${deptOpts.length} opsi, component: ${compOpts.length} opsi) - ` +
            'permintaan transfusi tidak dapat disimpan.',
        );
      }
      await selects.nth(0).selectOption({ label: deptOpts[0] });
      await fillField(dlg, '#bb-req-diagnosis', 'Anemia berat (uji QA)');
      const units = dlg.locator('#bb-req-units');
      if (await units.count()) await units.fill('1');
      await pickSelect(dlg, 'select >> nth=-1', 'Elective').catch(() => {});
      const required = dlg.locator('#bb-req-required');
      if (await required.count()) {
        const d = new Date(Date.now() + 86_400_000);
        const p = (n: number) => String(n).padStart(2, '0');
        await required.fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      }
      await submitDialog(page, dlg, /save request/i, '/en/bloodbank');
      await closeDialog(page, dlg);
    });

    await test.step('Permintaan tampil pada daftar dengan nama pasien', async () => {
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Record QC unit darah (form teknisi lengkap)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/bloodbank/qc', /qc|quality/i);

    await test.step('Buka dialog Record', async () => {
      await openDialog(page, page.getByRole('button', { name: /^record$/i }).first(), /record/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi teknisi, unit, volume, HCT lalu Save', async () => {
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

    await test.step('Dokumen QC tampil pada daftar (bukan lagi empty-state)', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 15_000 });
      const empty = await page.getByText(/no documents yet/i).isVisible().catch(() => false);
      expect(empty, 'setelah Record, daftar QC tidak boleh lagi kosong').toBe(false);
    });
  });
});
