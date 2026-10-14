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
 * CLN-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/clinical.json).
 */
test.describe('Clinical journeys', () => {
  test('CLN-JRN-001 · Dokter menambahkan follow-up untuk pasien', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/clinical/follow-ups', /follow/i);

    await test.step('Step 1 · Ambil pasien dari modul Registration', async () => {
      expect(patient.mrn).toMatch(/^(RM|MRN)-/);
    });

    await test.step('Step 2 · Buka dialog Add follow-up', async () => {
      await openDialog(page, page.getByRole('button', { name: /add follow-up/i }), /add follow-up/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Pilih pasien, mode Note, isi catatan, Save', async () => {
      await pickPatient(page, dlg.locator('input[placeholder*="MRN" i]').first(), patient.name);
      await pickSelect(dlg, 'select', 'Note');
      await fillField(dlg, 'textarea', `QA follow-up ${Date.now()}`);
      await submitDialog(page, dlg, /^save$/i, '/en/clinical');
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Follow-up tampil pada daftar', async () => {
      await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('CLN-JRN-002 · Dokter membuka konteks konsultasi pasien', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/clinical/consultation', /consult/i);

    await test.step('Step 1 · Buka Patient Care, Consultation', async () => {
      await expect(page.locator('input[placeholder*="MRN" i]').first()).toBeVisible();
    });

    await test.step('Step 2 · Cari pasien - konteks aktif', async () => {
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
      const body = (await page.locator('main').textContent()) ?? '';
      const hit = body.includes(patient.mrn) || /SOAP|vital|diagnos/i.test(body);
      expect(hit, 'konteks pasien atau form SOAP harus tampil').toBeTruthy();
    });
  });
});
