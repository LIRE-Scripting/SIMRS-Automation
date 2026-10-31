import { expect, type Locator, type Page } from '@playwright/test';
import { pageToRow } from '../../../pages/paging';
import { toastMark, toastsSince } from '../../../lib/assertions';

/** Shared steps of 12-ris.xlsx. Every order of a test carries a study text with a token, so its row is found by it. */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export type RadOrder = Partial<Record<'Order ref' | 'Accession no' | 'Study description' | 'Study date' | 'Reported by' | 'Reported date' | 'Image link' | 'Report link', string>>;

export class RadOrdersPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Orders' });
    this.table = this.main.getByRole('table');
    this.dialog = page.getByRole('dialog', { name: 'Create order' });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/radiology/orders');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  pager(): Locator {
    return this.main.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  /** The row of an order by its study text, paging through the list (no search on this screen). */
  async row(study: string): Promise<Locator> {
    await this.open();
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: study, exact: true }) });
    await expect(this.rows().first()).toBeVisible();
    return pageToRow(this.main, match);
  }

  async openNew(): Promise<Locator> {
    await this.main.getByRole('button', { name: 'New order' }).click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }

  async fill(o: RadOrder): Promise<void> {
    for (const [k, v] of Object.entries(o)) await this.dialog.getByRole('textbox', { name: k, exact: true }).fill(v ?? '');
  }

  async create(o: RadOrder): Promise<string[]> {
    await this.open();
    await this.openNew();
    await this.fill(o);
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
}

/** Schedule and report (/radiology/studies): the order list (by study text), inputs and buttons. */
export class StudiesPage {
  readonly main: Locator;
  readonly order: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.order = this.main.getByRole('combobox', { name: 'Schedule and report' });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/radiology/studies');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Schedule and report' })).toBeVisible();
  }

  input(name: 'Room' | 'Start' | 'Report text' | 'Cancel reason' | 'File name'): Locator {
    return this.main.getByRole('textbox', { name, exact: true });
  }

  /** Chooses the order, fills inputs and clicks a button; returns the toasts. */
  async act(study: string, button: 'Schedule' | 'Accept' | 'Save report' | 'Cancel' | 'Attach', inputs: Partial<Record<'Room' | 'Start' | 'Report text' | 'Cancel reason' | 'File name', string>> = {}): Promise<string[]> {
    await this.open();
    // The options load after the screen.
    await expect(this.order.locator('option', { hasText: study })).toBeAttached();
    await this.order.selectOption({ label: study });
    for (const [k, v] of Object.entries(inputs)) await this.input(k as 'Room').fill(v ?? '');
    const mark = await toastMark(this.page);
    await this.main.getByRole('button', { name: button, exact: true }).click();
    return toastsAfter(this.page, mark);
  }

  /** The line of an order above the list ("<status> <study> <room> …"). */
  async line(study: string): Promise<string> {
    await this.open();
    return (await this.main.getByRole('paragraph').filter({ hasText: study }).first().innerText()).trim();
  }
}
