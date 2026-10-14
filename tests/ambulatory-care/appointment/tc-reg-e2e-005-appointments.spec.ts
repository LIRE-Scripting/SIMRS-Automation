import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import {
  closeDialog,
  getPatientFromRegistration,
  pickPatient,
  pickSuggestion,
  rowWithText,
  submitDialog,
} from '../../../lib/flow';
import { RegistrationAppointmentsPage } from '../../../pages/AmbulatoryPages';

/**
 * TC-REG-E2E-005 - Ambulatory Care > Appointment > Appointments.
 * Book appointment untuk pasien dari Registered Patients, dan Block time
 * untuk konsultan.
 */
test.describe('TC-REG-E2E-005 - Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
  });

  test('Book appointment untuk pasien dari Registered Patients', async ({ page }) => {
    const patient = await getPatientFromRegistration(page);
    const appts = new RegistrationAppointmentsPage(page);
    await appts.open();

    const dlg = await appts.openBook();
    await dlg.locator('select').nth(0).selectOption({ label: 'Daan Mogot' });
    await pickPatient(page, dlg.locator('#appt-patient'), patient.name);
    await pickSuggestion(page, dlg.locator('#appt-department'), 'Umum');
    await pickSuggestion(page, dlg.locator('#appt-resource'), 'Fitri');

    const typeSelect = dlg.locator('select').nth(1);
    const typeOptions = (await typeSelect.locator('option').allTextContents()).map((o) => o.trim());
    if (typeOptions.length <= 1) {
      await closeDialog(page, dlg);
      test.skip(
        true,
        'Blocked data: master "Appointment type" kosong - booking tidak dapat disimpan ' +
          '(isi lewat Book settings > Add type).',
      );
    }
    await typeSelect.selectOption({ index: 1 });

    const d = new Date(Date.now() + 86_400_000);
    const p = (n: number) => String(n).padStart(2, '0');
    await dlg
      .locator('input[type="date"]')
      .first()
      .fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);

    await submitDialog(page, dlg, /^book$/i, '/en/registration');
    await closeDialog(page, dlg);
    await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
  });

  test('Block time konsultan untuk besok (1 jam)', async ({ page }) => {
    const appts = new RegistrationAppointmentsPage(page);
    await appts.open();

    const dlg = await appts.openBlockTime();
    const from = new Date(Date.now() + 2 * 86_400_000);
    from.setHours(8, 0, 0, 0);
    const to = new Date(from.getTime() + 3_600_000);
    const p = (n: number) => String(n).padStart(2, '0');
    const fmt = (x: Date) =>
      `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;

    await dlg.locator('select').nth(0).selectOption({ label: 'Daan Mogot' });
    await dlg.locator('select').nth(1).selectOption({ label: 'Agus Wijaya' });
    await dlg.locator('input[type="datetime-local"]').nth(0).fill(fmt(from));
    await dlg.locator('input[type="datetime-local"]').nth(1).fill(fmt(to));
    await submitDialog(page, dlg, /^block$/i, '/en/registration');
    await closeDialog(page, dlg);
  });
});
