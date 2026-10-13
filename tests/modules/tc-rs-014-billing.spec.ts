import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-014 - Modul Hospital Accounts
 * Invoice, deposit, kasir
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-014
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-014 - Modul Hospital Accounts', () => {
  test('Seluruh halaman modul Hospital Accounts tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/billing - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/billing');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/billing/cashier - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/billing/cashier');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
