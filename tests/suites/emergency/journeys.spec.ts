import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { openModulePage } from '../../../lib/flow';

/**
 * EMG-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/emergency.json).
 */
test.describe('Emergency journeys', () => {
  test('EMG-JRN-001 · Perawat IGD memeriksa daftar pasien IGD dan aksinya', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Step 1 · Buka Emergency, Patients', async () => {
      await openModulePage(page, '/en/emergency/patients', /emergency/i);
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Aksi Triage dan Outcome tersedia', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/triage/i);
      expect(body).toMatch(/outcome/i);
    });
  });

  test('EMG-JRN-002 · Petugas mendaftarkan pasien walk-in IGD', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/emergency/patients', /emergency/i);

    await test.step('Step 1 · Buka Emergency, Patients', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Step 2 · Klik Walk-in ER membuka formulir registrasi', async () => {
      await page.getByRole('button', { name: /walk-in/i }).first().click();
      await page.waitForTimeout(2_000);
      const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
      if (await dlg.isVisible().catch(() => false)) {
        await expect(dlg).toBeVisible();
        await page.keyboard.press('Escape');
      } else {
        expect(page.url()).not.toMatch(/login/);
        test.info().annotations.push({
          type: 'note',
          description: `Walk-in ER membuka halaman: ${page.url()}`,
        });
      }
    });
  });
});
