import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { EmployeesPage, LeavePage, pickHit } from '../../../pages/hr/HrPages';
import { everyPage } from '../../../pages/paging';
import { appsCardRefused, asUser, BR_A, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { createEmployee, employee, employeeData, ensureLeaveTypes, toastsAfter } from './helpers';

/**
 * 10-hr.xlsx, the access test cases of Employees and Leave applications: U2
 * on "All branches", U3 without any right, and U1 next to a branch of U6
 * (Kemayoran). Employees carry a token in number and name. The Employee
 * picker of "Submit leave" holds the first employees only (found blocker
 * 40): a new employee is often not offered, so leave for one cannot be
 * submitted. The department of BR-B is "Anak".
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const BR_B_DEPARTMENT = 'Anak';

/** The hits of a type-ahead for a text. */
async function hits(page: Page, field: Locator, typed: string): Promise<string[]> {
  await field.fill(typed);
  await page.waitForLoadState('networkidle').catch(() => {});
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  await list.getByRole('option').first().waitFor({ timeout: 4_000 }).catch(() => {});
  return (await list.getByRole('option').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

/** Rows of an employee number on the list of a user, all pages. */
async function employeeListed(page: Page, no: string): Promise<number> {
  const p = new EmployeesPage(page);
  await p.open();
  await p.find(no);
  await page.waitForLoadState('networkidle').catch(() => {});
  return p.row(no).count();
}

/** The reasons of all leave applications of a user's list. */
async function leaveReasons(page: Page): Promise<string[]> {
  const l = new LeavePage(page);
  await l.open();
  await page.waitForLoadState('networkidle').catch(() => {});
  return everyPage(page.locator('body'), () => l.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[6]?.textContent?.trim() ?? '')));
}

/** The leave types of the "Leave types" dialog. */
async function leaveTypes(page: Page): Promise<string[]> {
  const l = new LeavePage(page);
  await l.open();
  const d = await l.openTypes();
  const list = d.getByRole('combobox', { name: 'Leave types' }).locator('option');
  await expect.poll(() => list.count(), { timeout: 10_000 }).toBeGreaterThan(1);
  return (await list.allInnerTexts()).map((t) => t.trim());
}

qaTest('TC-APP010-013', async ({ page, qa, browser }) => {
  const p = new EmployeesPage(page);
  const empB = employeeData(qa, { no: 'QA-EMP-B02', name: HR.emp1.name });
  const d = p.dialog('Create employee');
  const branch = d.getByRole('combobox', { name: 'Branch' });
  const department = d.getByRole('combobox', { name: 'Department' });

  await qa.step(1, async () => {
    await p.open();
    const headers = (await p.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await p.openNew();
    await expect(branch).toBeVisible();
    expect(await hits(page, department, 'QA')).toEqual([]);
  });

  await qa.step(3, async () => {
    await branch.selectOption({ label: BR_B });
    const ofB = await hits(page, department, BR_B_DEPARTMENT);
    expect(ofB.some((h) => h.includes(BR_B_DEPARTMENT))).toBe(true);
    expect((await hits(page, department, 'QA Poli Umum')).filter((h) => h.includes('QA Poli Umum')), `"QA Poli Umum" of ${BR_A} offered for ${BR_B}`).toEqual([]);
  });

  await qa.step(4, async () => {
    await pickHit(page, department, BR_B_DEPARTMENT);
    await branch.selectOption({ label: BR_A });
    await expect(department).toHaveValue('');
    for (const f of ['Service center', 'Store']) await expect(d.getByRole('combobox', { name: f })).toHaveValue('');
  });

  await qa.step(5, async () => {
    await branch.selectOption({ label: BR_B });
    await p.fill(d, { ...empB, department: BR_B_DEPARTMENT });
    await p.walk(d);
    const mark = await toastMark(page);
    await p.save(d).click();
    expect(await toastsAfter(page, mark)).toContain('Employee saved');
  });

  const l = new LeavePage(page);
  await l.open();
  await l.openSubmit();
  const leaveBranch = l.submitDialog.getByRole('combobox', { name: 'Branch' });
  if (await leaveBranch.count()) await leaveBranch.selectOption({ label: BR_B });
  const found = await hits(page, l.submitDialog.getByRole('combobox', { name: 'Employee' }), empB.no);
  if (!found.some((h) => h.includes(empB.no))) {
    qa.note(6, `with ${BR_B} chosen, "Employee" does not offer ${empB.no}`);
    for (const s of [6, 7, 8]) qa.blocked(s, 40);
    return;
  }
  const reason = qa.name('QA Cuti cabang');
  await qa.step(6, async () => {
    const types = await l.submitDialog.getByRole('combobox', { name: 'Leave type' }).locator('option').allInnerTexts();
    qa.note(6, `"Leave type" offers ${types.map((t) => t.trim()).filter(Boolean).join(', ')}`);
  });
  await qa.step(7, async () => {
    await l.fillLeave({ employee: empB.no, type: (await l.submitDialog.getByRole('combobox', { name: 'Leave type' }).locator('option').allInnerTexts())[1], from: addDays(todayWib(), 30), to: addDays(todayWib(), 30), days: '1', reason });
    expect(await toastsOf(page, () => l.submit().click())).toContain('Leave submitted');
  });
  await qa.step(8, async () => {
    await asUser(browser, 'U6', async (u6) => {
      expect(await employeeListed(u6, empB.no)).toBe(1);
      expect(await leaveReasons(u6)).toContain(reason);
    });
    await asUser(browser, 'U1', async (u1) => {
      expect(await employeeListed(u1, empB.no)).toBe(0);
      expect(await leaveReasons(u1)).not.toContain(reason);
    });
  });
});

qaTest('TC-APP010-020', async ({ page, qa }) => {
  // The precondition links the HR admin's account (U1) to EMP-2; U1 is a shared account of the site and is not relinked.
  qa.note(1, 'the account of U1 is shared and is not linked to a test employee; leave for a new employee cannot be submitted either (the Employee picker, found blocker 40)');
  qa.blocked(1, 40);
  qa.blocked(2, 40);
  await qa.step(3, async () => {
    const l = new LeavePage(page);
    await l.open();
    const headers = (await l.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /approver|decided|by/i.test(h))) qa.deviation(3, 'The approver is shown', `no column names who decided (columns: ${headers.join(', ')})`);
  });
});

qaTest('TC-APP010-026', async ({ page, qa, browser }) => {
  const p = new EmployeesPage(page);
  const emp1 = await employee(page, qa);
  const emp2 = await employee(page, qa, HR.emp2);
  const empB = await asUser(browser, 'U6', (u6) => employee(u6, qa, { no: 'QA-EMP-B01', name: HR.emp1.name }));
  const taken = 'Employee no. already exists';

  await qa.step(1, async () => {
    const toasts = await createEmployee(page, { ...employeeData(qa), no: emp1.no });
    expect(toasts).not.toContain('Employee saved');
    if (!toasts.includes(taken)) qa.deviation(1, `Toast "${taken}"`, `toast "${toasts.join(' / ') || 'none'}"`);
    await expect(p.dialog('Create employee')).toBeVisible();
  });

  await qa.step(2, async () => {
    const toasts = await createEmployee(page, { ...employeeData(qa), no: empB.no });
    expect(toasts).not.toContain('Employee saved');
    if (!toasts.includes(taken)) qa.deviation(2, `Toast "${taken}": the number is taken in BR-B`, `toast "${toasts.join(' / ') || 'none'}"`);
  });

  const renumber = async (no: string) => {
    const d = await p.openEdit(emp2.no);
    await p.text(d, 'Employee no.').fill(no);
    await p.walk(d);
    const mark = await toastMark(page);
    await p.save(d).click();
    return toastsAfter(page, mark);
  };

  await qa.step(3, async () => {
    const toasts = await renumber(emp1.no);
    expect(toasts).not.toContain('Employee updated');
    if (!toasts.includes(taken)) qa.deviation(3, `Toast "${taken}"`, `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(4, async () => {
    const toasts = await renumber(qa.code('QA-EMP-099'));
    qa.note(4, `renumbering EMP-2: ${toasts.includes('Employee updated') ? 'accepted; an employee number is not fixed once given' : `"${toasts.join(' / ')}"`} (the rule is not known)`);
  });
});

qaTest('TC-APP010-029', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const e = { ...employeeData(qa), allocationFrom: '2027-01-01' };
  expect(await createEmployee(page, e)).toContain('Employee saved');
  qa.note(1, `EMP-1 is ${e.no}, allocated from 2027-01-01 (SC-A is not on the site; the allocation is made without a service center)`);
  let d!: Locator;

  await qa.step(1, async () => {
    d = await p.openEdit(e.no);
    const text = await d.innerText();
    if (!/mapping/i.test(text) || !(await d.getByRole('button', { name: /mapping|add branch/i }).count())) qa.deviation(1, 'A list of branch mappings with a button to add one', 'the file has no place for a second branch');
  });

  await qa.step(2, async () => {
    const text = await d.innerText();
    if (!/allocations?/i.test(text) || !(await d.getByRole('table').count())) qa.deviation(2, 'A list with service center, from date and to date', 'the file shows no allocations; only the input "Allocation from"');
  });

  await qa.step(3, async () => {
    if (!(await d.getByRole('textbox', { name: /allocation to|to date/i }).count())) qa.deviation(3, 'A to date can be set', 'there is no "to" date for an allocation');
  });

  await qa.step(4, async () => {
    const saves: string[] = [];
    for (let i = 0; i < 2; i++) {
      const dd = await p.openEdit(e.no);
      await p.text(dd, 'Allocation from').fill('2027-02-01');
      await p.walk(dd);
      const mark = await toastMark(page);
      await p.save(dd).click();
      saves.push((await toastsAfter(page, mark)).join(' / '));
    }
    qa.note(4, `two saves with 2027-02-01: "${saves.join('", then "')}"`);
    if (saves.every((s) => s.includes('Employee updated'))) qa.deviation(4, 'The allocation is moved, or the second save is refused as a double', 'both saves are accepted; nothing shows whether an allocation was moved or added');
  });
});

qaTest('TC-APP010-033', async ({ page, qa, browser }) => {
  // Precondition (made by U1): EMP-1. LV-PEND cannot be made: leave for a new employee cannot be submitted (found blocker 40).
  const emp1 = await employee(page, qa);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const toasts = await createEmployee(staff, employeeData(qa, { no: 'QA-EMP-TANPA-HAK', name: HR.emp1.name }));
      expect(toasts).not.toContain('Employee saved');
      qa.note(1, `Save: "${toasts.join(' / ') || 'no toast'}"`);
      if (!toasts.some((t) => /privilege|permission|not allowed|right/i.test(t))) qa.deviation(1, 'Refused with a message that the user may not do this', `toast "${toasts.join(' / ') || 'none'}"`);
    });

    await qa.step(2, async () => {
      const p = new EmployeesPage(staff);
      const d = await p.openEdit(emp1.no);
      await p.text(d, 'Designation').fill(qa.prefix('X Jabatan tanpa hak'));
      await p.walk(d);
      await tryRefused(qa, 2, staff, 'Edit', /^Employee updated$/, () => p.save(d).click());
      const mine = await new EmployeesPage(page).openEdit(emp1.no);
      await expect(mine.getByRole('textbox', { name: 'Designation', exact: true })).toHaveValue(HR.emp1.designation);
    });

    qa.blocked(3, 40);
    qa.blocked(4, 40);

    await qa.step(5, async () => {
      const name = qa.name('QA Cuti Tanpa Hak');
      const l = new LeavePage(staff);
      await l.open();
      const d = await l.openTypes();
      await d.getByRole('textbox', { name: 'Name' }).fill(name);
      await d.getByRole('textbox', { name: 'Type' }).fill('UJI');
      await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('1');
      await tryRefused(qa, 5, staff, 'Save type', /^Leave type saved$/, () => d.getByRole('button', { name: 'Save type' }).click());
      expect((await leaveTypes(page)).some((t) => t.startsWith(name))).toBe(false);
    });
    qa.note(1, 'every button is shown to U3');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP010-034', async ({ page, qa, browser }) => {
  const emp1 = await employee(page, qa);
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^HR\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/hr/employees']));
    await qa.step(3, async () => {
      const p = new EmployeesPage(staff);
      const d = await p.openEdit(emp1.no).catch(() => null);
      if (!d) return;
      await p.walk(d);
      qa.deviation(3, 'Not possible', `U3 opens ${emp1.no} and walks through the six steps of the file`);
    });
    await qa.step(4, async () => {
      const p = new EmployeesPage(staff);
      await p.open();
      const button = staff.getByRole('button', { name: 'Download' });
      if (!(await button.count())) return;
      const download = staff.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
      await button.click();
      const file = await download;
      if (file) qa.deviation(4, 'Not possible', `"Download" gives U3 the file ${file.suggestedFilename()}`);
    });
    await qa.step(5, () => routesRefused(staff, qa, 5, ['/hr/leave-applications']));
  });
});

qaTest('TC-APP010-035', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): EMP-B, a leave type of BR-B and, when its picker offers EMP-B, a leave application.
  const typeB = qa.name('QA Cuti Cabang');
  const reasonB = qa.name('QA Cuti cabang');
  const { empB, leave } = await asUser(browser, 'U6', async (u6) => {
    const e = await employee(u6, qa, { no: 'QA-EMP-B01', name: HR.emp1.name });
    const l = new LeavePage(u6);
    await l.open();
    const d = await l.openTypes();
    await d.getByRole('textbox', { name: 'Name' }).fill(typeB);
    await d.getByRole('textbox', { name: 'Type' }).fill('UJI');
    await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('12');
    expect(await toastsOf(u6, () => d.getByRole('button', { name: 'Save type' }).click())).toContain('Leave type saved');
    await l.open();
    await l.openSubmit();
    const offered = (await hits(u6, l.submitDialog.getByRole('combobox', { name: 'Employee' }), e.no)).some((h) => h.includes(e.no));
    if (!offered) return { empB: e, leave: false };
    await l.fillLeave({ employee: e.no, type: typeB, from: addDays(todayWib(), 30), to: addDays(todayWib(), 30), days: '1', reason: reasonB });
    expect(await toastsOf(u6, () => l.submit().click())).toContain('Leave submitted');
    return { empB: e, leave: true };
  });
  await ensureLeaveTypes(page);

  await qa.step(1, async () => {
    expect(await employeeListed(page, empB.no)).toBe(0);
  });

  await qa.step(2, async () => {
    if (!leave) {
      qa.note(2, `U6 could not submit leave for ${empB.no} (the Employee picker, found blocker 40): no leave of BR-B of this test to look for`);
      return;
    }
    expect(await leaveReasons(page)).not.toContain(reasonB);
  });

  await qa.step(3, async () => {
    const l = new LeavePage(page);
    await l.open();
    await l.openSubmit();
    expect((await hits(page, l.submitDialog.getByRole('combobox', { name: 'Employee' }), empB.no)).filter((h) => h.includes(empB.no))).toEqual([]);
    const none = await l.submitDialog.getByText('No employee matches').count();
    if (!none) qa.note(3, `no hit for ${empB.no}, but no text "No employee matches"`);
  });

  await qa.step(4, async () => {
    expect((await leaveTypes(page)).some((t) => t.startsWith(typeB))).toBe(false);
  });

  await qa.step(5, () => headerOneBranch(page, qa, 5));
});

