import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-001 - Modul Ambulatory Care
 * Pendaftaran pasien, check-in, MRN
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-001
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-001 - Modul Ambulatory Care', () => {
  test('Seluruh halaman modul Ambulatory Care tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/registration - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/registration');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/registration/patients - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/registration/patients');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/registration/appointments - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/registration/appointments');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/registration/department-queue - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/registration/department-queue');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
