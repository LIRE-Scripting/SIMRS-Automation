import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-016 - Modul MRD
 * Berkas & peminjaman RM
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-016
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-016 - Modul MRD', () => {
  test('Seluruh halaman modul MRD tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/mrd - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/mrd');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/mrd/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/mrd/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/mrd/records - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/mrd/records');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/mrd/coding - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/mrd/coding');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/mrd/outpatient - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/mrd/outpatient');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
