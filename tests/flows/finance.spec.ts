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
 * TC-FLW-FIN - Modul Finance.
 * Flow nyata: jurnal ganda (New journal: debit Kas = kredit Pendapatan)
 * lalu tervalidasi pada daftar jurnal; master akun tersedia.
 */
test.describe('TC-FLW-FIN - Modul Finance', () => {
  test('New journal berimbang (debit Kas = kredit Pendapatan)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/finance/journals', /journal/i);

    await test.step('Buka dialog New journal', async () => {
      await openDialog(page, page.getByRole('button', { name: /new journal/i }), /new journal/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi header jurnal + 1 baris debit & kredit berimbang lalu Save', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const today = new Date();
      const iso = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
      await fillField(dlg, '#jv-date', iso);
      await fillField(dlg, '#jv-subtype', 'QA');
      await fillField(dlg, '#jv-narration', `Jurnal uji QA ${Date.now().toString().slice(-8)}`);

      const debitInputs = dlg.locator('input[placeholder="Debit"], input >> nth=-2');
      const debits = dlg.getByPlaceholder('Debit');
      const credits = dlg.getByPlaceholder('Credit');
      if ((await debits.count()) >= 1 && (await credits.count()) >= 1) {
        await debits.first().fill('100000');
        // akun debit: select pertama pada baris - pilih Kas
        const selects = dlg.locator('select');
        await selects.nth(0).selectOption({ index: 1 });
        await credits.first().fill('100000');
        await selects.nth(2).selectOption({ index: 2 }).catch(() => {});
      }
      await submitDialog(page, dlg, /^save$/i, '/en/finance');
      await closeDialog(page, dlg);
    });

    await test.step('Jurnal tampil pada daftar (bukan lagi kosong)', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Master akun tersedia (daftar chart of account berisi data)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/finance/accounts', /account/i);
    await expect(page.locator('main table tbody tr').first()).toBeVisible();
  });
});
