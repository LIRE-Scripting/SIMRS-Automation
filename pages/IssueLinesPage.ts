import { expect, type Locator, type Page } from '@playwright/test';
import { ensureSignedIn } from '../lib/auth';
import { gotoStable } from '../lib/navigation';

export type ReturnRule = 'Every issued line' | 'Verified lines only';

/** Pharmacy > Issue Lines: the persisted dispense issue lines. */
export class IssueLinesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly search: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly pagerSummary: Locator;
  readonly saveRuleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Issue Lines' });
    this.search = page.getByPlaceholder(/search item name or remarks/i);
    this.table = page.getByRole('table');
    this.rows = this.table.getByRole('row');
    this.pagerSummary = page.getByText(/showing .* of/i);
    this.saveRuleButton = page.getByRole('button', { name: 'Save' });
  }

  async open(): Promise<void> {
    await ensureSignedIn(this.page);
    await gotoStable(this.page, '/en/pharmacy/issue-lines');
  }

  returnRuleOption(option: ReturnRule): Locator {
    return this.page.getByRole('radio', { name: option });
  }

  /** Rows whose item name or remarks contain the given text. */
  rowsFor(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  qtyInput(row: Locator): Locator {
    return row.getByRole('spinbutton', { name: /qty/i });
  }

  returnButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Return' });
  }

  async filter(term: string): Promise<void> {
    await this.search.fill(term);
  }

  /** The Returned cell of a row. */
  returnedCell(row: Locator): Locator {
    return row.getByRole('cell').nth(5);
  }

  /**
   * Waits for the table, then returns the first row with a quantity field
   * whose remaining-return capacity (the field's max) is within [min, max].
   * Returns null when no such row exists.
   */
  async findReturnableRow(
    min: number,
    max = Number.MAX_SAFE_INTEGER,
    scope: Locator = this.table,
  ): Promise<Locator | null> {
    await scope.waitFor({ state: 'visible', timeout: 10_000 });
    const rows = scope.getByRole('row');
    const total = await rows.count();
    for (let i = 0; i < total; i++) {
      const row = rows.nth(i);
      const qty = this.qtyInput(row);
      if ((await qty.count()) === 0) continue;
      const maxAttr = await qty.getAttribute('max');
      const capacity = maxAttr !== null ? Number(maxAttr) : Number.NaN;
      if (Number.isNaN(capacity)) continue;
      if (capacity >= min && capacity <= max) return row;
    }
    return null;
  }

  /** Content parts identifying a row across re-sorts and reloads. */
  async rowSignature(row: Locator): Promise<string[]> {
    const cells = row.getByRole('cell');
    const parts = [
      (await cells.nth(0).textContent())?.trim() ?? '',
      (await cells.nth(2).textContent())?.trim() ?? '',
      (await cells.nth(7).textContent())?.trim() ?? '',
    ];
    return parts.filter((text) => text.length > 0 && text !== '—');
  }

  /** Re-finds a row by its signature on any scope (another tab, after reload). */
  rowBySignature(scope: Locator, signature: string[]): Locator {
    let row = scope.getByRole('row').filter({ hasText: signature[0] ?? '\u0000' });
    for (const part of signature.slice(1)) {
      row = row.filter({ hasText: part });
    }
    return row.first();
  }

  /** Returns the given quantity on a row and waits for its Returned cell to update. */
  async returnOnRow(row: Locator, qty: number): Promise<void> {
    const signature = await this.rowSignature(row);
    const before = Number((await this.returnedCell(row).textContent())?.trim() ?? '0');
    await this.qtyInput(row).fill(String(qty));
    await this.returnButton(row).click();
    // The table re-sorts (newest first), so re-find the row by content.
    const updated = this.rowBySignature(this.table, signature);
    await expect(this.returnedCell(updated)).toHaveText(String(before + qty), { timeout: 15_000 });
  }
}
