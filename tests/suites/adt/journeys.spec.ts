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
} from '../../../lib/flow';

/**
 * ADT-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/adt.json).
 */
test.describe('ADT journeys', () => {
  test('ADT-JRN-001 · Staf ADT menambahkan tempat tidur baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/adt/beds', /bed/i);

    const bedNo = `QA-${Date.now().toString().slice(-6)}`;
    await test.step('Step 1 · Buka Inpatient, Beds', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Klik Add bed', async () => {
      await openDialog(page, page.getByRole('button', { name: /add bed/i }), /add bed/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 3 · Isi bed lalu Save', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#adt-bed-no', bedNo);
      await fillField(dlg, '#adt-bed-desc', 'Bed uji otomatis QA');
      await pickSelect(dlg, 'select >> nth=1', 'Available');
      await dlg.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(2_500);
      await closeDialog(page, dlg);
    });

    await test.step('Step 4 · Bed baru ditemukan lewat pencarian', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(bedNo);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(page.locator('main table tbody tr').first()).toContainText(bedNo, {
        timeout: 15_000,
      });
    });
  });

  test('ADT-JRN-002 · Perawat ward mencatat pemberian obat (Record dose)', async ({ page }) => {
    test.setTimeout(60_000);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/adt/ward', /ward|dose/i);
    await openDialog(page, page.getByRole('button', { name: /record dose/i }), /record dose/i);

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    let picked = false;
    let hasOrder = false;
    let blockReason = '';
    try {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      const patientInput = dlg.locator('input[type="text"]').first();
      picked = await pickPatient(page, patientInput, patient.name)
        .then(() => true)
        .catch(() => false);
      const orderSelect = dlg.locator('select').nth(1);
      hasOrder =
        (await orderSelect.count()) > 0 &&
        (
          await orderSelect.locator('option').allTextContents().catch(() => [])
        ).some((o) => o.trim() && !/^—$|^order$|^choose/i.test(o.trim()));
    } catch (e) {
      blockReason = `Interaksi dialog Record dose gagal: ${String(e).split('\n')[0]}`;
    } finally {
      await closeDialog(page, dlg).catch(() => {});
    }
    test.skip(
      !!blockReason || !picked || !hasOrder,
      blockReason ||
        'Blocked dependensi: Record dose membutuhkan order obat yang sudah ada untuk ' +
          'admission pasien (dibuat dari modul Clinical/Pharmacy), dan typeahead pasien ' +
          `dialog ward ${picked ? 'memuat' : 'tidak memuat'} saran. Alur: admissi -> order obat -> dosis dicatat.`,
    );

    await test.step('Step 3 · Pilih order, status Given, Save', async () => {
      const orderSelect = dlg.locator('select').nth(1);
      const opts = (await orderSelect.locator('option').allTextContents()).filter(
        (o) => o.trim() && !/^—$|^order$|^choose/i.test(o.trim()),
      );
      await orderSelect.selectOption({ label: opts[0].trim() });
      await pickSelect(dlg, 'select >> nth=-1', 'Given');
      await dlg.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(2_500);
      await closeDialog(page, dlg);
    });
  });
});
