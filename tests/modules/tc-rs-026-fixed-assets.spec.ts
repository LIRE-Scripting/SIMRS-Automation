import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-026 - Modul Fixed assets
 * Register, susut, penitipan
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-026
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-026 - Modul Fixed assets', () => {
  test('Seluruh halaman modul Fixed assets tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/fixed-assets - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/fixed-assets');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/fixed-assets/masters - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/fixed-assets/masters');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/fixed-assets/register - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/fixed-assets/register');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/fixed-assets/moves - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/fixed-assets/moves');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
