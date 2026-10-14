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
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-ADT - Modul Inpatient (ADT).
 * Fitur: manajemen tempat tidur (tambah bed) dan pencatatan dosis di ward
 * untuk pasien rawat inap yang aktif.
 */
test.describe('TC-FLW-ADT - Modul Inpatient', () => {
  test('Tambah bed baru lalu tampil di daftar beds', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/adt/beds', /bed/i);

    const bedNo = `QA-${Date.now().toString().slice(-6)}`;
    await test.step('Buka dialog Add bed', async () => {
      await openDialog(page, page.getByRole('button', { name: /add bed/i }), /add bed/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi branch, nomor bed, deskripsi, availability lalu Save', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#adt-bed-no', bedNo);
      await fillField(dlg, '#adt-bed-desc', 'Bed uji otomatis QA');
      await pickSelect(dlg, 'select >> nth=1', 'Available');
      await submitDialog(page, dlg, /^save$/i, '/en/adt');
      await closeDialog(page, dlg);
    });

    await test.step('Bed baru ditemukan lewat pencarian', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(bedNo);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(page.locator('main table tbody tr').first()).toContainText(bedNo, {
        timeout: 15_000,
      });
    });
  });

  test('Record dose: catat pemberian obat untuk pasien rawat inap aktif', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const patient = await getPatientFromRegistration(page);
    await openModulePage(page, '/en/adt/ward', /ward|dose/i);

    await test.step('Buka dialog Record dose', async () => {
      await openDialog(page, page.getByRole('button', { name: /record dose/i }), /record dose/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    let patientPicked = false;
    await test.step('Pilih branch lalu pasien (typeahead)', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      const patientInput = dlg.locator('input[type="text"]').first();
      patientPicked = await pickPatient(page, patientInput, patient.name)
        .then(() => true)
        .catch(() => false);
      if (!patientPicked) {
        test.info().annotations.push({
          type: 'blocked-data',
          description: 'Typeahead pasien pada dialog Record dose tidak menampilkan saran.',
        });
      }
    });

    await test.step('Cek ketersediaan order obat untuk pasien', async () => {
      const orderSelect = dlg.locator('select').nth(1);
      const hasOrder =
        (await orderSelect.count()) > 0 &&
        (await orderSelect
          .locator('option')
          .allTextContents()
          .catch(() => [])
        ).some((o) => o.trim() && !/^—$|^order$|^choose/i.test(o.trim()));
      await closeDialog(page, dlg).catch(() => {});
      throw new Error(
        'Blocked dependensi: Record dose membutuhkan order obat yang sudah ada ' +
          'untuk admission pasien (dibuat dari modul Clinical/Pharmacy), dan ' +
          (patientPicked
            ? 'tidak ada order yang tersedia untuk pasien terpilih.'
            : 'typeahead pasien tidak memuat saran (lihat annotation).') +
          ' Alur lengkap: pasien diadmisikan -> order obat dibuat -> dosis dicatat di ward.',
      );
    });
  });
});
