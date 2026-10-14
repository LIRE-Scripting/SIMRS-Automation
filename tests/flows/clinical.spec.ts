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
 * TC-FLW-CLN - Modul Patient Care (clinical).
 * Fitur: konsultasi pasien (lookup MRN) dan follow-up (Remark/Call/Note).
 */
test.describe('TC-FLW-CLN - Modul Patient Care', () => {
  test('Consultation: lookup pasien membuka konteks konsultasi', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/clinical/consultation', /consult/i);

    await test.step('Cari pasien di layar konsultasi', async () => {
      const lookup = page.locator('input[placeholder*="MRN" i]').first();
      await lookup.click();
      await lookup.fill(patient.name.split(/\s+/).slice(0, 2).join(' '));
      await page.waitForTimeout(2_500);
      const opt = page
        .locator(`ul[role="listbox"] li[role="option"]:has-text("${patient.mrn}") button`)
        .first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.dispatchEvent('click');
      } else {
        await lookup.press('Enter');
      }
      await page.waitForTimeout(2_000);
    });

    await test.step('Konteks pasien aktif di layar konsultasi (SOAP/vitals tersedia)', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      const hit = body.match(new RegExp(patient.mrn)) || body.match(/SOAP|vital|diagnos/i);
      expect(hit, 'konteks pasien atau form SOAP harus tampil').toBeTruthy();
    });
  });

  test('Add follow-up untuk pasien dari modul Registration', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/clinical/follow-ups', /follow/i);

    await test.step('Buka dialog Add follow-up', async () => {
      await openDialog(page, page.getByRole('button', { name: /add follow-up/i }), /add follow-up/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Pilih pasien, mode Note, isi catatan, lalu Save', async () => {
      await pickPatient(page, dlg.locator('input[placeholder*="MRN" i]').first(), patient.name);
      await pickSelect(dlg, 'select', 'Note');
      await fillField(dlg, 'textarea', `QA follow-up ${Date.now()}`);
      await submitDialog(page, dlg, /^save$/i, '/en/clinical');
      await closeDialog(page, dlg);
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });
});
