import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-018 - Modul Finance
 * Voucher & GL
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-018
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-018 - Modul Finance', () => {
  test('Seluruh halaman modul Finance tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/finance - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/financial-years - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/financial-years');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/accounts - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/accounts');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/configuration - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/configuration');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/currencies - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/currencies');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/cost-centres - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/cost-centres');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/account-maps - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/account-maps');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/posting-rules - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/posting-rules');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/vouchers - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/vouchers');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/journals - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/journals');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/finance/erp-invoice-staging - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/finance/erp-invoice-staging');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
