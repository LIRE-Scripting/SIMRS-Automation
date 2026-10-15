import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { DEP_A_HIT, HR } from '../../../lib/hr-data';
import { EmployeesPage, LeavePage, type Employee } from '../../../pages/hr/HrPages';

/**
 * Shared steps of 10-hr.xlsx. Employees are made per test (number and name
 * with a new token); leave applications are found by their reason, which
 * carries the token too. LT-ANNUAL and LT-OFF are made once and reused.
 */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** EMP-1 (or EMP-2) of the catalogue with a new token in number and name. */
export function employeeData(qa: Qa, base: { no: string; name: string } = HR.emp1): Required<Pick<Employee, 'no' | 'name'>> & Employee {
  const t = qa.token();
  return { ...HR.emp1, no: `${base.no}-${t}`, name: `${base.name} ${t}`, department: DEP_A_HIT };
}

/** Creates an employee through the six steps and returns it (toast "Employee saved"). */
export async function createEmployee(page: Page, e: Employee): Promise<string[]> {
  const p = new EmployeesPage(page);
  await p.open();
  const d = await p.openNew();
  await p.fill(d, e);
  await p.walk(d);
  const mark = await toastMark(page);
  await p.save(d).click();
  return toastsAfter(page, mark);
}

export async function employee(page: Page, qa: Qa, base?: { no: string; name: string }): Promise<{ no: string; name: string }> {
  const e = employeeData(qa, base);
  expect(await createEmployee(page, e)).toContain('Employee saved');
  return { no: e.no, name: e.name };
}

let typesChecked = false;

/** LT-ANNUAL ("QA-Annual", ANNUAL, 12, active) and LT-OFF ("QA-Lama", not active): made once and reused. */
export async function ensureLeaveTypes(page: Page): Promise<void> {
  if (typesChecked) return;
  const l = new LeavePage(page);
  for (const t of [
    { name: HR.annual.name, type: HR.annual.type, leaves: HR.annual.leaves, active: true },
    { name: HR.off.name, type: 'LAMA', leaves: '0', active: false },
  ]) {
    await l.open();
    const d = await l.openTypes();
    const options = await d.getByRole('combobox', { name: 'Leave types' }).locator('option').allInnerTexts();
    if (options.some((o) => o.trim().startsWith(`${t.name} ·`))) continue;
    await d.getByRole('textbox', { name: 'Name' }).fill(t.name);
    await d.getByRole('textbox', { name: 'Type' }).fill(t.type);
    await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill(t.leaves);
    await d.getByRole('checkbox', { name: 'Active' }).setChecked(t.active);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    expect(await toastsAfter(page, mark)).toContain('Leave type saved');
  }
  typesChecked = true;
}

export type Leave = { employee: string; type?: string; from: string; to: string; days?: string; slot?: 'Full day' | 'Morning' | 'Afternoon'; reason: string };

/** Submits leave and returns the toasts (the dialog may stay open on a refusal). */
export async function submitLeave(page: Page, v: Leave): Promise<string[]> {
  const l = new LeavePage(page);
  await l.open();
  await l.openSubmit();
  await l.fillLeave({ type: HR.annual.name, ...v });
  const mark = await toastMark(page);
  await l.submit().click();
  return toastsAfter(page, mark);
}

/** The cells of an application found by its reason. */
export async function leaveCells(page: Page, reason: string): Promise<string[]> {
  const l = new LeavePage(page);
  await l.open();
  return l.cells(await l.row(reason));
}

/** Approve or Reject on an application's row. */
export async function decide(page: Page, reason: string, action: 'Approve' | 'Reject'): Promise<string[]> {
  const l = new LeavePage(page);
  await l.open();
  const row = await l.row(reason);
  const mark = await toastMark(page);
  await row.getByRole('button', { name: action }).press('Enter');
  return toastsAfter(page, mark);
}
