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
 * TC-FLW-APT - Modul Appointment.
 * Flow nyata: pasien dari modul Registration dibuatkan jadwal konsultasi
 * (Book), lalu jadwal konsultan diblokir untuk waktu tertentu (Block time).
 */
test.describe('TC-FLW-APT - Modul Appointment', () => {
  test('Blok jadwal konsultan (Block consultant)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/appointment/schedule', /Appointments/i);

    const from = new Date(Date.now() + 86_400_000);
    from.setMinutes(0, 0, 0);
    const to = new Date(from.getTime() + 3_600_000);
    const fmt = (d: Date) => {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };

    await test.step('Buka dialog Block time', async () => {
      await openDialog(page, page.getByRole('button', { name: /^block time$/i }), /block consultant/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi branch, konsultan, dan rentang waktu lalu Block', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await pickSelect(dlg, 'select >> nth=1', 'Agus Wijaya');
      await fillField(dlg, 'input[type="datetime-local"] >> nth=0', fmt(from));
      await fillField(dlg, 'input[type="datetime-local"] >> nth=1', fmt(to));
      await submitDialog(page, dlg, /^block$/i, '/en/appointment');
    });

    await test.step('Dialog tertutup setelah blok tersimpan', async () => {
      await closeDialog(page, dlg);
    });
  });

  test('Book appointment untuk pasien dari modul Registration', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/appointment/schedule', /Appointments/i);

    await test.step('Buka dialog Book', async () => {
      await openDialog(page, page.getByRole('button', { name: /^book$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi pasien (dari Registration), departemen, konsultan, tanggal, lalu Book', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      // kolom pasien: typeahead MRN/nama (bukan input tanggal/datetime)
      const patientInput = dlg
        .locator('input[placeholder*="mrn" i], input[placeholder*="name" i], input:not([type="date"]):not([type="datetime-local"])')
        .first();
      await pickPatient(page, patientInput, patient.name);
      // field tanggal: input[type=date] pertama di dialog book
      const dateInput = dlg.locator('input[type="date"]').first();
      if (await dateInput.count()) {
        const d = new Date(Date.now() + 86_400_000);
        const p = (n: number) => String(n).padStart(2, '0');
        await dateInput.fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      }
      // Appointment type wajib: bila master datanya kosong (hanya "Select…"),
      // booking tidak bisa disimpan - laporkan sebagai blocker data.
      const apptType = dlg.locator('combobox, select').filter({ hasText: '' }).nth(-1);
      const typeSelect = dlg.locator('select').last();
      if (await typeSelect.count()) {
        const opts = (await typeSelect.locator('option').allTextContents()).map((o) => o.trim());
        if (opts.length <= 1) {
          await closeDialog(page, dlg);
          throw new Error(
            'Blocked data: master "Appointment type" kosong pada branch Daan Mogot ' +
              '(combobox hanya berisi placeholder) - booking tidak dapat disimpan.',
          );
        }
        await typeSelect.selectOption({ index: 1 });
      }
      await submitDialog(page, dlg, /^book$/i, '/en/appointment');
    });

    await test.step('Appointment baru tampil pada tabel jadwal', async () => {
      await closeDialog(page, dlg);
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });
});
