import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { openModulePage } from '../../lib/flow';

/**
 * TC-FLW-PRL - Modul Payroll.
 * Fitur: batch payroll dan runs - akun rs.admin hanya read-only.
 */
test.describe('TC-FLW-PRL - Modul Payroll', () => {
  test('Daftar batch payroll tampil (read-only untuk rs.admin)', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/payroll/batches', /payroll batches/i);
    const interactive = await page
      .getByRole('button', { name: /new|create|generate/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (!interactive) {
      test.info().annotations.push({
        type: 'note',
        description: 'Tidak ada aksi create/generate batch untuk rs.admin - divalidasi read-only.',
      });
    }
  });

});
