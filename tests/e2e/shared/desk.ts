import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { toastsAfter } from '../18-settings/helpers';

/**
 * The "desk" screens of the later applications (Housekeeping, Linen,
 * Maintenance, Fixed assets): one button opens a dialog (one or two steps)
 * with text fields and an "Action" list; actions on a saved row take its
 * internal id (column "Code") in "Document". The list has the columns
 * "Status", "Detail" and "Code".
 */

export const SAVED = 'Saved.';

export class Desk {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
    readonly heading: string,
    readonly button: string,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/en${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async openDialog(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: this.button, exact: true }).click();
    await expect(this.dialog).toBeVisible();
  }
  /** Fills the fields (on whichever step they are), picks the action, saves; returns the toasts. */
  async save(v: Record<string, string>, action?: string): Promise<string[]> {
    await this.openDialog();
    const pending = new Map(Object.entries(v));
    for (let step = 0; step < 3; step++) {
      for (const [k, val] of [...pending]) {
        const box = this.dialog.getByRole('textbox', { name: k, exact: true });
        if (await box.isVisible()) {
          await box.fill(val);
          pending.delete(k);
        }
      }
      const next = this.dialog.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible())) break;
      await next.click();
    }
    if (pending.size) throw new Error(`fields not found: ${[...pending.keys()].join(', ')}`);
    if (action) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(this.page, mark);
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The rows as [status, detail, id]; with a search text, typed into the search input first. */
  async list(search?: string): Promise<string[][]> {
    await this.open();
    if (search) {
      await this.main.getByRole('textbox', { name: 'Search' }).or(this.main.getByRole('searchbox')).first().fill(search);
      const go = this.main.getByRole('button', { name: 'Search', exact: true });
      if (await go.count()) await go.click();
      await expect(this.rows().filter({ hasText: search }).first()).toBeVisible().catch(() => {});
    }
    return this.rows().evaluateAll((rs) =>
      rs.filter((r) => r.querySelectorAll('td').length >= 3).map((r) => Array.from(r.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.trim() ?? '')),
    );
  }
  /** Saves and returns the id of the row that is new afterwards. */
  async create(v: Record<string, string>, action?: string): Promise<{ toasts: string[]; id: string }> {
    const before = new Set((await this.list()).map((r) => r[2]));
    const toasts = await this.save(v, action);
    const after = await this.list();
    return { toasts, id: after.find((r) => r[2] && !before.has(r[2]))?.[2] ?? '' };
  }
  async status(id: string): Promise<string> {
    return (await this.list()).find((r) => r[2] === id)?.[0] ?? '';
  }
}

/** Expects a refusal and records the toast next to the server text the workbook names. */
export function refused(qa: Qa, step: number, toasts: string[], serverText: string): void {
  expect(toasts).not.toContain(SAVED);
  qa.note(step, `toast "${toasts.join(' / ').slice(0, 120)}" (the workbook: the server text ends in "${serverText}")`);
}
