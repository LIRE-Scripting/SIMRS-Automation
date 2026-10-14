import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, submitDialog } from '../../../lib/flow';
import { ArrivalPage, PriorityRulesPage } from '../../../pages/AmbulatoryPages';

/**
 * TC-REG-E2E-003 - Ambulatory Care > Registration > Priority rules.
 * Aturan prioritas dibuat di sini lalu dipakai sebagai pilihan "Priority rule"
 * pada dialog Arrive (menu Arrival).
 */
test.describe.configure({ mode: 'serial' });

test.describe('TC-REG-E2E-003 - Priority rules', () => {
  const stamp = Date.now().toString().slice(-6);
  const code = `PR${stamp}`;
  const name = `Prioritas QA ${stamp}`;

  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
  });

  test('Tambah priority rule baru (Active + Requires same-day encounter)', async ({ page }) => {
    const rules = new PriorityRulesPage(page);
    await rules.open();

    const dlg = await rules.openAdd();
    await rules.fillRule(dlg, { code, name, active: true, sameDay: true });
    await submitDialog(page, dlg, /^save$/i, '/en/registration');
    await closeDialog(page, dlg);

    await expect(rules.rowWithCode(code)).toBeVisible({ timeout: 15_000 });
    await expect(rules.rowWithCode(code)).toContainText(name);
  });

  test('Priority rule aktif muncul sebagai pilihan pada dialog Arrive', async ({ page }) => {
    const arrival = new ArrivalPage(page);
    await arrival.open();

    const dlg = await arrival.openArrive();
    await dlg.locator('select').first().selectOption({ label: 'Daan Mogot' });
    const options = await dlg.locator('select').last().locator('option').allTextContents();
    await closeDialog(page, dlg);

    expect(
      options.some((o) => o.includes(name) || o.includes(code)),
      `rule ${code} harus ada pada pilihan Priority rule (opsi: ${options.join(' | ')})`,
    ).toBe(true);
  });
});
