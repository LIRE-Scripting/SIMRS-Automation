import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';

/**
 * Transfusion Medicine (/en/bloodbank): Stock, Blood request and Quality
 * control. Read from the live screens on 2026-10-15. Donors
 * (/en/bloodbank/donors) answers HTTP 500 (checklist blocker 2).
 */

abstract class Screen {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }

  button(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  dialog(name: string): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Opens a dialog from a button of the screen. */
  async openDialog(button: string, dialog: string = button): Promise<Locator> {
    await this.button(button).click();
    const d = this.dialog(dialog);
    await expect(d).toBeVisible();
    return d;
  }

  /** Fills fields of a dialog by their labels (textbox, spinbutton or combobox). */
  async fill(d: Locator, values: Record<string, string>): Promise<void> {
    for (const [label, value] of Object.entries(values)) {
      const field = d.getByRole('textbox', { name: label, exact: true })
        .or(d.getByRole('spinbutton', { name: label, exact: true }))
        .or(d.getByRole('combobox', { name: label, exact: true }));
      if ((await field.evaluate((e) => e.tagName)) === 'SELECT') await field.selectOption({ label: value });
      else await field.fill(value);
    }
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(toastLocator(this.page, typeof text === 'string' ? new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : text)).toBeVisible();
  }
}

export class StockPage extends Screen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Stock' });
  readonly table = this.page.getByRole('main').getByRole('table');

  async open(): Promise<void> {
    await this.page.goto('/en/bloodbank/stock');
    await expect(this.heading).toBeVisible();
  }

  statusFilter(): Locator {
    return this.main.getByRole('combobox').filter({ has: this.page.getByRole('option', { name: 'All statuses' }) });
  }

  async filter(values: { 'Bag no'?: string; status?: string }): Promise<void> {
    if (values['Bag no'] !== undefined) await this.main.getByRole('textbox', { name: 'Bag no', exact: true }).fill(values['Bag no']);
    if (values.status) await this.statusFilter().selectOption({ label: values.status });
    await this.button('Search').click();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  row(bag: string): Locator {
    return this.rows().filter({ hasText: bag });
  }

  async cell(row: Locator, column: string): Promise<Locator> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    return row.getByRole('cell').nth(i);
  }
}

export class RequestsPage extends Screen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Blood request' });

  async open(): Promise<void> {
    await this.page.goto('/en/bloodbank/requisitions');
    await expect(this.heading).toBeVisible();
  }

  async tab(name: 'List' | 'Queue' | 'Ward'): Promise<void> {
    await this.main.getByRole('tab', { name }).click();
    await expect(this.main.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  }

  /** Picks a patient in the request form: suggestions are buttons "MRN name". */
  async pickPatient(d: Locator, typed: string, mrn: string): Promise<void> {
    await d.getByRole('textbox', { name: 'Patient' }).fill(typed);
    await d.getByRole('listitem').getByRole('button', { name: new RegExp(mrn) }).first().click();
  }

  /** The request form after a save: it stays open without its title and shows the number and status. */
  savedRequestDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: 'Patient & clinical' }) });
  }

  queueTable(): Locator {
    return this.main.getByRole('table');
  }
}

export class QcPage extends Screen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Quality control' });

  async open(): Promise<void> {
    await this.page.goto('/en/bloodbank/qc');
    await expect(this.heading).toBeVisible();
  }
}
