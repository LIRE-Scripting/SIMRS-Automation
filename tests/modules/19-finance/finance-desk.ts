import type { Locator, Page } from '@playwright/test';
import { expect } from '../../../fixtures/e2e';
import { clickFor } from './helpers';

/**
 * A desk screen of Finance with its form on the page and its list below
 * (payment requests, security receipts and their disposal, bank guarantees
 * and their encashment, letters of credit, legal agreements, loans, rough
 * sheets): Save under the form, Send / Approve / Post / Renew on the rows.
 * The labels of the lists wrap their options, so a list is chosen by its
 * place in the form (0 = the first list).
 */
/** The answer to "Approve" on a finance document for every prepared user (found blocker 46). */
export const NO_APPROVAL = 'missing required privilege';

export class FinanceDesk {
  readonly main: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
  ) {
    this.main = page.getByRole('main');
  }
  async open(): Promise<void> {
    await this.page.goto(`/id/finance/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  heading(): Promise<string> {
    return this.main.getByRole('heading', { level: 1 }).first().innerText();
  }
  select(n: number): Locator {
    return this.main.locator('select').nth(n);
  }
  /** Picks the option of list `n` whose label starts with `start` (labels as the site shows them, or their English). */
  async choose(n: number, start: string): Promise<string> {
    const s = this.select(n);
    const raw = await s.locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
    const english = await s.locator('option').allInnerTexts();
    const i = english.findIndex((o) => o.trim().startsWith(start.toUpperCase()) || o.trim().startsWith(start));
    const j = i >= 0 ? i : raw.findIndex((o) => o.startsWith(start.toUpperCase()) || o.startsWith(start));
    expect(j, `an option starting "${start}" in list ${n}`).toBeGreaterThanOrEqual(0);
    await s.selectOption({ index: j });
    return raw[j];
  }
  /** Fills text inputs by label and lists by place: { Party: 'X', 0: 'EMD' }; a field the form does not show for the chosen kind is left out. */
  async fill(v: Record<string, string>): Promise<void> {
    for (const [k, val] of Object.entries(v)) {
      if (/^\d+$/.test(k)) {
        await this.choose(Number(k), val);
        continue;
      }
      const box = this.main.getByLabel(k, { exact: true }).first();
      if (await box.isVisible().catch(() => false)) await box.fill(val);
    }
  }
  /** The numbers of the list (the first column of the first table). */
  async numbers(): Promise<string[]> {
    await this.open();
    return this.main.getByRole('table').first().getByRole('rowgroup').nth(1).getByRole('row')
      .evaluateAll((rs) => rs.map((r) => (r.querySelector('td')?.textContent ?? '').trim()).filter(Boolean));
  }
  /** Fills and saves; returns the toasts and the number new in the list. */
  async create(v: Record<string, string>, save = 'Save'): Promise<{ toasts: string[]; no: string }> {
    const before = new Set(await this.numbers());
    await this.fill(v);
    const toasts = await clickFor(this.page, this.main.getByRole('button', { name: save, exact: true }).first());
    const no = (await this.numbers()).find((n) => !before.has(n)) ?? '';
    return { toasts, no };
  }
  row(no: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: no, exact: true }) }).first();
  }
  async cells(no: string): Promise<string[]> {
    await this.open();
    return (await this.row(no).getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** The status of a row: its cell under "Status" (else the last cell with text). */
  async status(no: string): Promise<string> {
    await this.open();
    const headers = (await this.main.getByRole('table').first().getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const cells = (await this.row(no).getByRole('cell').allInnerTexts()).map((t) => t.trim());
    const i = headers.indexOf('Status');
    return i >= 0 ? cells[i] ?? '' : cells.filter(Boolean).at(-1) ?? '';
  }
  /** Clicks a row action; [] with a note when the row has no such button. */
  async act(no: string, action: string): Promise<string[]> {
    await this.open();
    const b = this.row(no).getByRole('button', { name: action, exact: true });
    if (!(await b.isVisible().catch(() => false))) return [`(no "${action}" on ${no})`];
    return clickFor(this.page, b);
  }
  /**
   * Send, then Approve; returns the status afterwards, the toasts and whether
   * the approval was refused for the missing approval right (found blocker 46).
   */
  async sendApprove(no: string): Promise<{ status: string; toasts: string[]; refused: boolean }> {
    const toasts = [...(await this.act(no, 'Send')), ...(await this.act(no, 'Approve'))];
    return { status: await this.status(no), toasts, refused: toasts.includes(NO_APPROVAL) };
  }
  /** On a posting screen: ticks the row of `no` and clicks "Post". */
  async post(no: string): Promise<string[]> {
    await this.open();
    const row = this.row(no);
    if (!(await row.isVisible().catch(() => false))) return [`(${no} is not listed for posting)`];
    await row.getByRole('checkbox').check().catch(() => {});
    return clickFor(this.page, this.main.getByRole('button', { name: 'Post', exact: true }).first());
  }
}
