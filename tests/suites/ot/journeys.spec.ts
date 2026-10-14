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
 * OT-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/ot.json).
 */
test.describe('OT journeys', () => {
  test('OT-JRN-001 · Bedah membuat permintaan jadwal operasi', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/ot/requests', /request|operation/i);

    await test.step('Step 1 · Ambil pasien dari modul Registration', async () => {
      expect(patient.mrn).toMatch(/^(RM|MRN)-/);
    });

    await test.step('Step 2 · Buka dialog New OT request', async () => {
      await openDialog(page, page.getByRole('button', { name: /new request/i }).first(), /ot request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi request lalu Save', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const start = new Date(Date.now() + 2 * 86_400_000);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start.getTime() + 2 * 3_600_000);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#ot-procedures', 'Apendektomi (uji QA)');
      await pickPatient(page, dlg.locator('#ot-patient'), patient.name);
      await fillField(dlg, '#ot-room', 'OK-01');
      await fillField(dlg, '#ot-start', fmt(start));
      await fillField(dlg, '#ot-end', fmt(end));
      await fillField(dlg, '#ot-surgeon', 'dr. QA Tester');
      await submitDialog(page, dlg, /^save$/i, '/en/ot');
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Request tampil pada daftar', async () => {
      await expect(rowWithText(page, 'Apendektomi')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('OT-JRN-002 · Validasi alur kerja OT request', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/ot/requests', /request|operation/i);

    await test.step('Step 1 · Daftar request berisi data', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Schedule/Consume/Validate tersedia', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/schedule/i);
      expect(body).toMatch(/consume/i);
      expect(body).toMatch(/validate/i);
    });
  });
});
