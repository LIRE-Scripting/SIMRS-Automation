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
 * TC-FLW-OT - Modul Operation Theater.
 * Fitur: permintaan jadwal operasi dan alur kerja request
 * (Schedule/Consume/Validate).
 */
test.describe('TC-FLW-OT - Modul Operation Theater', () => {
  test('New OT request untuk pasien dari Registration', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/ot/requests', /request|operation/i);

    await test.step('Buka dialog New OT request', async () => {
      await openDialog(page, page.getByRole('button', { name: /new request/i }).first(), /ot request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi prosedur, pasien, ruang, jadwal, dokter bedah lalu Save', async () => {
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

    await test.step('Request tampil pada daftar dengan prosedur yang diisi', async () => {
      await expect(rowWithText(page, 'Apendektomi')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Alur kerja request: aksi Schedule/Consume/Validate tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/ot/requests', /request|operation/i);

    await test.step('Daftar request berisi data dan tombol alur kerja tersedia', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/schedule/i);
      expect(body).toMatch(/consume/i);
      expect(body).toMatch(/validate/i);
    });
  });
});
