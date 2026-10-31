import type { Locator } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { HR } from '../../../lib/hr-data';
import { EmployeesPage, LeavePage } from '../../../pages/hr/HrPages';
import { signedOutJourney, userPage } from '../shared/access';
import { pending, reason, ROWS, saveEmployee, TC_APP010_004 } from './cases';
import { decide, employee, employeeData, ensureLeaveTypes, leaveCells, submitLeave, toastsAfter } from './helpers';

/**
 * 10-hr.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10). Employees are made per test. "HR admin 2"
 * is U4 (qa.admin3). USR-1 "linked to no employee" does not exist among the
 * prepared accounts: U7 (qa.pegawai) is the account linked to an employee
 * (X-EMP-QA-PEGAWAI), and no other account is linked by the tests, since a
 * link would change what that account sees in every other test.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP010-004', TC_APP010_004);

qaTest('TC-APP010-021', async ({ page, qa, browser }) => {
  await ensureLeaveTypes(page);
  const approved = await pending(page, qa);
  expect(await decide(page, approved.r, 'Approve')).toContain('Leave approved');
  qa.note(1, `LV-APPR: the application "${approved.r}" of ${approved.emp.no}, approved`);
  const l = new LeavePage(page);
  const buttonsOf = async (r: string) => {
    await l.open();
    return (await (await l.row(r)).getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
  };
  await qa.step(1, async () => {
    const b = await buttonsOf(approved.r);
    qa.note(1, `LV-APPR offers: ${b.join(', ') || 'nothing'}`);
    if (!b.some((x) => /cancel|batal/i.test(x))) qa.deviation(1, 'A cancellation with a reason', `the approved application offers ${b.join(', ') || 'no action'}`);
  });
  const open = await pending(page, qa, HR.emp1, '2027-04-05', '2027-04-07');
  await qa.step(2, async () => {
    const b = await buttonsOf(open.r);
    qa.note(2, `the pending application offers: ${b.join(', ')}`);
    if (!b.some((x) => /edit|withdraw|ubah|tarik/i.test(x))) qa.deviation(2, 'The application can be edited or withdrawn', `it offers ${b.join(', ')} only`);
  });
  const hr2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const l2 = new LeavePage(hr2);
      await l2.open();
      const row2 = await l2.row(open.r);
      expect(await decide(page, open.r, 'Reject')).toContain('Leave rejected');
      const mark = await toastMark(hr2);
      await row2.getByRole('button', { name: 'Approve' }).press('Enter');
      const toasts = await toastsAfter(hr2, mark);
      qa.note(3, `HR admin 2 approves from the old list: "${toasts.join(' / ')}"`);
      if (toasts.includes('Leave approved')) qa.deviation(3, 'A clear message that the application was already rejected', 'approved over the rejection');
      else if (!toasts.some((t) => /already|reject/i.test(t))) qa.deviation(3, 'A clear message that the application was already rejected', `toast "${toasts.join(' / ') || 'none'}"`);
    });
    await qa.step(4, async () => {
      const c = await leaveCells(hr2, open.r);
      qa.note(4, `after the reload: ${c.join(' | ')}`);
      expect(c[5]).toBe('REJECTED');
    });
  } finally {
    await hr2.context().close();
  }
});

qaTest('TC-APP010-024', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/id/hr');
    const roster = page.getByRole('main').getByRole('link', { name: 'Duty roster', exact: true });
    await roster.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const path = new URL(page.url()).pathname;
    qa.note(1, `"Duty roster" shows ${path}`);
    qa.deviation(1, 'A warning or a refusal when EMP-1 is given a shift on a day of leave', `no shift can be assigned: "Duty roster" ${path === '/id/hr' ? 'stays on the HR hub' : `opens ${path}`} and the site keeps no roster`);
  });
  qa.notRun(2, 'a payroll batch for March 2027 is not run on the shared site: the payroll tests use periods in 2099 (17 Payroll)');
});

qaTest('TC-APP010-025', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const emp1 = await employee(page, qa);
  await qa.step(1, async () => {
    const d = await p.openEdit(emp1.no);
    await p.fill(d, { status: 'Relieved' });
    expect(await saveEmployee(p, d)).toContain('Employee updated');
  });
  await qa.step(2, async () => {
    const d = await p.openEdit(emp1.no);
    const status = await d.getByRole('combobox', { name: 'Employment status' }).evaluate((e) => {
      const sel = e as HTMLSelectElement;
      return `${sel.value} (${sel.selectedOptions[0]?.textContent?.trim() ?? ''})`;
    });
    qa.note(2, `"Employment status" after reopening: ${status}`);
    if (!/relieved/i.test(status)) qa.deviation(2, '"Relieved", with the date of leaving', `the file reads ${status}: "Relieved" is not kept`);
    const leaving = await d.getByRole('textbox', { name: /leaving|relieving|keluar/i }).count();
    if (!leaving) qa.deviation(2, '"Relieved", with the date of leaving', 'no field for the date of leaving');
  });
  qa.notRun(3, 'EMP-1 of the test is linked to no account: no prepared account is free to be linked and disabled');
  await qa.step(4, async () => {
    await p.open();
    await p.find(emp1.no);
    const headers = (await p.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const row = (await p.row(emp1.no).innerText()).replace(/\s+/g, ' ');
    qa.note(4, `columns: ${headers.join(', ')}; row "${row}"`);
    if (!/Relieved/i.test(row)) qa.deviation(4, 'A status column or a mark for employees who have left', 'the row shows no status');
  });
});

qaTest('TC-APP010-037', async ({ qa, browser }) => {
  await signedOutJourney(browser, qa, '/hr/employees', /\/(id|en)\/hr\/employees/);
  await qa.step(4, async () => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      await page.goto('/id/hr/leave-applications');
      await expect(page).toHaveURL(/\/login\?next=%2Fhr%2Fleave-applications/, { timeout: 20_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } finally {
      await context.close();
    }
  });
});

qaTest('TC-APP010-039', async ({ page, qa, browser }) => {
  const p = new EmployeesPage(page);
  await qa.step(1, async () => {
    const e = employeeData(qa, { no: 'QA-EMP-CEPAT', name: 'QA Pegawai Cepat' });
    await p.open();
    const d = await p.openNew();
    await p.fill(d, e);
    await p.walk(d);
    await p.save(d).dblclick();
    await page.waitForTimeout(3000);
    await p.open();
    await p.find(e.no);
    const n = await p.row(e.no).count();
    qa.note(1, `double-click on "Save": ${n} employee(s) ${e.no}`);
    if (n !== 1) qa.deviation(1, 'One employee. The button is disabled while it reads "Saving…"', `${n} employees`);
  });
  await ensureLeaveTypes(page);
  await qa.step(2, async () => {
    const emp2 = await employee(page, qa, HR.emp2);
    const r = reason(qa);
    const l = new LeavePage(page);
    await l.open();
    await l.openSubmit();
    await l.fillLeave({ employee: emp2.no, type: HR.annual.name, from: '2027-05-03', to: '2027-05-03', days: '1', reason: r });
    await l.submit().dblclick();
    await page.waitForTimeout(3000);
    await l.open();
    const n = await (await l.row(r)).count();
    qa.note(2, `double-click on "Submit": ${n} application(s)`);
    if (n !== 1) qa.deviation(2, 'One application', `${n} applications`);
  });
  const hr2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const emp1 = await employee(page, qa);
      const p2 = new EmployeesPage(hr2);
      const [d1, d2] = [await p.openEdit(emp1.no), await p2.openEdit(emp1.no)];
      await p.next(d1).click();
      await p.addRow(d1, ROWS.Dependents);
      const t1 = await saveEmployee(p, d1);
      await p2.fill(d2, { designation: 'QA Perawat Senior' });
      const t2 = await saveEmployee(p2, d2);
      qa.note(3, `first admin (dependent): "${t1.join(' / ')}"; second admin (designation, dialog opened before): "${t2.join(' / ')}"`);
      if (t2.includes('Employee updated')) {
        const d = await p.openEdit(emp1.no);
        await p.next(d).click();
        const dependents = await d.getByLabel('Relation', { exact: true }).count();
        qa.deviation(3, 'The second is told that the file was changed in the meantime', `saved with no warning; the file now holds ${dependents} dependent(s)`);
      }
    });
  } finally {
    await hr2.context().close();
  }
  await qa.step(4, async () => {
    await p.open();
    const d = await p.openNew();
    await p.fill(d, { name: 'QA Setengah' });
    let asked = false;
    page.once('dialog', (x) => {
      asked = true;
      void x.dismiss();
    });
    await page.mouse.click(5, 5);
    await page.waitForTimeout(1000);
    const stillOpen = await d.isVisible();
    const confirm = await page.getByRole('alertdialog').count();
    qa.note(4, `click outside: dialog ${stillOpen ? 'still open' : 'closed'}`);
    if (!asked && !confirm && !stillOpen) qa.deviation(4, 'A question before the input is lost', 'the dialog closes and the input is lost');
  });
});

