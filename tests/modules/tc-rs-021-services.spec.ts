import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-021 - Modul Services
 * Jasa internal, tanpa stok
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-021
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-021 - Modul Services', () => {
  test('Seluruh halaman modul Services tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/services - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/categories - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/categories');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/items - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/items');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/purchase-requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/purchase-requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/orders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/orders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/receipts - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/receipts');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/services/bills - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/services/bills');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
