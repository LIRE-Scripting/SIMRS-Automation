import { expect, type Locator, type Page } from '@playwright/test';

/**
 * HR (/en/hr): Employees and Leave applications (both without a <main>
 * landmark) and the HR desk screens (/hr/desk…). Read from the live screens
 * on 2026-10-15.
 */

export interface Employee {
  no?: string;
  name?: string;
  status?: 'Active' | 'Inactive' | 'Relieved';
  category?: string;
  gender?: string;
  designation?: string;
  /** yyyy-mm-dd */
  dob?: string;
  /** Text typed in "Department"; the hit containing it is clicked. */
  department?: string;
  serviceCenter?: string;
  store?: string;
  email?: string;
  reportingAuthority?: string;
  accountLogin?: string;
  allocationFrom?: string;
}

/** A row of the steps 2 … 6, by the labels of its inputs. */
export type StepRow = Record<string, string>;
export const STEPS = ['File', 'Dependents', 'Contacts', 'Qualifications', 'Employment', 'Licences'] as const;

/** A type-ahead with hits "code · name" in `#<aria-controls>`; the hit containing `pick` is clicked. */
export async function pickHit(page: Page, field: Locator, typed: string, pick: string = typed): Promise<void> {
  await field.fill(typed);
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  await list.getByRole('option').filter({ hasText: pick }).first().getByRole('button').click();
}

export class EmployeesPage {
  readonly heading: Locator;
  readonly table: Locator;
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Employees' });
    this.table = page.getByRole('table');
    this.search = page.getByRole('searchbox', { name: 'Search' });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/hr/employees');
    await expect(this.heading).toBeVisible();
  }

  dialog(name: 'Create employee' | 'Edit employee'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  row(no: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('cell', { name: no, exact: true }) });
  }

  async find(text: string): Promise<void> {
    await this.search.fill(text);
    await this.page.getByRole('button', { name: 'Search', exact: true }).click();
  }

  pager(): Locator {
    return this.page.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  async openNew(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'New employee' }).click();
    const d = this.dialog('Create employee');
    await expect(d).toBeVisible();
    return d;
  }

  /** Opens "Edit employee" of an employee (searched by number). */
  async openEdit(no: string): Promise<Locator> {
    await this.open();
    await this.find(no);
    await this.row(no).getByRole('button', { name: 'Edit' }).click();
    const d = this.dialog('Edit employee');
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Employee no.' })).toHaveValue(no);
    return d;
  }

  text(d: Locator, name: string): Locator {
    return d.getByRole('textbox', { name, exact: true });
  }

  async fill(d: Locator, e: Employee): Promise<void> {
    if (e.no !== undefined) await this.text(d, 'Employee no.').fill(e.no);
    if (e.name !== undefined) await this.text(d, 'Name').fill(e.name);
    if (e.status !== undefined) await d.getByRole('combobox', { name: 'Employment status' }).selectOption(e.status);
    if (e.category !== undefined) await this.text(d, 'Category').fill(e.category);
    if (e.gender !== undefined) await this.text(d, 'Gender').fill(e.gender);
    if (e.designation !== undefined) await this.text(d, 'Designation').fill(e.designation);
    if (e.dob !== undefined) await this.text(d, 'Date of birth').fill(e.dob);
    if (e.department !== undefined) await pickHit(this.page, d.getByRole('combobox', { name: 'Department' }), e.department);
    if (e.serviceCenter !== undefined) await pickHit(this.page, d.getByRole('combobox', { name: 'Service center' }), e.serviceCenter);
    if (e.store !== undefined) await pickHit(this.page, d.getByRole('combobox', { name: 'Store' }), e.store);
    if (e.email !== undefined) await this.text(d, 'E-mail').fill(e.email);
    if (e.reportingAuthority !== undefined) await this.text(d, 'Reporting authority').fill(e.reportingAuthority);
    if (e.accountLogin !== undefined) await this.text(d, 'Account login').fill(e.accountLogin);
    if (e.allocationFrom !== undefined) await this.text(d, 'Allocation from').fill(e.allocationFrom);
  }

  next(d: Locator): Locator {
    return d.getByRole('button', { name: 'Next', exact: true });
  }

  save(d: Locator): Locator {
    return d.getByRole('button', { name: /^(Save|Saving…)$/ });
  }

  /** Adds one row on the current step and fills it by label. */
  async addRow(d: Locator, row: StepRow): Promise<void> {
    await d.getByRole('button', { name: 'Add', exact: true }).click();
    for (const [label, value] of Object.entries(row)) await d.getByLabel(label, { exact: true }).last().fill(value);
  }

  /** Goes from "File" to "Licences" with the given rows per step (none by default). */
  async walk(d: Locator, rows: Partial<Record<(typeof STEPS)[number], StepRow>> = {}): Promise<void> {
    for (const step of STEPS.slice(1)) {
      await this.next(d).click();
      const row = rows[step];
      if (row) await this.addRow(d, row);
    }
    await expect(this.save(d)).toBeVisible();
  }
}

export class LeavePage {
  readonly heading: Locator;
  readonly table: Locator;
  readonly submitDialog: Locator;
  readonly typeDialog: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Leave applications' });
    this.table = page.getByRole('table');
    this.submitDialog = page.getByRole('dialog', { name: 'Submit leave' });
    this.typeDialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: /^(Save type|Saving…)$/ }) });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/hr/leave-applications');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** Cells: Type, From, To, Days, Slot, Status, Reason, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  pager(): Locator {
    return this.page.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  /** The row of an application by its reason (unique per test), paging through the list from page 1. */
  async row(reason: string): Promise<Locator> {
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: reason, exact: true }) });
    await expect(this.rows().first()).toBeVisible();
    const next = this.page.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 60; i++) {
      if (await match().count()) return match();
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      // Toasts sit over the pager, so the button is pressed with the keyboard.
      await next.press('Enter');
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return match();
  }

  async openSubmit(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Submit leave' }).click();
    await expect(this.submitDialog).toBeVisible();
    return this.submitDialog;
  }

  async fillLeave(l: { employee?: string; type?: string; from?: string; to?: string; days?: string; slot?: 'Full day' | 'Morning' | 'Afternoon'; reason?: string }): Promise<void> {
    const d = this.submitDialog;
    if (l.employee !== undefined) await pickHit(this.page, d.getByRole('combobox', { name: 'Employee' }), l.employee);
    if (l.type !== undefined) {
      const select = d.getByRole('combobox', { name: 'Leave type' });
      const label = (await select.locator('option').allInnerTexts()).find((o) => o.trim() === l.type || o.startsWith(`${l.type} ·`));
      await select.selectOption({ label: label ?? l.type });
    }
    if (l.from !== undefined) await d.getByRole('textbox', { name: 'From date' }).fill(l.from);
    if (l.to !== undefined) await d.getByRole('textbox', { name: 'To date' }).fill(l.to);
    if (l.days !== undefined) await d.getByRole('spinbutton', { name: 'Days' }).fill(l.days);
    if (l.slot !== undefined) await d.getByRole('combobox', { name: 'Slot' }).selectOption(l.slot);
    if (l.reason !== undefined) await d.getByRole('textbox', { name: 'Reason' }).fill(l.reason);
  }

  submit(): Locator {
    return this.submitDialog.getByRole('button', { name: /^(Submit|Submitting…)$/ });
  }

  async openTypes(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Leave types' }).click();
    await expect(this.typeDialog).toBeVisible();
    return this.typeDialog;
  }
}
