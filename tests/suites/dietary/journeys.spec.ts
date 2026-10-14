import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { fillField, pickSelect, rowWithText } from '../../../lib/flow';
import { DietRequestsPage, DietTpnPage } from '../../../pages/RisDietPages';

/**
 * DIE-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/diet.json).
 */
test.describe('Dietary journeys', () => {
  let diet: DietRequestsPage;
  let docNo: string;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    diet = new DietRequestsPage(page);
  });

  test('DIE-JRN-001 · Ahli gizi membuat permintaan diet pasien', async ({ page }) => {
    docNo = `DRT-QA-${Date.now().toString().slice(-8)}`;

    await test.step('Step 1 · Buka Apps, Dietary, Requests', async () => {
      await diet.open();
    });

    await test.step('Step 2 · Klik New request', async () => {
      const dlg = await diet.openNewRequest();
      await expect(dlg.locator('#diet-doc-no')).toBeVisible();
      await test.step('Step 3 · Isi permintaan lalu Save', async () => {
        await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
        await fillField(dlg, '#diet-doc-no', docNo);
        await fillField(dlg, '#diet-bed-no', 'ANG1');
        await fillField(dlg, '#diet-bed-cat', 'Kelas 1');
        await fillField(dlg, '#diet-comments', 'Diet rendah garam (uji QA)');
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(2_500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      });
    });

    await test.step('Step 4 · Permintaan tampil pada daftar', async () => {
      await expect(rowWithText(page, docNo)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('DIE-JRN-002 · Kalkulator TPN menghitung kebutuhan makronutrien', async ({ page }) => {
    const tpn = new DietTpnPage(page);

    await test.step('Step 1 · Buka Dietary, TPN', async () => {
      await tpn.open();
    });

    await test.step('Step 2 · Isi tinggi & berat lalu Calculate', async () => {
      await fillField(page.locator('main'), '#tpn-height', '170');
      await fillField(page.locator('main'), '#tpn-weight', '65');
      await tpn.calculate.click();
      await page.waitForTimeout(1_500);
    });

    await test.step('Step 3 · BMI/makronutrien tampil', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/BMI|Protein|Dextrose|Lipid/i);
    });
  });
});
