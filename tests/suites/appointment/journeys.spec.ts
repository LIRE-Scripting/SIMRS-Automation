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
} from '../../../lib/flow';

/**
 * APT-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/appointment.json).
 */
test.describe('Appointment journeys', () => {
  test('APT-JRN-001 · Petugas memblokir jadwal konsultan', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/appointment/schedule', /appointments/i);

    await test.step('Step 1 · Buka Appointment, Schedule', async () => {
      await expect(page.getByRole('button', { name: /^block time$/i }).first()).toBeVisible();
    });

    await test.step('Step 2 · Klik Block time', async () => {
      await openDialog(page, page.getByRole('button', { name: /^block time$/i }), /block consultant/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Pilih branch, konsultan, rentang waktu, lalu Block', async () => {
      const from = new Date(Date.now() + 86_400_000);
      from.setMinutes(0, 0, 0);
      const to = new Date(from.getTime() + 3_600_000);
      const p = (n: number) => String(n).padStart(2, '0');
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await pickSelect(dlg, 'select >> nth=1', 'Agus Wijaya');
      await fillField(dlg, 'input[type="datetime-local"] >> nth=0', fmt(from));
      await fillField(dlg, 'input[type="datetime-local"] >> nth=1', fmt(to));
      await dlg.getByRole('button', { name: /^block$/i }).click();
      await page.waitForTimeout(2_500);
      await closeDialog(page, dlg);
    });
  });

  test('APT-JRN-002 · Petugas membuat appointment untuk pasien', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/appointment/schedule', /appointments/i);

    await test.step('Step 1 · Ambil pasien dari modul Registration', async () => {
      expect(patient.mrn).toMatch(/^(RM|MRN)-/);
    });

    await test.step('Step 2 · Klik Book', async () => {
      await openDialog(page, page.getByRole('button', { name: /^book$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi booking lalu Book', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      const patientInput = dlg
        .locator(
          'input[placeholder*="mrn" i], input[placeholder*="name" i], input:not([type="date"]):not([type="datetime-local"])',
        )
        .first();
      await pickPatient(page, patientInput, patient.name);
      const dateInput = dlg.locator('input[type="date"]').first();
      if (await dateInput.count()) {
        const d = new Date(Date.now() + 86_400_000);
        const p = (n: number) => String(n).padStart(2, '0');
        await dateInput.fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      }
      const typeSelect = dlg.locator('select').last();
      const opts = (await typeSelect.locator('option').allTextContents()).map((o) => o.trim());
      test.skip(
        opts.length <= 1,
        'Blocked data: master "Appointment type" kosong pada branch Daan Mogot (combobox hanya placeholder) - booking tidak dapat disimpan.',
      );
      await typeSelect.selectOption({ index: 1 });
      await dlg.getByRole('button', { name: /^book$/i }).click();
      await page.waitForTimeout(2_500);
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Appointment pasien tampil pada jadwal', async () => {
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });
});
