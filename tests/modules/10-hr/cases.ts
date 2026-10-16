import { submitLeave, toastsAfter, leaveCells, employeeData, employee, decide } from './helpers';
import { todayWib } from '../../../lib/dates';
import { toastMark } from '../../../lib/assertions';
import { expect } from '../../../fixtures/e2e';
import { STEPS, LeavePage, EmployeesPage } from '../../../pages/hr/HrPages';
import { STAND_IN_STORE } from '../../../lib/inventory-data';
import { SC_STAND_IN, HR } from '../../../lib/hr-data';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 10-hr that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP010_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = new EmployeesPage(page);
  const e = employeeData(qa);
  const d = p.dialog('Create employee');

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^HR\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Employees', exact: true }).click();
    await expect(p.heading).toBeVisible();
    await expect(p.search).toBeVisible();
    for (const b of ['Search', 'Download', 'New employee']) await expect(page.getByRole('button', { name: b, exact: true })).toBeVisible();
    await expect(p.table).toBeVisible();
  });

  await qa.step(2, async () => {
    await p.openNew();
    await expect(d.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText(STEPS.map((s, i) => new RegExp(`${i + 1}\\s*${s}`)));
    await expect(p.next(d)).toBeDisabled();
    await expect(d.getByRole('textbox', { name: 'Branch' }).or(d.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await p.fill(d, { no: e.no, name: e.name, category: e.category, gender: e.gender, designation: e.designation, dob: e.dob });
    await expect(d.getByRole('combobox', { name: 'Employment status' })).toHaveValue(/Active/i);
    await expect(p.text(d, 'Name')).toHaveValue(e.name);
  });

  await qa.step(4, async () => {
    await p.fill(d, { department: HR.depA });
    await expect(d.getByRole('combobox', { name: 'Department' })).toHaveValue(new RegExp(HR.depA));
    await expect(p.next(d)).toBeEnabled();
  });

  await qa.step(5, async () => {
    await p.walk(d);
    await expect(p.save(d)).toBeVisible();
  });

  await qa.step(6, async () => {
    const mark = await toastMark(page);
    await p.save(d).click();
    expect(await toastsAfter(page, mark)).toContain('Employee saved');
    await expect(d).toBeHidden();
  });

  await qa.step(7, async () => {
    await p.open();
    await p.find(e.no);
    await expect(p.row(e.no)).toContainText(e.name);
    await expect(p.row(e.no).getByRole('button', { name: 'Edit' })).toBeVisible();
  });
};

export const TC_APP010_002 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = new EmployeesPage(page);
  const emp = await employee(page, qa);
  let d = p.dialog('Edit employee');

  await qa.step(1, async () => {
    d = await p.openEdit(emp.no);
    await expect(p.text(d, 'Name')).toHaveValue(emp.name);
  });

  await qa.step(2, async () => {
    await p.next(d).click();
    await p.addRow(d, ROWS.Dependents);
    await expect(p.next(d)).toBeEnabled();
  });

  await qa.step(3, async () => {
    for (const step of ['Contacts', 'Qualifications', 'Employment', 'Licences'] as const) {
      await p.next(d).click();
      await p.addRow(d, ROWS[step]);
      if (step !== 'Licences') await expect(p.next(d)).toBeEnabled();
    }
  });

  await qa.step(4, async () => {
    const mark = await toastMark(page);
    await p.save(d).click();
    expect(await toastsAfter(page, mark)).toContain('Employee updated');
  });

  await qa.step(5, async () => {
    d = await p.openEdit(emp.no);
    for (const step of ['Dependents', 'Contacts', 'Qualifications', 'Employment', 'Licences'] as const) {
      await p.next(d).click();
      for (const [label, value] of Object.entries(ROWS[step])) await expect(d.getByLabel(label, { exact: true }).last()).toHaveValue(value);
    }
  });
};

export const TC_APP010_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = new EmployeesPage(page);
  const emp = await employee(page, qa);
  let d = p.dialog('Edit employee');
  qa.note(1, `SC-A "${HR.scA}" and ST-A "${HR.stA}" are not on the site (stores cannot be made, found blocker 26); ${SC_STAND_IN.code} "${SC_STAND_IN.name}" and ${STAND_IN_STORE.code} stand in`);

  await qa.step(1, async () => {
    d = await p.openEdit(emp.no);
    await p.fill(d, { serviceCenter: SC_STAND_IN.name });
    await expect(d.getByRole('combobox', { name: 'Service center' })).toHaveValue(new RegExp(SC_STAND_IN.code));
  });

  await qa.step(2, async () => {
    await p.fill(d, { store: STAND_IN_STORE.name });
    await expect(d.getByRole('combobox', { name: 'Store' })).toHaveValue(new RegExp(STAND_IN_STORE.code));
  });

  await qa.step(3, async () => {
    await p.fill(d, { allocationFrom: '2027-01-01' });
    await p.walk(d);
    const mark = await toastMark(page);
    await p.save(d).click();
    expect(await toastsAfter(page, mark)).toContain('Employee updated');
  });

  await qa.step(4, async () => {
    d = await p.openEdit(emp.no);
    await expect(d.getByRole('combobox', { name: 'Service center' })).toHaveValue(new RegExp(SC_STAND_IN.code));
    await expect(d.getByRole('combobox', { name: 'Store' })).toHaveValue(new RegExp(STAND_IN_STORE.code));
    qa.note(4, `"Allocation from" after reopening: "${await p.text(d, 'Allocation from').inputValue()}"`);
  });
};

