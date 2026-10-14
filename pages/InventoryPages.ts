import { expect, type Locator, type Page } from '@playwright/test';
import { gotoStable } from '../lib/navigation';

/** Data dialog Add Item. */
export interface AddItemInput {
  code: string;
  name: string;
  minStock?: string;
  maxStock?: string;
}

/** Data dialog New Stock Request. */
export interface StockRequestInput {
  branch: string;
  docNo: string;
  requestType: string;
  currency: string;
  netAmount: string;
  remarks?: string;
}

/** Layar Inventory > Items: katalog item + dialog Add Item. */
export class InventoryItemsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly search: Locator;
  readonly statusFilter: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /item/i });
    this.search = page.locator('input[type="search"]').first();
    this.statusFilter = page.locator('main select').first();
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/inventory/items');
    await expect(this.heading).toBeVisible();
  }

  async searchFor(term: string): Promise<void> {
    await this.search.fill(term);
    await this.search.press('Enter');
    await this.page.waitForTimeout(2_000);
  }

  rowWithCode(code: string): Locator {
    return this.rows.filter({ hasText: code }).first();
  }

  async openAddItem(): Promise<Locator> {
    await this.page.getByRole('button', { name: /add item/i }).first().click();
    const dlg = this.page.locator('[role="dialog"]:not([data-open="false"])').first();
    await expect(dlg).toBeVisible();
    return dlg;
  }

  async addItem(dlg: Locator, input: AddItemInput): Promise<void> {
    await dlg.locator('#item-code').fill(input.code);
    await dlg.locator('#item-name').fill(input.name);
    if (input.minStock) await dlg.locator('#item-min-stock').fill(input.minStock);
    if (input.maxStock) await dlg.locator('#item-max-stock').fill(input.maxStock);
    await dlg.getByRole('button', { name: /^save$/i }).click();
  }
}

/** Layar Inventory > Stock Requests: dokumen permintaan stok. */
export class InventoryStockRequestsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /stock request/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/inventory/stock-requests');
    await expect(this.heading).toBeVisible();
  }

  rowWithDoc(docNo: string): Locator {
    return this.rows.filter({ hasText: docNo }).first();
  }

  async openNewRequest(): Promise<Locator> {
    await this.page.getByRole('button', { name: /new stock request/i }).first().click();
    const dlg = this.page.locator('[role="dialog"]:not([data-open="false"])').first();
    await expect(dlg).toBeVisible();
    return dlg;
  }

  async createRequest(dlg: Locator, input: StockRequestInput): Promise<void> {
    await dlg.locator('select').first().selectOption({ label: input.branch });
    await dlg.locator('#sr-doc-num').fill(input.docNo);
    const today = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    await dlg
      .locator('#sr-doc-date')
      .fill(`${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`);
    await dlg.locator('select').nth(1).selectOption({ label: input.requestType });
    await dlg.locator('#sr-currency').fill(input.currency);
    await dlg.locator('#sr-net-amount').fill(input.netAmount);
    if (input.remarks) await dlg.locator('#sr-remarks').fill(input.remarks);
    await dlg.getByRole('button', { name: /^create$/i }).click();
  }
}

/** Layar Inventory > Ledger: buku besar mutasi stok. */
export class InventoryLedgerPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /stock book/i });
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/inventory/ledger');
    await expect(this.heading).toBeVisible();
  }
}
