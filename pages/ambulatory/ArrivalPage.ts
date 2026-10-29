import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import { escapeRe } from './RegisteredPatientsPage';

/**
 * Ambulatory Care > Arrival (/id/registration/department-queue) and the
 * queue board (/id/queue). Read from the live screens on 2026-10-14.
 */
export class ArrivalPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly arriveButton: Locator;
  readonly numberRuleButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Arrival' });
    this.arriveButton = this.main.getByRole('button', { name: 'Arrive', exact: true });
    this.numberRuleButton = this.main.getByRole('button', { name: 'Number rule', exact: true });
    this.table = this.main.getByRole('table');
  }

  async open(): Promise<void> {
    await this.page.goto('/id/registration/department-queue');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') }).filter({
      hasNot: this.page.getByText('No arrivals today.'),
    });
  }

  /** The row of a patient in a department. */
  row(patient: string, department?: string): Locator {
    let r = this.rows().filter({ hasText: patient });
    if (department) r = r.filter({ has: this.page.getByRole('cell', { name: department, exact: true }) });
    return r;
  }

  async cell(row: Locator, column: string): Promise<Locator> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    return row.getByRole('cell').nth(i);
  }

  /** Highest "No." issued today in a department (0 when none). */
  async lastNumber(department: string): Promise<number> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const [no, dep] = [headers.indexOf('No.'), headers.indexOf('Department')];
    let max = 0;
    // The list pages by 10; read every page.
    for (;;) {
      for (const r of await this.rows().all()) {
        const cells = (await r.getByRole('cell').allInnerTexts()).map((c) => c.trim());
        if (cells[dep] === department) max = Math.max(max, Number(cells[no]) || 0);
      }
      const next = this.main.getByRole('button', { name: 'Next page' });
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      await next.click();
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return max;
  }

  // -------------------------------------------------------------- arrive

  arriveDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Arrive' });
  }

  async openArrive(): Promise<Locator> {
    await this.arriveButton.click();
    const d = this.arriveDialog();
    await expect(d).toBeVisible();
    return d;
  }

  patientField(d: Locator): Locator {
    return d.getByRole('textbox', { name: /^Patient/ });
  }

  departmentField(d: Locator): Locator {
    return d.getByRole('combobox', { name: 'Department' });
  }

  submit(d: Locator): Locator {
    return d.getByRole('button', { name: 'Arrive', exact: true });
  }

  /** Types into Patient and picks the suggestion "MRN · name" containing `choose`. */
  async pickPatient(d: Locator, typed: string, choose: string = typed): Promise<void> {
    await this.patientField(d).fill(typed);
    await d.getByRole('listitem').getByRole('button', { name: new RegExp(escapeRe(choose)) }).first().click();
  }

  async pickDepartment(d: Locator, typed: string, choose: string = typed): Promise<void> {
    const field = this.departmentField(d);
    await field.fill(typed);
    const list = this.page.locator(`#${await field.getAttribute('aria-controls')}`);
    await list.getByRole('option').filter({ hasText: new RegExp(escapeRe(choose)) }).first().getByRole('button').click();
  }

  /** Arrives a patient in a department; waits for "Arrival number issued". */
  async arrive(patient: string, department: string): Promise<void> {
    const d = await this.openArrive();
    await this.pickPatient(d, patient);
    await this.pickDepartment(d, department);
    await this.submit(d).click();
    await expect(toastLocator(this.page, /^Arrival number issued$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  // ---------------------------------------------------------- number rule

  async setNumberRule(rule: 'Restart each day' | 'Keep counting'): Promise<void> {
    await this.numberRuleButton.click();
    const d = this.page.getByRole('dialog', { name: 'Number rule' });
    await d.getByRole('radio', { name: new RegExp(`^${rule}`) }).check();
    await d.getByRole('button', { name: 'Save rule' }).click();
    await expect(toastLocator(this.page, /^Number rule saved$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  async numberRule(): Promise<string> {
    await this.numberRuleButton.click();
    const d = this.page.getByRole('dialog', { name: 'Number rule' });
    const checked = d.getByRole('radio', { checked: true });
    const name = (await checked.getAttribute('aria-label')) ?? (await checked.evaluate((e) => e.closest('label')?.textContent ?? ''));
    await d.getByRole('button', { name: 'Cancel' }).click();
    return /Keep counting/.test(name) ? 'Keep counting' : 'Restart each day';
  }
}

/** The public queue board, /id/queue. */
export class QueueBoardPage {
  readonly page: Page;
  readonly table: Locator;
  readonly live: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByRole('main').getByRole('table');
    this.live = page.getByRole('main').getByText('Live', { exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/queue');
    await expect(this.table).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** Rows as { column: text }; headers by textContent (the board shows them upper-cased with CSS). */
  async rowTexts(): Promise<Record<string, string>[]> {
    const headers = (await this.table.getByRole('columnheader').allTextContents()).map((h) => h.trim());
    const out: Record<string, string>[] = [];
    for (const r of await this.rows().all()) {
      const cells = (await r.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      out.push(Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
    }
    return out;
  }
}
