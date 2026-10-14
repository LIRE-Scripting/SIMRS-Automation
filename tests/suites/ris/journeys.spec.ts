import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { fillField, pickSelect, rowWithText } from '../../../lib/flow';
import { RisOrdersPage } from '../../../pages/RisDietPages';

/**
 * RIS-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/ris.json).
 */
test.describe('RIS journeys', () => {
  let ris: RisOrdersPage;
  let orderRef: string;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    ris = new RisOrdersPage(page);
  });

  test('RIS-JRN-001 · Radiographer membuat order radiologi baru', async ({ page }) => {
    orderRef = `RAD-QA-${Date.now().toString().slice(-8)}`;
    const accession = `ACC${Date.now().toString().slice(-8)}`;
    const p = (n: number) => String(n).padStart(2, '0');
    const study = new Date(Date.now() + 86_400_000);
    study.setHours(10, 0, 0, 0);
    const studyDate = `${study.getFullYear()}-${p(study.getMonth() + 1)}-${study.getDate()}T${p(study.getHours())}:${p(study.getMinutes())}`;

    await test.step('Step 1 · Buka Apps, RIS, Orders', async () => {
      await ris.open();
      await expect(ris.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New Order', async () => {
      const dlg = await ris.openCreateOrder();
      await expect(dlg.locator('#rad-order-ref')).toBeVisible();
      await test.step('Step 3 · Isi order lalu Save', async () => {
        await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
        await fillField(dlg, '#rad-order-ref', orderRef);
        await fillField(dlg, '#rad-accession', accession);
        await fillField(dlg, '#rad-study', 'Thorax PA (uji QA)');
        await fillField(dlg, '#rad-study-date', studyDate);
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(2_500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      });
    });

    await test.step('Step 4 · Order baru tampil dengan studi yang diisi', async () => {
      const row = rowWithText(page, orderRef);
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText('Thorax PA');
    });
  });

  test('RIS-JRN-002 · Order tersimpan permanen dan kolom lengkap', async ({ page }) => {
    test.skip(!orderRef, 'Seed data missing: order dari RIS-JRN-001 (jalankan berurutan)');

    await test.step('Step 1 · Muat ulang halaman Orders', async () => {
      await ris.open();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);
    });

    await test.step('Step 2 · Baris order memuat ref, studi, dan accession', async () => {
      const row = rowWithText(page, orderRef);
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText('Thorax PA');
      await expect(row).toContainText(/ACC\d{8}/);
    });
  });
});
