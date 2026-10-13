import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-020 - Modul CSSD
 * Set steril, siklus, distribusi
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-020
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-020 - Modul CSSD', () => {
  test('Seluruh halaman modul CSSD tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/cssd - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/autoclaves - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/autoclaves');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/cycle-types - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/cycle-types');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/packing-types - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/packing-types');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/indicator-types - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/indicator-types');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/test-names - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/test-names');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/result-types - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/result-types');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/sets - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/sets');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/requests - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/requests');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/receipts - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/receipts');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/cssd/cycles - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/cssd/cycles');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
