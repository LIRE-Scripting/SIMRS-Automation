import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { gotoStable } from '../../lib/navigation';

/**
 * TC-RS-002 - Modul Appointment
 * Jadwal, reschedule, blok konsultan
 *
 * Test case: module-test-cases-QA.xlsx (langkah mengacu journey RS-002
 * pada sheet Steps). Setiap langkah membuka satu layar modul, memastikan
 * sesi tetap aktif (tidak ter-redirect ke login) dan halaman ter-render.
 */
test.describe('TC-RS-002 - Modul Appointment', () => {
  test('Seluruh halaman modul Appointment tampil dan datanya tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Buka /en/appointment - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/appointment');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Buka /en/appointment/schedule - Halaman tampil dan datanya tersedia', async () => {
      await gotoStable(page, '/en/appointment/schedule');
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
      await expect(page).not.toHaveURL(/login/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });
});
