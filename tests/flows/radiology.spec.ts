import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  pickSelect,
  rowWithText,
  submitDialog,
} from '../../lib/flow';

/**
 * TC-FLW-RIS - Modul RIS (radiology).
 * Flow nyata: order radiologi baru (Create order) dengan nomor order,
 * accession, studi, dan jadwal.
 */
test.describe('TC-FLW-RIS - Modul RIS', () => {
  test('Create order radiologi baru lalu tampil di daftar', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/radiology/orders', /order/i);

    const orderRef = `RAD-QA-${Date.now().toString().slice(-8)}`;
    await test.step('Buka dialog Create order', async () => {
      await openDialog(page, page.getByRole('button', { name: /new order/i }).first(), /create order/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Isi order ref, accession, studi, jadwal lalu Save', async () => {
      const p = (n: number) => String(n).padStart(2, '0');
      const study = new Date(Date.now() + 86_400_000);
      study.setHours(10, 0, 0, 0);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;

      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#rad-order-ref', orderRef);
      await fillField(dlg, '#rad-accession', `ACC${Date.now().toString().slice(-8)}`);
      await fillField(dlg, '#rad-study', 'Thorax PA (uji QA)');
      await fillField(dlg, '#rad-study-date', fmt(study));
      await submitDialog(page, dlg, /^save$/i, '/en/radiology');
      await closeDialog(page, dlg);
    });

    await test.step('Order tampil di daftar dengan nomor order yang diisi', async () => {
      await expect(rowWithText(page, orderRef)).toBeVisible({ timeout: 15_000 });
    });
  });
});
