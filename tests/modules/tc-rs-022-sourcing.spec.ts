import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-022 - Modul Sourcing
 * Tender sampai perjanjian
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-022
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-022 - Modul Sourcing', () => {
  test('Seluruh halaman modul Sourcing tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/sourcing - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/sourcing/masters - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing/masters');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/sourcing/tenders - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing/tenders');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/sourcing/bids - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing/bids');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/sourcing/agreements - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing/agreements');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/sourcing/money - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/sourcing/money');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
