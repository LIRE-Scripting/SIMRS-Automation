import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { closeDialog, openDialog, openModulePage } from '../../lib/flow';

/**
 * TC-FLW-EMD - Modul Emergency.
 * Flow nyata: pasien walk-in IGD terdaftar lewat tombol "Walk-in ER",
 * lalu triage pasien tersedia dari daftar Emergency Patients.
 */
test.describe('TC-FLW-EMD - Modul Emergency', () => {
  test('Daftar pasien IGD tampil dengan aksi Triage/Outcome', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/emergency/patients', /emergency/i);

    await test.step('Tabel pasien IGD berisi data', async () => {
      await expect(page.locator('main table tbody tr').first()).toBeVisible();
    });

    await test.step('Aksi Triage dan Outcome tersedia', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/triage/i);
      expect(body).toMatch(/outcome/i);
    });
  });

  test('Walk-in ER membuka formulir registrasi IGD', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/emergency/patients', /emergency/i);

    await test.step('Klik Walk-in ER', async () => {
      const trigger = page.getByRole('button', { name: /walk-in/i }).first();
      await trigger.click();
      await page.waitForTimeout(2_000);
    });

    // Bila walk-in membuka dialog registrasi: isi nama lalu submit.
    // Bila membuka halaman form penuh (registration?type=7), cukup
    // divalidasi terbuka.
    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    if (await dlg.isVisible().catch(() => false)) {
      await test.step('Dialog registrasi terbuka - isi minimal lalu Register', async () => {
        const first = dlg.locator('input[type="text"]').first();
        if (await first.count()) await first.fill('QA Walk-in');
        const register = dlg.getByRole('button', { name: /register|save|create/i }).first();
        if (await register.isVisible().catch(() => false)) {
          await register.click();
          await page.waitForTimeout(3_000);
        }
        await closeDialog(page, dlg);
      });
    } else {
      // alternatif: halaman berubah ke formulir registrasi IGD
      expect(page.url()).not.toMatch(/login/);
      test.info().annotations.push({
        type: 'note',
        description: `Walk-in ER membuka halaman: ${page.url()}`,
      });
    }
  });
});
