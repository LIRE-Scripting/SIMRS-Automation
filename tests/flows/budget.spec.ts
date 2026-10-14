import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  pickSelect,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-BDG - Modul Budget.
 * Flow nyata berantai: buku anggaran (New book) -> pagu anggaran
 * (New head) -> daftar anggaran (chart: Add head) -> pertanyaan checklist
 * sanksi (New question). Circular/permintaan bergantung approval berantai.
 */
test.describe('TC-FLW-BDG - Modul Budget', () => {
  test('New budget book lalu tampil di daftar buku', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/budget/books', /book/i);

    const code = `B14-QA${Date.now().toString().slice(-5)}`;
    await test.step('Buka dialog New budget book', async () => {
      await openDialog(page, page.getByRole('button', { name: /new book/i }), /new budget book/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi kode, nama buku, sponsor lalu Save', async () => {
      await fillField(dlg, '#bk-code', code);
      await fillField(dlg, '#bk-name', `Buku Uji ${code}`);
      await fillField(dlg, '#bk-sponsor', 'Sponsor QA');
      await submitDialog(page, dlg, /^save$/i, '/en/budget');
      await closeDialog(page, dlg);
    });

    await test.step('Buku baru ditemukan lewat pencarian', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(code);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(page.locator('main table tbody tr').first()).toContainText(code, {
        timeout: 15_000,
      });
    });
  });

  test('New budget head (pagu) untuk tahun anggaran aktif', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/budget/heads', /head/i);

    const code = `HD-QA${Date.now().toString().slice(-5)}`;
    await test.step('Buka dialog New head', async () => {
      await openDialog(page, page.getByRole('button', { name: /new head/i }), /new budget head/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi kode, spending type Operating, tahun 2026, nama lalu Save', async () => {
      await fillField(dlg, '#hd-code', code);
      await pickSelect(dlg, 'select >> nth=0', 'Operating (Belanja Operasional)');
      await fillField(dlg, '#hd-name', `Pagu Uji ${code}`);
      await pickSelect(dlg, 'select >> nth=1', '2026');
      await submitDialog(page, dlg, /^save$/i, '/en/budget');
      await closeDialog(page, dlg);
    });

    await test.step('Pagu baru ditemukan lewat pencarian', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(code);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(page.locator('main table tbody tr').first()).toContainText(code, {
        timeout: 15_000,
      });
    });
  });

  test('Checklist sanksi: pertanyaan baru untuk buku OPS', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/budget/sanction-checklists', /checklist|question/i);

    await test.step('Buka dialog New question', async () => {
      await openDialog(page, page.getByRole('button', { name: /new question/i }), /checklist/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Pilih buku B14-OPS, urutan, pertanyaan lalu Save', async () => {
      await pickSelect(dlg, 'select', 'B14-OPS · Buku operasional');
      await fillField(dlg, '#chk-order', '99');
      await fillField(dlg, '#chk-question', 'Apakah pagu tersedia? (uji QA)');
      await submitDialog(page, dlg, /^save$/i, '/en/budget');
      await closeDialog(page, dlg);
    });

    await test.step('Pertanyaan tampil pada daftar', async () => {
      await expect(page.locator('main table tbody tr').first()).toContainText('uji QA', {
        timeout: 15_000,
      });
    });
  });
});
