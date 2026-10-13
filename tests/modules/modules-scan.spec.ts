import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { rsScan } from '../../lib/module-scan';

/**
 * Data-driven module scan, generated from data/module-scan/rs.json
 * (26 modules / 127 screens). One test per module: hub + every sub screen
 * must render. Missing seed data is recorded as a note per screen - the
 * workbook module-scan-QA.xlsx tracks those as Blocked.
 */

test.describe('Module scan - rs.admin', () => {
  for (const mod of rsScan.modules) {
    test(`module ${mod.slug}: hub + ${mod.screens.length} layar tampil`, async (
      { page },
      testInfo,
    ) => {
      await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

      for (const screen of mod.screens) {
        const d = screen.data ?? {};
        const url = d.path ?? d.requested ?? mod.href;

        await test.step(`Buka ${url}`, async () => {
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          // Not every module layout has a <main> landmark; a heading anywhere
          // plus a non-login URL proves the screen rendered.
          await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
          await expect(page).not.toHaveURL(/login/);
          await expect(page.getByRole('heading').first()).toBeVisible();
        });

        await test.step(`Cek data ${url}`, async () => {
          const rows = await page.locator('main table tbody tr').count();
          let body: string;
          if (rows > 0) {
            body = `Pass: ${rows} baris data tampil.`;
          } else {
            const empty = await page
              .locator('main')
              .getByText(/^(no |belum |tidak ada )/i)
              .first()
              .isVisible()
              .catch(() => false);
            body = empty
              ? 'Blocked (data seed belum ada): halaman tampil dengan empty-state.'
              : 'Pass: halaman tampil tanpa tabel data (halaman informasi).';
          }
          testInfo.attach('data-status.txt', { body });
        });
      }
    });
  }

  test.describe('Tenant lain (login diblokir auth staging yang tidak stabil)', () => {
    test('apotek.admin - login diblokir server', async () => {
      test.skip(true, '15+ percobaan login ditolak tanpa pesan error; auth staging tidak stabil (klikmed.superadmin pun ikut gagal saat verifikasi). Jalankan ulang "node scan-modules.mjs apotek" saat auth normal.');
    });

    test('klinik.admin - login diblokir server', async () => {
      test.skip(true, '19+ percobaan login, 0 sukses, tanpa pesan error. Jalankan ulang "node scan-modules.mjs klinik" saat auth staging normal.');
    });
  });
});
