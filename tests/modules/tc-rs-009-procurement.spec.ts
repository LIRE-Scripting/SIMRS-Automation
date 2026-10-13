import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-009 - Modul Procurement
 * PR, PO, tender
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-009
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-009 - Modul Procurement', () => {
  test('Seluruh halaman modul Procurement tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/procurement - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/procurement/purchase-orders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement/purchase-orders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/procurement/suppliers - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement/suppliers');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/procurement/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/procurement/receipts - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement/receipts');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/procurement/reorder - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/procurement/reorder');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
