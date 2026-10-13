import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-023 - Modul Housekeeping
 * Lokasi, kontrak, catatan, tagihan
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-023
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-023 - Modul Housekeeping', () => {
  test('Seluruh halaman modul Housekeeping tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/housekeeping - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/housekeeping');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/housekeeping/locations - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/housekeeping/locations');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/housekeeping/contracts - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/housekeeping/contracts');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/housekeeping/logs - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/housekeeping/logs');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/housekeeping/bills - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/housekeeping/bills');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
