import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { openModulePage } from '../../../lib/flow';

/**
 * BIL-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/billing.json).
 */
test.describe('Billing journeys', () => {
  test('BIL-JRN-001 · Kasir membuka Fast Cashier', async ({ page }) => {
    test.setTimeout(45_000);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Step 1 · Buka Hospital Accounts, Cashier', async () => {
      try {
        await openModulePage(page, '/en/billing/cashier', /fast cashier/i);
      } catch (e) {
        throw new Error(
          'Blocked performa: halaman Fast Cashier tidak selesai dimuat (timeout berulang, 4 run) - ' +
            String(e).split('\n')[0],
        );
      }
    });

    await test.step('Step 2 · Tahap alur kasir tersedia', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/charge lookup/i);
      expect(body).toMatch(/payment/i);
    });
  });

});
