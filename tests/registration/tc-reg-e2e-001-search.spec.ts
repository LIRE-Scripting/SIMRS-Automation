import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { RegistrationPatientsPage } from '../../pages/RegistrationPage';

/**
 * TC-REG-E2E-001 - Pencarian pasien (search data).
 *
 * Test case: module-test-cases-QA.xlsx. Search di kolom "MRN or name…"
 * hanya terpicu oleh Enter; tanpa hasil halaman menampilkan empty state
 * "No patients yet."
 */
test.describe('TC-REG-E2E-001 - Pencarian pasien', () => {
  test('Search tanpa hasil menampilkan empty state, search nama menampilkan pasien', async ({
    page,
  }) => {
    const patients = new RegistrationPatientsPage(page);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await patients.open();

    await test.step('Tabel pasien tampil dengan kolom MRN dan Full name', async () => {
      await expect(patients.rows().first()).toBeVisible();
      const headers = page.locator('main table thead th');
      await expect(headers.nth(0)).toHaveText(/MRN/);
      await expect(headers.nth(1)).toHaveText(/Full name/);
    });

    await test.step('Search teks yang tidak ada lalu Enter - empty state "No patients yet."', async () => {
      await patients.search('zzqx-no-match-qa');
      await expect(patients.emptyState).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Search nama pasien dari daftar - baris hasil memuat nama tersebut', async () => {
      // Muat ulang halaman untuk mengembalikan daftar penuh (state reset).
      await patients.open();
      const name = await patients.fullNameOfFirstRow();
      expect(name.length).toBeGreaterThan(0);
      await patients.search(name);
      await expect(patients.rows().first().locator('td').nth(1)).toHaveText(name, {
        timeout: 15_000,
      });
    });

    await test.step('Search prefix MRN (pola scan barcode: prefix + Enter) - baris MRN tersebut tampil', async () => {
      await patients.open();
      const mrn = ((await patients.rows().first().locator('td').nth(0).textContent()) ?? '').trim();
      expect(mrn).toMatch(/^(RM|MRN)-/);
      await patients.search(mrn);
      await expect(patients.rows().first().locator('td').nth(0)).toHaveText(mrn, {
        timeout: 15_000,
      });
    });

  });
});