export const TC_APP010_007 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const l = new LeavePage(page);
  const name = qa.name('X Cuti Tahunan').replace(/^QA-/, 'QA ');
  const d = l.typeDialog;

  await qa.step(1, async () => {
    await page.goto('/en/hr');
    await page.getByRole('main').getByRole('link', { name: 'Leave applications', exact: true }).click();
    await l.openTypes();
    await expect(d.getByText('This type’s own number of leaves. There is no maximum across types.', { exact: true })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Leave types' }).locator('option:checked')).toHaveText('New type');
    for (const f of ['Name', 'Type']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    for (const f of ['Eligibility period', 'Number of leaves']) await expect(d.getByRole('spinbutton', { name: f })).toBeVisible();
    for (const f of ['Paid', 'Accumulated', 'Approval required']) await expect(d.getByRole('checkbox', { name: f })).toBeVisible();
    await expect(d.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Name' }).fill(name);
    await d.getByRole('textbox', { name: 'Type' }).fill('TAHUNAN');
    await d.getByRole('spinbutton', { name: 'Eligibility period' }).fill('12');
    await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('12');
    await d.getByRole('checkbox', { name: 'Paid' }).check();
    await d.getByRole('checkbox', { name: 'Approval required' }).check();
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    expect(await toastsAfter(page, mark)).toContain('Leave type saved');
    await expect(d).toBeHidden();
  });

  await qa.step(3, async () => {
    await l.open();
    const s = await l.openSubmit();
    const options = await s.getByRole('combobox', { name: 'Leave type' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.includes(name))).toBe(true);
  });

  await qa.step(4, async () => {
    await l.open();
    await l.openTypes();
    const select = d.getByRole('combobox', { name: 'Leave types' });
    await select.selectOption({ label: `${name} · TAHUNAN` });
    await expect(d.getByText('Edit leave type', { exact: true })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Name' })).toHaveValue(name);
    await expect(d.getByRole('spinbutton', { name: 'Number of leaves' })).toHaveValue('12');
  });

  await qa.step(5, async () => {
    await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('14');
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    expect(await toastsAfter(page, mark)).toContain('Leave type saved');
  });
};

export const TC_APP010_008 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const l = new LeavePage(page);
  const emp = await employee(page, qa);
  const r = reason(qa);
  const s = l.submitDialog;

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    await expect(s.getByText('Creates a PENDING leave application.', { exact: true })).toBeVisible();
    await expect(s.getByRole('textbox', { name: 'From date' })).toHaveValue(todayWib());
    await expect(s.getByRole('textbox', { name: 'To date' })).toHaveValue(todayWib());
    await expect(s.getByRole('spinbutton', { name: 'Days' })).toHaveValue('1');
    await expect(s.getByRole('combobox', { name: 'Slot' })).toHaveValue(/full/i);
    await expect(s.getByRole('textbox', { name: 'Reason' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await l.fillLeave({ employee: emp.no });
    await expect(s.getByRole('combobox', { name: 'Employee' })).toHaveValue(`${emp.no} ${emp.name}`);
  });

  await qa.step(3, async () => {
    await l.fillLeave({ type: HR.annual.name, from: '2027-03-01', to: '2027-03-03', days: '3', reason: r });
    const mark = await toastMark(page);
    await l.submit().click();
    expect(await toastsAfter(page, mark)).toContain('Leave submitted');
    await expect(s).toBeHidden();
  });

  await qa.step(4, async () => {
    const c = await leaveCells(page, r);
    expect(c.slice(0, 7)).toEqual([HR.annual.name, '2027-03-01', '2027-03-03', '3', 'Full day', 'PENDING', r]);
    expect(c[7]).toBe('Approve Reject');
  });
};

export const TC_APP010_009 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const { r } = await pending(page, qa);
  qa.note(1, 'LV-PEND is an application of this test');
  await qa.step(1, async () => {
    expect(await decide(page, r, 'Approve')).toContain('Leave approved');
  });
  await qa.step(2, async () => {
    const c = await leaveCells(page, r);
    expect([c[5], c[7]]).toEqual(['APPROVED', '—']);
  });
};

export const ROWS = {
  Dependents: { 'Date of birth': '2015-06-01', Relation: 'Anak', Gender: 'Laki-laki' },
  Contacts: { Type: 'Rumah', Address: 'QA Jl. Uji 1', Country: 'Indonesia', State: 'QA Provinsi', District: 'QA Kabupaten', City: 'QA Kota' },
  Qualifications: { Qualification: 'QA S1 Keperawatan' },
  Employment: { Organisation: 'QA RS Lama' },
  Licences: { 'Licensing authority': 'QA Majelis', 'Valid till': '2028-12-31' },
};

export const reason = (qa: Qa, text = 'QA Cuti keluarga') => `${text} ${qa.token()}`;

/** A pending application of a new employee; returns its reason. */
export async function pending(page: import('@playwright/test').Page, qa: Qa, base: { no: string; name: string } = HR.emp1, from = '2027-03-01', to = '2027-03-03'): Promise<{ r: string; emp: { no: string; name: string } }> {
  const emp = await employee(page, qa, base);
  const r = reason(qa);
  expect(await submitLeave(page, { employee: emp.no, from, to, days: '3', reason: r })).toContain('Leave submitted');
  return { r, emp };
}
