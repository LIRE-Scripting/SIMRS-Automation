import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, fillField, openDialog, openModulePage, submitDialog } from '../../../lib/flow';

/**
 * HK-JRN-001..003 dari module-journeys-QA.xlsx (data/module-journeys/housekeeping.json).
 */
test.describe('Housekeeping journeys', () => {
  test('HK-JRN-001 · Supervisor housekeeping membuat lokasi baru', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/locations', /location/i);

    await test.step('Step 1 · Buka dialog New location', async () => {
      await openDialog(page, page.getByRole('button', { name: /new location/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 2 · Aksi Save location, isi, lalu Save', async () => {
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Save location' });
      await page.waitForTimeout(500);
      await dlg.locator('input').first().fill(`HK${Date.now().toString().slice(-6)}`);
      const name = dlg.locator('input').nth(1);
      if (await name.count()) await name.fill('Lokasi Uji QA');
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });

  test('HK-JRN-002 · Supervisor housekeeping menyimpan kontrak kebersihan', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/contracts', /contract/i);

    await test.step('Step 1 · Buka dialog New', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 2 · Aksi Save contract, isi, lalu Save', async () => {
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Save contract' });
      await page.waitForTimeout(500);
      await dlg.locator('input').first().fill(`HKC-QA-${Date.now().toString().slice(-8)}`);
      const name = dlg.locator('input').nth(1);
      if (await name.count()) await name.fill('Kontrak Kebersihan Uji QA');
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });

  test('HK-JRN-003 · Petugas housekeeping mencatat log harian', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/housekeeping/logs', /log/i);

    await test.step('Step 1 · Buka dialog New', async () => {
      await openDialog(page, page.getByRole('button', { name: /^new$/i }).first());
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await test.step('Step 2 · Aksi Log, isi, lalu Save', async () => {
      const actionSel = dlg.locator('select').first();
      if ((await actionSel.count()) > 0) await actionSel.selectOption({ label: 'Log' });
      await page.waitForTimeout(500);
      await dlg.locator('input').first().fill(`HKL-QA-${Date.now().toString().slice(-8)}`);
      await submitDialog(page, dlg, /^save$/i, '/en/housekeeping');
      await closeDialog(page, dlg);
    });
  });
});
