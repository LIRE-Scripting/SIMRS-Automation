import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRe } from '../ambulatory/RegisteredPatientsPage';

/**
 * Inventory (/en/inventory): Item Master, Stores, Stock Requests, Branch and
 * stores, Store documents, Stock desk and Stock book. Read from the live
 * screens on 2026-10-15.
 */

export interface Item {
  code: string;
  name: string;
  description?: string;
  min?: string;
  max?: string;
  batchTracked?: boolean;
  serialized?: boolean;
  active?: boolean;
  lastCost?: string;
}

export class ItemMasterPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly search: Locator;
  readonly status: Locator;
  readonly scan: Locator;
  readonly table: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Item Master' });
    this.search = this.main.getByRole('searchbox');
    this.status = this.main.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'All statuses' }) });
    this.scan = this.main.getByRole('textbox', { name: 'Scan or type item code…' });
    this.table = this.main.getByRole('table');
  }

  async open(): Promise<void> {
    await this.page.goto('/en/inventory/items');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  row(code: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  dialog(name: 'Add Item' | 'Edit Item'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Fills the item form; the advanced settings are opened when needed. */
  async fill(d: Locator, it: Partial<Item>): Promise<void> {
    if (it.code !== undefined) await d.getByRole('textbox', { name: 'Item code' }).fill(it.code);
    if (it.name !== undefined) await d.getByRole('textbox', { name: 'Item name' }).fill(it.name);
    if (it.description !== undefined) await d.getByRole('textbox', { name: 'Description' }).fill(it.description);
    if (it.min !== undefined) await d.getByRole('spinbutton', { name: 'Minimum stock' }).fill(it.min);
    if (it.max !== undefined) await d.getByRole('spinbutton', { name: 'Maximum stock' }).fill(it.max);
    if ([it.batchTracked, it.serialized, it.active, it.lastCost].some((v) => v !== undefined)) {
      const advanced = d.getByText('Advanced settings');
      if (!(await d.getByRole('checkbox', { name: 'Active' }).isVisible())) await advanced.click();
      if (it.batchTracked !== undefined) await d.getByRole('checkbox', { name: 'Batch tracked' }).setChecked(it.batchTracked);
      if (it.serialized !== undefined) await d.getByRole('checkbox', { name: 'Serialized' }).setChecked(it.serialized);
      if (it.active !== undefined) await d.getByRole('checkbox', { name: 'Active' }).setChecked(it.active);
      if (it.lastCost !== undefined) await d.getByRole('spinbutton', { name: 'Last cost' }).fill(it.lastCost);
    }
  }

  async openAdd(): Promise<Locator> {
    await this.main.getByRole('button', { name: 'Add Item' }).click();
    const d = this.dialog('Add Item');
    await expect(d).toBeVisible();
    return d;
  }

  /**
   * Opens "Edit Item" by the exact code in "Scan or type item code…". The
   * list search narrows only the 50 rows of the page on screen (TC-APP007-019
   * known risk), so an item on another page is opened by its code.
   */
  async openEdit(it: { code: string; name?: string }): Promise<Locator> {
    await this.scan.fill(it.code);
    await this.scan.press('Enter');
    const d = this.dialog('Edit Item');
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Item code' })).toHaveValue(it.code);
    return d;
  }

  /** The row of an item, paging through the list (50 rows a page). */
  async findRow(code: string): Promise<Locator> {
    await this.search.fill('');
    const next = this.main.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 40; i++) {
      // The page renders twice after paging (154 items on 2026-10-16: an early read missed the item), so each page is given a moment.
      await expect(this.rows().first()).toBeVisible();
      if (await expect(this.row(code)).toHaveCount(1, { timeout: 3_000 }).then(() => true, () => false)) return this.row(code);
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      await next.click();
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return this.row(code);
  }

  /** The "Stock on hand" block of the Edit Item dialog: lines, then the receive inputs. */
  stock(d: Locator): Locator {
    return d.locator('xpath=.//p[normalize-space()="Stock on hand"]/following-sibling::*[1]');
  }

  /** Receives a batch through "Add batch" (store by its option text, expiry yyyy-mm-dd). */
  async addBatch(d: Locator, b: { store: string; batch: string; expiry: string; quantity: string }): Promise<void> {
    const store = d.getByRole('combobox').filter({ hasNot: this.page.getByRole('option', { name: 'All statuses' }) }).last();
    await store.selectOption({ label: await optionWith(store, b.store) });
    await d.getByRole('textbox', { name: 'Batch' }).fill(b.batch);
    await d.locator('input[type="date"]').last().fill(b.expiry);
    await d.getByRole('spinbutton', { name: 'Quantity' }).fill(b.quantity);
    await d.getByRole('button', { name: 'Add batch' }).click();
  }
}

export async function optionWith(select: Locator, text: string): Promise<string> {
  const option = select.locator('option').filter({ hasText: new RegExp(escapeRe(text)) }).first();
  await expect(option, `an option with "${text}"`).toBeAttached();
  return (await option.innerText()).trim();
}

export class StoresPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Stores' });
    this.table = this.main.getByRole('table');
  }

  async open(): Promise<void> {
    await this.page.goto('/en/inventory/stores');
    await expect(this.heading).toBeVisible();
  }

  row(code: string): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }
}

export class StockRequestsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly dialog: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Stock Requests' });
    this.table = this.main.getByRole('table');
    this.dialog = page.getByRole('dialog', { name: 'New Stock Request' });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/inventory/stock-requests');
    await expect(this.heading).toBeVisible();
  }

  row(docNo: string): Locator {
    return this.table.getByRole('row').filter({ hasText: docNo });
  }

  async openNew(): Promise<Locator> {
    await this.main.getByRole('button', { name: 'New Stock Request' }).click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }

  /** Picks the department: a type-ahead with "code · name" suggestions, or a list. */
  async department(name: string): Promise<void> {
    const field = this.dialog.getByRole('combobox', { name: 'Department' });
    if ((await field.evaluate((e) => e.tagName)) === 'SELECT') {
      await field.selectOption({ label: await optionWith(field, name) });
      return;
    }
    await field.fill(name);
    const list = this.page.locator(`#${await field.getAttribute('aria-controls')}`);
    await list.getByRole('option').filter({ hasText: name }).first().getByRole('button').click();
  }
}

/** Branch and stores (/inventory/setup), Store documents (/inventory/documents) and Stock desk (/inventory/stock-desk). */
export class StoreFormsPage {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }

  async open(route: 'setup' | 'documents' | 'stock-desk' | 'ledger', heading: string): Promise<void> {
    await this.page.goto(`/en/inventory/${route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  input(name: string): Locator {
    return this.main.getByRole('textbox', { name, exact: true });
  }

  async fill(values: Record<string, string>): Promise<void> {
    for (const [k, v] of Object.entries(values)) await this.input(k).fill(v);
  }

  button(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  /** The block of saved documents (the first card of the screen). */
  block(): Locator {
    return this.main.locator('section, .card').first();
  }
}
