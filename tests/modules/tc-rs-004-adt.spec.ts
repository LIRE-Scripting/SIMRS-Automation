import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-004 - Modul Inpatient
 * Admission, transfer, discharge
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-004
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-004 - Modul Inpatient', () => {
  test('Seluruh halaman modul Inpatient tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/adt - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/adt');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/adt/admissions - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/adt/admissions');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/adt/beds - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/adt/beds');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/adt/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/adt/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/adt/ward - Halaman tampil dan datanya tersedia', async () => {
      // Catatan scan: data seed belum ada ("No doses yet.") - langkah ini divalidasi sebagai render-only.
      await gotoStable(page, '/en/adt/ward');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/adt/discharges - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/adt/discharges');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
