import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { DEP_B_HIT, HR } from '../../../lib/hr-data';
import { everyPage } from '../../../pages/paging';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, tryRefused, userPage } from '../shared/access';
import { Batches, Desk, payrollEmployee, plain, RAN, SAVED } from './helpers';

/**
 * 17-payroll.xlsx, the access test cases of Payroll batches and the payroll
 * desk: U2 on "All branches", U3 without any right, and U1 next to a branch
 * of U6 (Kemayoran). The Employee picker holds the first employees only
 * (found blocker 40): a new employee is often not offered.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** The batch numbers of a user's list, all pages. */
async function batchNumbers(page: Page): Promise<string[]> {
  const b = new Batches(page);
  await b.open();
  return everyPage(page.locator('body'), async () => (await b.rows().allInnerTexts()).map((r) => plain(r).split(' ')[0]));
}

/** The employees the picker offers for a text. */
async function offered(b: Batches, text: string): Promise<string[]> {
  await b.employee.fill(text);
  await b.page.waitForLoadState('networkidle').catch(() => {});
  await b.hits().first().waitFor({ timeout: 4_000 }).catch(() => {});
  return (await b.hits().allInnerTexts()).map(plain);
}

qaTest('TC-APP017-005', async ({ page, qa, browser }) => {
  // EMP-B: an employee of BR-B, made by U6 in HR.
  const empB = await asUser(browser, 'U6', (u6) => payrollEmployee(u6, qa, { ...HR.emp1, no: 'QA-EMP-B01' }, { department: DEP_B_HIT }));
  const b = new Batches(page);
  const branch = page.getByRole('combobox', { name: 'Branch' });

  await qa.step(1, async () => {
    await b.open();
    await expect(branch).toBeVisible();
    const headers = (await page.getByRole('table').getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    const any = (await offered(b, 'QA'))[0];
    expect(any, 'an employee offered by the picker').toBeTruthy();
    await b.hits().first().click();
    await b.base.fill('10000000');
    const toasts = await b.submit();
    expect(toasts).not.toContain(RAN);
    if (!toasts.includes('Choose a branch before running payroll.')) qa.deviation(2, 'Toast "Choose a branch before running payroll."', `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await b.open();
  await branch.selectOption({ label: BR_B });
  const hits = await offered(b, 'QA-EMP');
  if (!hits.some((h) => h.includes(empB.no))) {
    // The picker filters the first employees the page loaded (found blocker 40).
    qa.note(3, `with ${BR_B} chosen, "QA-EMP" offers ${hits.length} employees, not EMP-B ${empB.no}`);
    for (const s of [3, 4, 5]) qa.blocked(s, 40);
    return;
  }
  await qa.step(3, async () => {
    qa.note(3, `with ${BR_B} chosen, "QA-EMP" offers ${hits.length} employees: ${hits.slice(0, 5).join('; ')}`);
  });

  let number = '';
  await qa.step(4, async () => {
    await b.hits().filter({ hasText: empB.no }).first().click();
    await b.base.fill('10000000');
    expect(await b.submit()).toContain(RAN);
    number = (await b.result()).head.match(/^#(\d+)/)?.[1] ?? '';
    expect(number).not.toBe('');
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', batchNumbers)).toContain(number);
    expect(await asUser(browser, 'U1', batchNumbers)).not.toContain(number);
  });
});

qaTest('TC-APP017-021', async ({ page, qa, browser }) => {
  const before = await batchNumbers(page);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const b = new Batches(staff);
      await b.open();
      // EMP-1 stands for any employee of BR-A the picker offers (a new one is often not offered, found blocker 40).
      const any = (await offered(b, 'QA'))[0];
      expect(any, 'an employee offered to U3').toBeTruthy();
      await b.hits().first().click();
      await b.base.fill('10000000');
      await tryRefused(qa, 1, staff, 'Run batch', new RegExp(`^${RAN}$`), () => b.run.click());
      await expect(b.panel).toHaveCount(0);
      expect((await batchNumbers(page)).length).toBe(before.length);
      qa.note(1, `the employee picked: "${any}"; all fields and the button are shown to U3`);
    });
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP017-022', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Payroll\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/payroll/batches']));
    await qa.step(3, async () => {
      const b = new Batches(staff);
      await b.open();
      const hits = await offered(b, 'a');
      if (hits.length) qa.deviation(3, 'No employees are shown to this user', `"a" offers ${hits.length} employees to U3 (e.g. "${hits[0]}")`);
    });
  });
});

qaTest('TC-APP017-023', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): EMP-B and a batch of BR-B.
  const { empB, number } = await asUser(browser, 'U6', async (u6) => {
    const e = await payrollEmployee(u6, qa, { ...HR.emp1, no: 'QA-EMP-B01' }, { department: DEP_B_HIT });
    const b = new Batches(u6);
    await b.open();
    const hits = await offered(b, e.no);
    if (!hits.length) return { empB: e, number: '' };
    await b.hits().first().click();
    await b.base.fill('10000000');
    expect(await b.submit()).toContain(RAN);
    return { empB: e, number: (await b.result()).head.match(/^#(\d+)/)?.[1] ?? '' };
  });

  await qa.step(1, async () => {
    const mine = await batchNumbers(page);
    if (number) expect(mine).not.toContain(number);
    else qa.note(1, 'U6 could not pick EMP-B (found blocker 40); the batches of BR-B made earlier stand in');
    const ofB = await asUser(browser, 'U6', batchNumbers);
    expect(ofB.filter((n) => mine.includes(n))).toEqual([]);
    qa.note(1, `${ofB.length} batches of ${BR_B}, none in the ${mine.length} of U1`);
  });

  await qa.step(2, async () => {
    const b = new Batches(page);
    await b.open();
    expect((await offered(b, empB.no)).filter((h) => h.includes(empB.no))).toEqual([]);
    const none = await page.getByText('No employee matches').count();
    if (!none) qa.note(2, `no hit for ${empB.no}, but no text "No employee matches"`);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});

qaTest('TC-APP017-052', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): an employee with a payslip of a period of this test.
  const d1 = new Desk(page);
  const e = await payrollEmployee(page, qa);
  const period = `2099-10-${qa.token()}`;
  expect(await d1.calculate({ Code: e.no, Period: period, Amount: '8000000' }, 'Correct')).toContain(SAVED);

  const staff = await userPage(browser, 'U3');
  const d = new Desk(staff);
  try {
    await qa.step(1, async () => {
      const shown: string[] = [];
      for (const link of ['Payslip', 'Calculate', 'Tax']) {
        await staff.goto('/id/payroll');
        const l = staff.getByRole('complementary').getByRole('link', { name: link }).first();
        if (!(await l.count())) continue;
        await l.click();
        await staff.waitForLoadState('networkidle').catch(() => {});
        shown.push(`${link} ("${(await staff.getByRole('main').getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim()}", ${Math.max((await staff.getByRole('main').getByRole('row').count()) - 1, 0)} rows)`);
      }
      qa.note(1, `U3 opens ${shown.join(', ') || 'none of the screens'} (TBD in the workbook)`);
    });

    await qa.step(2, async () => {
      await d.open('/slip', 'Payroll desk');
      const rows = await d.search(e.no);
      if (await rows.count()) {
        await rows.first().getByRole('button', { name: 'Use' }).click();
        const slip = d.main.getByRole('article');
        qa.note(2, (await slip.count()) ? `the payslip of ${e.no} is shown to U3: ${plain(await slip.innerText()).slice(0, 120)}` : 'no slip is shown');
      } else qa.note(2, `the payslip of ${e.no} is not listed for U3`);
    });

    await qa.step(3, async () => {
      const toasts = await d.calculate({ Code: e.no, Period: period, Amount: '9000000' }, 'Correct');
      expect(toasts).not.toContain(SAVED);
      qa.note(3, `Correct: "${toasts.join(' / ') || 'no toast'}"`);
      await d1.open('/slip', 'Payroll desk');
      await expect(await d1.search(e.no)).toContainText('8000000');
    });

    await qa.step(4, async () => {
      for (const [action, v] of [['Lock month', { Period: period }], ['Doctor fee', { Code: e.no, Amount: '2500000', Period: period }]] as const) {
        const toasts = await d.calculate(v, action);
        expect(toasts, action).not.toContain(SAVED);
        qa.note(4, `${action}: "${toasts.join(' / ') || 'no toast'}"`);
      }
      // The month is not locked: U1 can still correct the payslip.
      expect(await d1.calculate({ Code: e.no, Period: period, Amount: '8000000' }, 'Correct')).toContain(SAVED);
    });
  } finally {
    await staff.context().close();
  }
});

