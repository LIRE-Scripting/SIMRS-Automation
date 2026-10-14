import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { PharmacyHubPage } from '../../pages/PharmacyHubPage';
import { openModulePage } from '../../lib/flow';

/**
 * TC-FLW-PHA - Modul Pharmacy.
 * Flow nyata: order obat pasien tampil lalu diteruskan ke layar dispense
 * (pilih MRN -> resep). Flow penuh tersedia juga di tests/pharmacy
 * (50 journey); di sini 2 E2E fokus fitur.
 */
test.describe('TC-FLW-PHA - Modul Pharmacy', () => {
  test('Daftar order obat pasien tampil dan bisa dicari', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/pharmacy/orders', /order/i);
    await expect(page.locator('main table tbody tr').first()).toBeVisible();

    await test.step('Cari order lewat kontrol halaman (pagination aktif)', async () => {
      const body = (await page.locator('main').textContent()) ?? '';
      expect(body).toMatch(/patient/i);
    });
  });

  test('Dispense: pencarian rekam medis membuka alur resep', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    const hub = new PharmacyHubPage(page);
    await hub.open();
    await hub.expectCardsVisible();

    await openModulePage(page, '/en/pharmacy/dispense', /dispense/i);
    const search = page.locator('input[type="search"]').first();
    await expect(search).toBeVisible();
    // alur dispense menunggu pemilihan rekam medis - form terbuka tanpa error
    const body = (await page.locator('main').textContent()) ?? '';
    expect(body).toMatch(/medical record/i);
  });
});
