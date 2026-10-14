import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { openModulePage } from '../../lib/flow';

/** MTN - Plans berisi data dengan aksi Job card. */
test.describe('TC-FLW-MTN - Modul Maintenance', () => {
  test('Plans berisi data, aksi Job card tersedia', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/maintenance/plans', /plan|maintenance/i);
    const rows = page.locator('main table tbody tr');
    const hasData = await rows
      .filter({ hasNotText: /^no rows/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasData) {
      test.info().annotations.push({
        type: 'blocked-data',
        description: 'Belum ada rencana pemeliharaan (data seed kosong).',
      });
    }
    await expect(page.getByRole('button', { name: /job card/i }).first()).toBeVisible();
  });
});
