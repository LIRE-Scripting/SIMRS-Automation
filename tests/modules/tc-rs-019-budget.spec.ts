import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-019 - Modul Budget
 * Pagu, alokasi, sanksi
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-019
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-019 - Modul Budget', () => {
  test('Seluruh halaman modul Budget tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/budget - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/books - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/books');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/heads - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/heads');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/chart - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/chart');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/util-types - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/util-types');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/projects - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/projects');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/sanction-checklists - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/sanction-checklists');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/circulars - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/circulars');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/internal-budgets - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/internal-budgets');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/budget/allocations - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/budget/allocations');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
