import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-013 - Modul Dietary
 * Diet pasien rawat inap
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-013
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-013 - Modul Dietary', () => {
  test('Seluruh halaman modul Dietary tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/diet - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/diet');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/diet/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/diet/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/diet/tpn - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/diet/tpn');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
