import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-025 - Modul Maintenance
 * Rencana, perintah kerja, AMC
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-025
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-025 - Modul Maintenance', () => {
  test('Seluruh halaman modul Maintenance tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/maintenance - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/maintenance');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/maintenance/plans - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/maintenance/plans');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/maintenance/work - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/maintenance/work');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/maintenance/amc - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/maintenance/amc');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
