import { type Locator, type Page } from '@playwright/test';
import { ensureSignedIn } from '../lib/auth';
import { gotoStable } from '../lib/navigation';

export type VisitClass = 'All' | 'Outpatient' | 'Inpatient';

/** Pharmacy > Orders: the pending drug orders for the branch. */
export class OrdersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly visitHint: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly pagerSummary: Locator;
  readonly storeField: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Orders' });
    this.visitHint = page.getByText('Choose outpatient or inpatient to pick a store.');
    this.table = page.getByRole('table');
    this.rows = this.table.getByRole('row');
    this.pagerSummary = page.getByText(/showing .* of/i);
    this.storeField = page.getByLabel(/^(store|apotek)$/i);
  }

  async open(): Promise<void> {
    await ensureSignedIn(this.page);
    await gotoStable(this.page, '/en/pharmacy/orders');
  }

  tab(name: VisitClass): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }

  async selectTab(name: VisitClass): Promise<void> {
    await this.tab(name).click();
    await this.page.waitForURL(/visit_class|pharmacy\/orders/, { timeout: 10_000 }).catch(() => {});
  }

  emptyState(): Locator {
    return this.page.getByText(/no pending orders/i);
  }

  /** Order rows mentioning the given patient, drug or remark text. */
  rowsFor(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  /**
   * Picks a store once the visit class is chosen. Handles both a native
   * select and a custom dropdown that lists options after a click.
   */
  async pickStore(name: string): Promise<string> {
    const combo = this.page.getByRole('combobox', { name: /^(store|apotek)$/i });
    if ((await combo.count()) > 0) {
      try {
        await combo.selectOption({ label: name }, { timeout: 3_000 });
        return name;
      } catch {
        // The workbook's store (e.g. ST-OP) does not exist here: take the first real option.
        const options = (await combo.locator('option').allTextContents())
          .map((text) => text.trim())
          .filter((text) => text.length > 0 && !/^(choose|pilih)/i.test(text));
        if (options.length === 0) return '';
        await combo.selectOption({ label: options[0] });
        return options[0];
      }
    }
    try {
      await this.storeField.click({ timeout: 3_000 });
      const option = this.page.getByRole('option', { name, exact: true }).first();
      await option.click({ timeout: 3_000 });
      return name;
    } catch {
      const option = this.page.getByRole('option').first();
      if ((await option.count()) === 0) return '';
      const picked = (await option.textContent())?.trim() ?? '';
      await option.click();
      return picked;
    }
  }

  /**
   * Opens an order by clicking its patient name (opens the dispense wizard).
   * Returns false when no matching pending order exists.
   */
  async openOrder(patientName: string): Promise<boolean> {
    const row = this.rowsFor(patientName).first();
    try {
      await row.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return false;
    }
    await row.getByText(patientName).first().click();
    return true;
  }
}
