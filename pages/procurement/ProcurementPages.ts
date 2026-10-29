import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Procurement (/id/procurement): Purchase orders (no <main> landmark on this
 * screen and on the hub), Suppliers and requests, Purchase requests
 * (/procurement/requests, titled "Purchase orders"), Receipts and Reorder.
 * Read from the live screens on 2026-10-15.
 */

export interface PurchaseOrder {
  docNumber?: string;
  /** yyyy-mm-dd */
  docDate?: string;
  vendor?: string;
  dept?: string;
  currency?: string;
  advance?: string;
  paid?: string;
}

export class PurchaseOrdersPage {
  readonly heading: Locator;
  readonly table: Locator;
  readonly form: Locator;
  readonly view: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Purchase orders' });
    this.table = page.getByRole('table');
    this.form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Create purchase order' }) });
    this.view = page.getByRole('dialog').filter({ has: page.getByRole('list', { name: 'Approval chain' }) });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/procurement/purchase-orders');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  row(docNo: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('cell', { name: docNo, exact: true }) });
  }

  /** Cells: Doc no, Date, Vendor, Dept, Amount, Balance, Approval, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  pager(): Locator {
    return this.page.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  /** The row of an order, paging through the list (10 rows a page). */
  async find(docNo: string): Promise<Locator> {
    await expect(this.rows().first()).toBeVisible();
    const next = this.page.getByRole('button', { name: 'Next page' });
    // The list can move to another page when it reloads: start from page 1.
    const prev = this.page.getByRole('button', { name: 'Previous page' });
    for (let i = 0; i < 50 && (await prev.isVisible()) && (await prev.isEnabled()); i++) {
      const top = await this.rows().first().innerText();
      await prev.press('Enter');
      await expect(this.rows().first()).not.toHaveText(top);
    }
    for (let i = 0; i < 50; i++) {
      // A page renders twice after paging: its rows are given a moment.
      if (await this.row(docNo).first().waitFor({ timeout: 2_500 }).then(() => true, () => false)) return this.row(docNo);
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      // Toasts sit over the pager, so the button is pressed with the keyboard.
      await next.press('Enter');
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return this.row(docNo);
  }

  async openNew(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'New PO' }).click();
    await expect(this.form).toBeVisible();
    return this.form;
  }

  field(name: 'Doc number' | 'Doc date' | 'Vendor / beneficiary' | 'Dept code' | 'Currency'): Locator {
    return this.form.getByRole('textbox', { name, exact: true });
  }

  amount(name: 'Advance amount' | 'Amount paid'): Locator {
    return this.form.getByRole('spinbutton', { name, exact: true });
  }

  async fill(po: PurchaseOrder): Promise<void> {
    if (po.docNumber !== undefined) await this.field('Doc number').fill(po.docNumber);
    if (po.docDate !== undefined) await this.field('Doc date').fill(po.docDate);
    if (po.vendor !== undefined) await this.field('Vendor / beneficiary').fill(po.vendor);
    if (po.dept !== undefined) await this.field('Dept code').fill(po.dept);
    if (po.currency !== undefined) await this.field('Currency').fill(po.currency);
    if (po.advance !== undefined) await this.amount('Advance amount').fill(po.advance);
    if (po.paid !== undefined) await this.amount('Amount paid').fill(po.paid);
  }

  save(): Locator {
    return this.form.getByRole('button', { name: /^(Save|Saving…)$/ });
  }

  /** Steps of the opened order: [name, "Step n", status] per line. */
  async steps(): Promise<string[][]> {
    const items = this.view.getByRole('list', { name: 'Approval chain' }).getByRole('listitem');
    const out: string[][] = [];
    for (const it of await items.all()) out.push((await it.getByRole('paragraph').allInnerTexts()).map((t) => t.trim()));
    return out;
  }

  advance(): Locator {
    return this.view.getByRole('button', { name: /^(Advance approval|Advancing…)$/ });
  }
}

/** Suppliers and requests, Purchase requests (/procurement/requests) and Receipts: inputs and action buttons. */
export class ProcurementDeskPage {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }

  async open(route: 'suppliers' | 'requests' | 'receipts' | 'reorder', heading: string): Promise<void> {
    await this.page.goto(`/id/procurement/${route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  input(name: string): Locator {
    // On /id "Amount" is "Nilai" or "Jumlah", and "Jumlah" is also "Quantity", the input before it: the last match is Amount.
    const box = this.main.getByRole('textbox', { name, exact: true });
    return name === 'Amount' ? box.last() : box;
  }

  button(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  /** The id listed after a document number or name ("draft QA-PO-… <uuid>"). */
  async idOf(text: string): Promise<string> {
    // The list loads after the heading.
    await expect(this.main).toContainText(text);
    const all = await this.main.innerText();
    const m = all.match(new RegExp(`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`));
    expect(m, `an id listed after "${text}"`).not.toBeNull();
    return m![1];
  }

  /** The status listed before a document number ("approved QA-PO-…"). */
  async statusOf(text: string): Promise<string> {
    await expect(this.main).toContainText(text);
    const all = await this.main.innerText();
    return all.match(new RegExp(`(\\w+) ${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `))?.[1] ?? '';
  }
}
