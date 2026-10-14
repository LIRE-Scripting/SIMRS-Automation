import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { openModulePage } from '../../../lib/flow';

/**
 * MTN-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/maintenance.json).
 */
test.describe('Maintenance journeys', () => {
  test('MTN-JRN-001 · Teknisi memeriksa rencana pemeliharaan dan job card', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);

    await test.step('Step 1 · Buka Maintenance, Plans', async () => {
      await openModulePage(page, '/en/maintenance/plans', /plan|maintenance/i);
    });

    await test.step('Step 2 · Tombol Job card tersedia', async () => {
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

});
