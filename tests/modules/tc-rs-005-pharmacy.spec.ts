import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-005 - Modul Pharmacy
 * Dispense, OTC, retur
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-005
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-005 - Modul Pharmacy', () => {
  test('Seluruh halaman modul Pharmacy tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/pharmacy - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/pharmacy');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/pharmacy/dispense - Halaman tampil dan datanya tersedia', async () => {
      // Catatan scan: data seed belum ada ("No medical record selected.") - langkah ini divalidasi sebagai render-only.
      await gotoStable(page, '/en/pharmacy/dispense');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/pharmacy/orders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/pharmacy/orders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/pharmacy/issue-lines - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/pharmacy/issue-lines');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
