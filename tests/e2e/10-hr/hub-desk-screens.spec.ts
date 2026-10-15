import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { employee, toastsAfter } from './helpers';

/** 10-hr.xlsx: hub and language (015), HR desk Year balance (047, 048) and the screen check of every route (055 … 061). */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

qaTest('TC-APP010-015', async ({ page, qa }) => {
  const main = page.getByRole('main');

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^HR\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*HR$/);
    await expect(main.getByRole('heading', { level: 1, name: 'HR' })).toBeVisible();
    await expect(main.getByText('Leave submit & approve', { exact: true })).toBeVisible();
    for (const t of ['Employees', 'Leave applications', 'Duty roster']) await expect(main.getByRole('link', { name: t, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    for (const [tile, heading] of [['Employees', 'Employees'], ['Leave applications', 'Leave applications']]) {
      await page.goto('/en/hr');
      await main.getByRole('link', { name: tile, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await page.getByRole('navigation', { name: 'HR' }).getByRole('link', { name: tile, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    await page.goto('/en/hr');
    const roster = main.getByRole('link', { name: 'Duty roster', exact: true });
    const href = await roster.getAttribute('href');
    await roster.click();
    await page.waitForLoadState('domcontentloaded');
    const path = new URL(page.url()).pathname;
    qa.note(2, `"Duty roster" links to ${href} and shows ${path}`);
    if (path === '/en/hr') qa.deviation(2, '"Duty roster" leads to the Duty Roster module', `the link (${href}) stays on the HR hub`);
  });

  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    const seen: string[] = [];
    for (const r of ['/id/hr', '/id/hr/employees', '/id/hr/leave-applications']) {
      await page.goto(r);
      seen.push((await page.getByRole('heading', { level: 1 }).first().innerText()).trim());
    }
    const buttons = (await page.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    qa.note(3, `headings ${seen.join(', ')}; buttons on the leave screen: ${[...new Set(buttons)].slice(0, 10).join(', ')}`);
    if (seen.includes('HR') || seen.includes('Employees') || buttons.includes('Submit leave')) qa.deviation(3, 'Headings, buttons and toasts are Indonesian ("SDM", "Karyawan", "Ajukan cuti", …)', `English: ${seen.join(', ')}`);
  });
});

/** HR desk, Year balance: a correction through the dialog; returns the toasts. */
async function yearBalance(page: import('@playwright/test').Page, v: { emp: string; type: string; kind: string; days: string; action: string; year?: string }): Promise<string[]> {
  await page.goto('/en/hr/desk/leave');
  await page.getByRole('main').getByRole('button', { name: 'Year balance' }).click();
  const d = page.getByRole('dialog', { name: 'Year balance' });
  await d.getByRole('textbox', { name: 'Employee no' }).fill(v.emp);
  await d.getByRole('textbox', { name: 'Name / location / kind' }).fill(v.kind);
  await d.getByRole('textbox', { name: 'Leave / shift' }).fill(v.type);
  if (v.year) await d.getByRole('textbox', { name: 'Year' }).fill(v.year);
  await d.getByRole('button', { name: 'Next' }).click();
  await d.getByRole('textbox', { name: 'Days' }).fill(v.days);
  await d.getByRole('combobox', { name: 'Action' }).selectOption({ label: v.action });
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  return toastsAfter(page, mark);
}

/** "A balance exists for the employee and type": set with the action "Year balance" (journey of TC-APP010-043, data of the workbook). */
async function balance(page: import('@playwright/test').Page, qa: Qa): Promise<{ emp: string; type: string } | null> {
  const emp = await employee(page, qa);
  const type = qa.prefix('X-Tahunan');
  const toasts = await yearBalance(page, { emp: emp.no, type, kind: '', days: '12', action: 'Year balance', year: '2027' });
  qa.note(1, `precondition: year balance 2027 of ${emp.no}, type "${type}", 12 days: "${toasts.join(' / ')}"`);
  return toasts.includes('Saved.') ? { emp: emp.no, type } : null;
}

qaTest('TC-APP010-047', async ({ page, qa }) => {
  const b = await balance(page, qa);
  if (!b) {
    qa.notRun(1, 'the balance of the precondition could not be set (see the note)');
    qa.notRun(2, 'see step 1');
    return;
  }
  for (const [step, kind] of [[1, 'add'], [2, 'deduct']] as const) {
    await qa.step(step, async () => {
      expect(await yearBalance(page, { emp: b.emp, type: b.type, kind, days: '2', action: 'Correct balance', year: '2027' })).toContain('Saved.');
    });
  }
  qa.note(2, 'the balance itself is shown nowhere on the screen (TBD in the workbook)');
});

qaTest('TC-APP010-048', async ({ page, qa }) => {
  const b = await balance(page, qa);
  if (!b) {
    qa.notRun(1, 'the balance of the precondition could not be set (see the note)');
    qa.notRun(2, 'see step 1');
    return;
  }
  await qa.step(1, async () => {
    const toasts = await yearBalance(page, { emp: b.emp, type: b.type, kind: 'tambah', days: '2', action: 'Correct balance', year: '2027' });
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
  await qa.step(2, async () => {
    const toasts = await yearBalance(page, { emp: b.emp, type: b.type, kind: 'add', days: '0', action: 'Correct balance', year: '2027' });
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP010-055', '/hr', 'HR'],
  ['TC-APP010-056', '/hr/desk', 'My profile'],
  ['TC-APP010-057', '/hr/desk/attendance', 'Punch'],
  ['TC-APP010-058', '/hr/desk/fee', 'Fee plan'],
  ['TC-APP010-059', '/hr/desk/leave', 'Year balance'],
  ['TC-APP010-060', '/hr/employees', 'Employees'],
  ['TC-APP010-061', '/hr/leave-applications', 'Leave applications'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
