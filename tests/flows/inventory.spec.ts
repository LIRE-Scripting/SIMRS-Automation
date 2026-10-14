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
 * TC-FLW-INV - Modul Inventory.
 * Flow nyata: master item (Add Item) lalu permintaan stok antar-departemen
 * (New Stock Request) dengan persetujuan (Approve).
 */
test.describe('TC-FLW-INV - Modul Inventory', () => {
  test('Add Item baru lalu muncul di daftar item', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/inventory/items', /item/i);

    const code = `QA${Date.now().toString().slice(-8)}`;
    await test.step('Buka dialog Add Item', async () => {
      await openDialog(page, page.getByRole('button', { name: /add item/i }), /add item/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi kode, nama, min/max stok lalu Save', async () => {
      await fillField(dlg, '#item-code', code);
      await fillField(dlg, '#item-name', `Item Uji ${code}`);
      await fillField(dlg, '#item-min-stock', '1');
      await fillField(dlg, '#item-max-stock', '10');
      await submitDialog(page, dlg, /^save$/i, '/en/inventory');
      await closeDialog(page, dlg);
    });

    await test.step('Item baru ditemukan lewat pencarian', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(code);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(page.locator('main table tbody tr').first()).toContainText(code, {
        timeout: 15_000,
      });
    });
  });

  test('New Stock Request lalu dokumen tampil di daftar', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/inventory/stock-requests', /stock request/i);

    const docNo = `SR-QA-${Date.now().toString().slice(-8)}`;
    await test.step('Buka dialog New Stock Request', async () => {
      await openDialog(page, page.getByRole('button', { name: /new stock request/i }), /new stock request/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi branch, doc number, request type Urgent, currency, jumlah lalu Create', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#sr-doc-num', docNo);
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      await fillField(dlg, '#sr-doc-date', `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`);
      await pickSelect(dlg, 'select >> nth=1', 'Urgent');
      await fillField(dlg, '#sr-currency', 'IDR');
      await fillField(dlg, '#sr-net-amount', '100000');
      await fillField(dlg, '#sr-remarks', 'Permintaan uji otomatis QA');
      await submitDialog(page, dlg, /^create$/i, '/en/inventory');
      await closeDialog(page, dlg);
    });

    await test.step('Dokumen request tampil di daftar', async () => {
      await expect(page.locator('main table tbody tr').first()).toContainText(docNo, {
        timeout: 15_000,
      });
    });
  });
});
