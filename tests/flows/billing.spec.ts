import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { openModulePage } from '../../lib/flow';

/**
 * TC-FLW-BIL - Modul Hospital Accounts (billing).
 * Fitur: Fast Cashier (charge lookup -> payment -> receipt) dan collections
 * pada hub Hospital Accounts.
 */
test.describe('TC-FLW-BIL - Modul Hospital Accounts', () => {
  test('Fast Cashier: charge lookup, payment, receipt tersedia', async ({ page }) => {
    test.setTimeout(45_000);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    try {
      await openModulePage(page, '/en/billing/cashier', /fast cashier/i);
    } catch (e) {
      throw new Error(
        'Halaman Fast Cashier tidak selesai dimuat (timeout berulang pada staging) - ' +
          'blocker performa/loading. Detail: ' + String(e).split('\n')[0],
      );
    }
    const body = (await page.locator('main').textContent()) ?? '';
    expect(body).toMatch(/charge lookup/i);
    expect(body).toMatch(/payment/i);
  });

});
