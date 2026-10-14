import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, submitDialog } from '../../../lib/flow';
import { PatientFlagsPage } from '../../../pages/AmbulatoryPages';

/**
 * TC-REG-E2E-004 - Ambulatory Care > Registration > Patient flags.
 * Catatan: nilai Expression disesuaikan dengan sintaks ekspresi aplikasi
 * bila server menolak `age >= 60`.
 */
test.describe.configure({ mode: 'serial' });

test.describe('TC-REG-E2E-004 - Patient flags', () => {
  const stamp = Date.now().toString().slice(-6);
  const name = `Flag QA ${stamp}`;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
  });

  test('Tambah patient flag baru (Name, Expression, Priority, Role, Branch)', async ({ page }) => {
    const flags = new PatientFlagsPage(page);
    await flags.open();

    const dlg = await flags.openAdd();
    await flags.fillFlag(dlg, {
      name,
      expression: 'age >= 60',
      priority: '10',
      role: 'admin',
      branch: 'Daan Mogot',
    });
    await submitDialog(page, dlg, /^save$/i, '/en/registration');
    await closeDialog(page, dlg);

    await expect(flags.rowWithName(name)).toBeVisible({ timeout: 15_000 });
    await expect(flags.rowWithName(name)).toContainText('age >= 60');
  });

  test('Patient flag tetap tersimpan setelah halaman dimuat ulang', async ({ page }) => {
    const flags = new PatientFlagsPage(page);
    await flags.open();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(flags.heading).toBeVisible();
    await expect(flags.rowWithName(name)).toBeVisible({ timeout: 15_000 });
  });
});
