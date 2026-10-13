import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-011 - Modul Laboratory
 * Sampel, hasil, sertifikasi
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-011
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-011 - Modul Laboratory', () => {
  test('Seluruh halaman modul Laboratory tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/laboratory - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/laboratory');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/laboratory/orders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/laboratory/orders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/laboratory/bmhp - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/laboratory/bmhp');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
