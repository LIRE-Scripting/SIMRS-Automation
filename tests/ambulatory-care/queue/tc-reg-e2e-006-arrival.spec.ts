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
import { ArrivalPage } from '../../../pages/AmbulatoryPages';

/**
 * TC-REG-E2E-006 - Ambulatory Care > Queue > Arrival (department queue).
 * Catat kedatangan pasien ke departemen, dan atur aturan nomor antrean.
 */
test.describe('TC-REG-E2E-006 - Arrival', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
  });

  test('Number rule: atur "Restart each day" dan tersimpan', async ({ page }) => {
    const arrival = new ArrivalPage(page);
    await arrival.open();

    const dlg = await arrival.openNumberRule();
    await dlg.locator('select').first().selectOption({ label: 'Daan Mogot' });
    await dlg.locator('input[name="number_rule"]').first().check();
    await submitDialog(page, dlg, /save rule/i, '/en/registration');
    await closeDialog(page, dlg);

    const again = await arrival.openNumberRule();
    await again.locator('select').first().selectOption({ label: 'Daan Mogot' });
    await expect(again.locator('input[name="number_rule"]').first()).toBeChecked();
    await closeDialog(page, again);
  });

    test('Number rule: atur "Keep counting" dan tersimpan', async ({ page }) => {
    const arrival = new ArrivalPage(page);
    await arrival.open();

    const dlg = await arrival.openNumberRule();
    await dlg.locator('select').first().selectOption({ label: 'Daan Mogot' });
    await dlg.locator('input[name="number_rule"]').first().check();
    await submitDialog(page, dlg, /save rule/i, '/en/registration');
    await closeDialog(page, dlg);

    const again = await arrival.openNumberRule();
    await again.locator('select').first().selectOption({ label: 'Daan Mogot' });
    await expect(again.locator('input[name="number_rule"]').second()).toBeChecked();
    await closeDialog(page, again);
  });

  test('Arrive: catat kedatangan pasien ke departemen', async ({ page }) => {
    const patient = await getPatientFromRegistration(page);
    const arrival = new ArrivalPage(page);
    await arrival.open();

    const dlg = await arrival.openArrive();
    await dlg.locator('select').first().selectOption({ label: 'Daan Mogot' });
    await pickPatient(page, dlg.locator('input[placeholder*="MRN" i]').first(), patient.name);
    await pickSuggestion(page, dlg.locator('#q-dept'), 'Umum');
    await submitDialog(page, dlg, /^arrive$/i, '/en/registration');
    await closeDialog(page, dlg);

    await expect(rowWithText(page, patient.name)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/no arrivals today/i)).toBeHidden();
  });
});
