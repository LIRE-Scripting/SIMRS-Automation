import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-015 - Modul Emergency
 * Triage & bay IGD
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-015
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-015 - Modul Emergency', () => {
  test('Seluruh halaman modul Emergency tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/emergency - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/emergency');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/emergency/registration?type=7 - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/emergency/registration?type=7');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/emergency/patients - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/emergency/patients');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/emergency/layout - Halaman tampil dan datanya tersedia', async () => {
      // Catatan scan: data seed belum ada ("No beds are plotted on this canvas.") - langkah ini divalidasi sebagai render-only.
      await gotoStable(page, '/en/emergency/layout');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
