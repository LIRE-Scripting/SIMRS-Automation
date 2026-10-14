import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField, pickSelect } from '../../../lib/flow';
import {
  BudgetBooksPage,
  BudgetChecklistsPage,
  BudgetHeadsPage,
} from '../../../pages/BudgetCssdFinancePages';

/**
 * BDG-JRN-001..003 dari module-journeys-QA.xlsx (data/module-journeys/budget.json).
 */
test.describe('Budget journeys', () => {
  let books: BudgetBooksPage;
  let heads: BudgetHeadsPage;
  let checklists: BudgetChecklistsPage;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    books = new BudgetBooksPage(page);
    heads = new BudgetHeadsPage(page);
    checklists = new BudgetChecklistsPage(page);
  });

  test('BDG-JRN-001 · PPA membuat buku anggaran baru', async ({ page }) => {
    const code = `B14-QA${Date.now().toString().slice(-5)}`;

    await test.step('Step 1 · Buka Budget, Books', async () => {
      await books.open();
      await expect(books.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New book', async () => {
      const dlg = await books.openNewBook();
      await expect(dlg.locator('#bk-code')).toBeVisible();
      await test.step('Step 3 · Isi buku lalu Save', async () => {
        await fillField(dlg, '#bk-code', code);
        await fillField(dlg, '#bk-name', `Buku Uji ${code}`);
        await fillField(dlg, '#bk-sponsor', 'Sponsor QA');
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(2_500);
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Buku baru ditemukan lewat pencarian', async () => {
      await books.search.fill(code);
      await books.search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(books.rowWithCode(code)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('BDG-JRN-002 · PPA membuat pagu anggaran (head) untuk tahun berjalan', async ({ page }) => {
    const code = `HD-QA${Date.now().toString().slice(-5)}`;

    await test.step('Step 1 · Buka Budget, Heads', async () => {
      await heads.open();
      await expect(heads.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New head', async () => {
      const dlg = await heads.openNewHead();
      await expect(dlg.locator('#hd-code')).toBeVisible();
      await test.step('Step 3 · Isi pagu lalu Save', async () => {
        await fillField(dlg, '#hd-code', code);
        await pickSelect(dlg, 'select >> nth=0', 'Operating (Belanja Operasional)');
        await fillField(dlg, '#hd-name', `Pagu Uji ${code}`);
        await pickSelect(dlg, 'select >> nth=1', '2026');
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(2_500);
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Pagu baru ditemukan lewat pencarian', async () => {
      await heads.search.fill(code);
      await heads.search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(heads.rowWithCode(code)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('BDG-JRN-003 · PPA menambah pertanyaan checklist sanksi', async ({ page }) => {
    await test.step('Step 1 · Buka Budget, Sanction checklists', async () => {
      await checklists.open();
      await expect(checklists.rows.first()).toBeVisible();
    });

    await test.step('Step 2 · Klik New question', async () => {
      const dlg = await checklists.openNewQuestion();
      await expect(dlg.locator('#chk-question')).toBeVisible();
      await test.step('Step 3 · Pilih buku OPS, urutan, pertanyaan, lalu Save', async () => {
        await pickSelect(dlg, 'select', 'B14-OPS · Buku operasional');
        await fillField(dlg, '#chk-order', '99');
        await fillField(dlg, '#chk-question', 'Apakah pagu tersedia? (uji QA)');
        await dlg.getByRole('button', { name: /^save$/i }).click();
        await page.waitForTimeout(2_500);
        await closeDialog(page, dlg);
      });
    });

    await test.step('Step 4 · Pertanyaan baru tampil pada daftar', async () => {
      const row = checklists.rows.filter({ hasText: 'uji QA' }).first();
      await expect(row).toBeVisible({ timeout: 15_000 });
    });
  });
});
