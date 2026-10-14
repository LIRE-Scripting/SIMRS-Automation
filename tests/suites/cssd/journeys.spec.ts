import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField, pickSelect, submitDialog } from '../../../lib/flow';
import { CssdMasterPage } from '../../../pages/BudgetCssdFinancePages';

/**
 * CSS-JRN-001..003 dari module-journeys-QA.xlsx (data/module-journeys/cssd.json).
 */
test.describe('CSSD journeys', () => {
  let indicator: CssdMasterPage;
  let stamp: string;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    stamp = Date.now().toString().slice(-6);
    indicator = new CssdMasterPage(page, '/en/cssd/indicator-types', /indicator/i);
  });

  test('CSS-JRN-001 · Teknisi CSSD menambah indikator sterilisasi baru', async ({ page }) => {
    const code = `IT${stamp}`;

    await test.step('Step 1 · Buka CSSD, Indicator types', async () => {
      await indicator.open();
      await expect(indicator.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New', async () => {
      const dlg = await indicator.openNew();
      await test.step('Step 3 · Isi indikator lalu Save', async () => {
        await fillField(dlg, '#cssd-key', code);
        await fillField(dlg, '#cssd-name', `Indikator Uji ${stamp}`);
        await submitDialog(page, dlg, /^save$/i, '/en/cssd');
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Indikator baru tampil pada daftar', async () => {
      await expect(indicator.rowWithCode(code)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('CSS-JRN-002 · Teknisi CSSD menambah nama uji yang merujuk indikator', async ({ page }) => {
    const code = `TN${stamp}`;

    await test.step('Step 1 · Buka CSSD, Test names', async () => {
      const tests = new CssdMasterPage(page, '/en/cssd/test-names', /test/i);
      await tests.open();
      await expect(tests.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New', async () => {
      const tests = new CssdMasterPage(page, '/en/cssd/test-names', /test/i);
      const dlg = await tests.openNew();
      await test.step('Step 3 · Isi nama uji + pilih indikator lalu Save', async () => {
        await fillField(dlg, '#cssd-key', code);
        await fillField(dlg, '#cssd-name', `Uji Kimia ${stamp}`);
        const sel = dlg.locator('select').first();
        const opts = (await sel.locator('option').allTextContents()).map((o) => o.trim());
        const target = opts.find((o) => o.startsWith('IT')) ?? opts[1];
        if (target) await sel.selectOption({ label: target });
        await submitDialog(page, dlg, /^save$/i, '/en/cssd');
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Nama uji baru tampil pada daftar', async () => {
      const tests = new CssdMasterPage(page, '/en/cssd/test-names', /test/i);
      await tests.open();
      await expect(tests.rowWithCode(code)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('CSS-JRN-003 · Validasi data operasional CSSD', async ({ page }) => {
    await test.step('Step 1 · Requests berisi data', async () => {
      const p = new CssdMasterPage(page, '/en/cssd/requests', /request/i);
      await p.open();
      await expect(p.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Receipts berisi data', async () => {
      const p = new CssdMasterPage(page, '/en/cssd/receipts', /receipt/i);
      await p.open();
      await expect(p.rows.first()).toBeVisible();
    });

    await test.step('Step 3 · Cycles berisi data', async () => {
      const p = new CssdMasterPage(page, '/en/cssd/cycles', /cycle/i);
      await p.open();
      await expect(p.rows.first()).toBeVisible();
    });
  });
});
