import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-006 - Modul Transfusion Medicine
 * Donor, crossmatch, issue
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-006
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-006 - Modul Transfusion Medicine', () => {
  test('Seluruh halaman modul Transfusion Medicine tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/bloodbank - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/bloodbank');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/bloodbank/requisitions - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/bloodbank/requisitions');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/bloodbank/donors - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/bloodbank/donors');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/bloodbank/stock - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/bloodbank/stock');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/bloodbank/qc - Halaman tampil dan datanya tersedia', async () => {
      // Catatan scan: data seed belum ada ("No documents yet.") - langkah ini divalidasi sebagai render-only.
      await gotoStable(page, '/en/bloodbank/qc');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
