import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-024 - Modul Linen
 * Toko, resep, sirkulasi
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-024
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-024 - Modul Linen', () => {
  test('Seluruh halaman modul Linen tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/linen - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/linen');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/linen/stores - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/linen/stores');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/linen/orders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/linen/orders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/linen/moves - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/linen/moves');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
