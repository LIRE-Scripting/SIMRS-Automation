import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { HR } from '../../../lib/hr-data';
import { createEmployee, employeeData, toastsAfter } from '../10-hr/helpers';

/**
 * Shared steps of 17-payroll.xlsx. Employees (EMP-1, EMP-2, EMP-OFF, …) are
 * made per test in HR with a token in number and name. Payroll batches has
 * no <main> and "Batch result" is a panel with a heading, not a dialog.
 */

export { toastsAfter };

export const RAN = 'Payroll batch run';
export const SAVED = 'Saved.';

/** Amount text with the non-breaking spaces of the site made plain. */
export const plain = (t: string) => t.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Makes an employee in HR (number "<base>-<token>") and returns number and name. */
export async function payrollEmployee(page: Page, qa: Qa, base: { no: string; name: string } = HR.emp1, extra: { status?: 'Inactive'; name?: string } = {}): Promise<{ no: string; name: string }> {
  const e = { ...employeeData(qa, base), ...extra };
  expect(await createEmployee(page, e)).toContain('Employee saved');
  return { no: e.no, name: e.name };
}

export class Batches {
  readonly employee: Locator;
  readonly period: Locator;
  readonly currency: Locator;
  readonly base: Locator;
  readonly run: Locator;
  readonly panel: Locator;
  constructor(readonly page: Page) {
    this.employee = page.getByRole('combobox', { name: 'Employee' });
    this.period = page.getByRole('textbox', { name: 'Period' });
    this.currency = page.getByRole('textbox', { name: 'Currency' });
    this.base = page.getByRole('spinbutton', { name: 'Base amount' });
    this.run = page.getByRole('button', { name: /^(Run batch|Running…)$/ });
    this.panel = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Batch result' }) })
      .filter({ has: page.getByRole('term') })
      .last();
  }
  async open(): Promise<void> {
    await this.page.goto('/en/payroll/batches');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Payroll batches' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  hits(): Locator {
    return this.page.getByRole('listbox').getByRole('option');
  }
  async pick(text: string, choose = text): Promise<void> {
    await this.employee.fill(text);
    await this.hits().filter({ hasText: choose }).first().click();
  }
  rows(): Locator {
    return this.page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map(plain);
  }
  /** Fills the given fields (an empty string empties one) and clicks "Run batch"; returns the toasts. */
  async runWith(v: { employee?: string; period?: string; currency?: string; base?: string }): Promise<string[]> {
    await this.open();
    if (v.employee !== undefined) await this.pick(v.employee);
    if (v.period !== undefined) await this.period.fill(v.period);
    if (v.currency !== undefined) await this.currency.fill(v.currency);
    if (v.base !== undefined) await this.base.fill(v.base);
    return this.submit();
  }
  /** Clicks "Run batch" on the form as it stands; returns the toasts. */
  async submit(): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.run.click();
    return toastsAfter(this.page, mark);
  }
  /** "Batch result": number and status line, Gross, Net and the lines ("CODE (Agent) IDR …"). */
  async result(): Promise<{ head: string; gross: string; net: string; lines: string[] }> {
    await expect(this.panel).toBeVisible();
    const dd = this.panel.getByRole('definition');
    return {
      head: plain(await this.panel.getByRole('paragraph').first().innerText()),
      gross: plain(await dd.nth(0).innerText()),
      net: plain(await dd.nth(1).innerText()),
      lines: (await this.panel.getByRole('listitem').allInnerTexts()).map(plain),
    };
  }
  async close(): Promise<void> {
    await this.panel.getByRole('button', { name: 'Close' }).click();
    await expect(this.panel).toHaveCount(0);
  }
}

/** The desk screens (/payroll/desk/*): one button opens a dialog with "Code", "Amount", … and "Save". */
export class Desk {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(route: string, heading: string): Promise<void> {
    await this.page.goto(`/en/payroll/desk${route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  /** Opens the dialog with its button, fills the text fields, picks the action, saves; returns the toasts. */
  async save(route: string, heading: string, button: string, v: Record<string, string>, action?: string): Promise<string[]> {
    await this.open(route, heading);
    await this.main.getByRole('button', { name: button }).click();
    for (const [k, val] of Object.entries(v)) await this.dialog.getByRole('textbox', { name: k }).fill(val);
    if (action) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(this.page, mark);
  }
  /** "Correct", "Re-run", "Doctor fee" or "Lock month" on Calculate (/payroll/desk/run). */
  calculate(v: Record<string, string>, action: 'Correct' | 'Re-run' | 'Doctor fee' | 'Lock month'): Promise<string[]> {
    return this.save('/run', 'Re-run', 'Correct', v, action);
  }
  /** Table rows after typing in the search input. */
  async search(text: string): Promise<Locator> {
    await this.main.getByRole('textbox', { name: 'Search' }).fill(text);
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').filter({ hasNot: this.page.getByText(/^No /) });
  }
}
