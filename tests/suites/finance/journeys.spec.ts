import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField } from '../../../lib/flow';
import { FinanceAccountsPage, FinanceJournalsPage } from '../../../pages/BudgetCssdFinancePages';

/**
 * FIN-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/finance.json).
 */
test.describe('Finance journeys', () => {
  let journals: FinanceJournalsPage;
  let accounts: FinanceAccountsPage;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    journals = new FinanceJournalsPage(page);
    accounts = new FinanceAccountsPage(page);
  });

  test('FIN-JRN-001 · Akuntan membuat jurnal ganda berimbang', async ({ page }) => {
    const narration = `Jurnal uji QA ${Date.now().toString().slice(-8)}`;

    await test.step('Step 1 · Buka Finance, Journals', async () => {
      await journals.open();
    });

    await test.step('Step 2 · Klik New journal', async () => {
      const dlg = await journals.openNewJournal();
      await expect(dlg.locator('#jv-narration')).toBeVisible();
      await test.step('Step 3 · Isi jurnal berimbang lalu Save', async () => {
        const p = (n: number) => String(n).padStart(2, '0');
        const today = new Date();
        await fillField(
          dlg,
          '#jv-date',
          `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
        );
        await fillField(dlg, '#jv-subtype', 'QA');
        await fillField(dlg, '#jv-narration', narration);
        const selects = dlg.locator('select');
        await selects.nth(0).selectOption({ index: 1 });
        const debits = dlg.getByPlaceholder('Debit');
        const credits = dlg.getByPlaceholder('Credit');
        await debits.first().fill('100000');
        await credits.first().fill('100000');
        await selects.nth(2).selectOption({ index: 2 }).catch(() => {});
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(3_000);
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Jurnal baru tampil pada daftar', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_500);
      const search = page.locator('input[type="search"]').first();
      await search.fill(narration);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      const row = journals.rows.filter({ hasText: narration }).first();
      const found = await row.isVisible().catch(() => false);
      if (!found) {
        const body = ((await page.locator('main').textContent().catch(() => '')) ?? '')
          .replace(/\s+/g, ' ')
          .slice(0, 200);
        throw new Error(
          `Jurnal "${narration}" tidak ditemukan di daftar setelah create - ` +
            `indikasi gagal simpan di server. Isi halaman: ${body}`,
        );
      }
    });
  });

  test('FIN-JRN-002 · Validasi chart of account berisi data', async ({ page }) => {
    await test.step('Step 1 · Buka Finance, Accounts', async () => {
      await accounts.open();
      await expect(accounts.rows.first()).toBeVisible();
    });
  });
});
