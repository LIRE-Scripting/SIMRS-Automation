import { expect, type Locator, type Page } from '@playwright/test';
import { gotoStable } from '../lib/navigation';

/** Layar RIS > Orders: order studi radiologi. */
export class RisOrdersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /order/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/radiology/orders');
    await expect(this.heading).toBeVisible();
  }

  rowWithRef(orderRef: string): Locator {
    return this.rows.filter({ hasText: orderRef }).first();
  }

  async openCreateOrder(): Promise<Locator> {
    await this.page.getByRole('button', { name: /new order/i }).first().click();
    const dlg = this.page.locator('[role="dialog"]:not([data-open="false"])').first();
    await expect(dlg).toBeVisible();
    return dlg;
  }
}

/** Layar Dietary > Requests: permintaan diet. */
export class DietRequestsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /request|diet/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/diet/requests');
    await expect(this.heading).toBeVisible();
  }

  rowWithDoc(docNo: string): Locator {
    return this.rows.filter({ hasText: docNo }).first();
  }

  async openNewRequest(): Promise<Locator> {
    await this.page.getByRole('button', { name: /new request/i }).first().click();
    const dlg = this.page.locator('[role="dialog"]:not([data-open="false"])').first();
    await expect(dlg).toBeVisible();
    return dlg;
  }
}

/** Layar Dietary > TPN: kalkulator nutrisi parenteral. */
export class DietTpnPage {
  readonly page: Page;
  readonly calculate: Locator;

  constructor(page: Page) {
    this.page = page;
    this.calculate = page.getByRole('button', { name: /^calculate$/i }).first();
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/diet/tpn');
    await expect(this.calculate).toBeVisible({ timeout: 10_000 });
  }
}
