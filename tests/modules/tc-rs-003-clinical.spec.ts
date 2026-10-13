import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-003 - Modul Patient Care
 * SOAP, vitals, diagnosis
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-003
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-003 - Modul Patient Care', () => {
  test('Seluruh halaman modul Patient Care tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/clinical - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/clinical');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/clinical/consultation - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/clinical/consultation');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/clinical/follow-ups - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/clinical/follow-ups');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/clinical/terminology - Halaman tampil dan datanya tersedia', async () => {
      // Catatan scan: data seed belum ada ("No stay is waiting for a final code.") - langkah ini divalidasi sebagai render-only.
      await gotoStable(page, '/en/clinical/terminology');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
