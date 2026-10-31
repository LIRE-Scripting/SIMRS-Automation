import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { toastsAfter } from '../18-settings/helpers';
import { sourceOnSite } from '../../../lib/i18n';
import { NotOffered } from '../../../lib/not-offered';

/**
 * Shared steps of 19-finance.xlsx. Accounts carry a token in their code
 * ("QA-1010-<token>"); FY-NEXT ("QA-FY-NEXT") is made once and reused, since
 * a financial year can be neither changed nor deleted (TC-APP019-021).
 * BR-A is Podomoro ("HO").
 */

export { toastsAfter };

export const BR_A = 'HO · Podomoro';

export async function clickFor(page: Page, button: Locator, timeout = 8_000): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark, timeout);
}

// ------------------------------------------------------------ accounts

export type Account = { code: string; name: string; kind: string; group?: boolean; parent?: string; active?: boolean; branches?: string[] };

export class Accounts {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto('/id/finance/accounts');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Chart of accounts' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The row of an account code (searched; inactive ones shown). */
  async row(code: string): Promise<Locator> {
    await this.open();
    await this.main.getByRole('checkbox', { name: 'Show inactive' }).check();
    await this.main.getByRole('searchbox', { name: 'Search code or name' }).fill(code);
    const row = this.rows().filter({ has: this.page.getByRole('cell', { name: code.toUpperCase(), exact: true }) });
    await expect(row).toHaveCount(1);
    return row;
  }
  async cells(code: string): Promise<string[]> {
    return (await (await this.row(code)).getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  async fill(a: Partial<Account>): Promise<void> {
    const d = this.dialog;
    if (a.code !== undefined) await d.getByRole('textbox', { name: 'Code' }).fill(a.code);
    if (a.kind !== undefined) await d.getByRole('combobox', { name: 'Kind' }).selectOption(a.kind);
    if (a.name !== undefined) await d.getByRole('textbox', { name: 'Name' }).fill(a.name);
    if (a.parent !== undefined) {
      const box = d.getByRole('combobox', { name: 'Parent group' });
      const label = (await box.locator('option').allInnerTexts()).find((o) => o.startsWith(a.parent!.toUpperCase()));
      await box.selectOption({ label: label ?? a.parent });
    }
    if (a.branches !== undefined) {
      const list = d.getByRole('listbox', { name: 'Branches allowed to use this account' });
      for (const b of a.branches) await list.getByRole('option', { name: b }).click();
    }
    if (a.group !== undefined) await d.getByRole('checkbox', { name: /^Group account/ }).setChecked(a.group);
    if (a.active !== undefined) await d.getByRole('checkbox', { name: 'Active' }).setChecked(a.active);
  }
  save(): Promise<string[]> {
    return clickFor(this.page, this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }));
  }
  async add(a: Account): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'New account' }).click();
    await this.fill(a);
    return this.save();
  }
  async edit(code: string): Promise<void> {
    await (await this.row(code)).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog).toBeVisible();
  }
}

/** An account of a test: code "<base>-<token>" (the workbook's code with a token), name with a token. */
export function account(qa: Qa, base: string, name: string, kind: string, extra: Partial<Account> = {}): Account {
  return { code: qa.code(base), name: qa.name(name), kind, ...extra };
}

export async function createAccount(page: Page, a: Account): Promise<Account> {
  const toasts = await new Accounts(page).add(a);
  expect(toasts).toContain(`Account ${a.code.toUpperCase()} created.`);
  return a;
}

/** Sets a test account inactive (end of a test). */
export async function retireAccount(page: Page, code: string): Promise<void> {
  const acc = new Accounts(page);
  await acc.edit(code).catch(() => {});
  if (!(await acc.dialog.isVisible())) return;
  await acc.fill({ active: false });
  await acc.save();
}

// ------------------------------------------------------------ posting rules

/** The name of an account list of a rule, "<Debit account> <kind>", in either language (each part is translated on its own). */
function accountList(list: string, kind: string): RegExp {
  return new RegExp(`^${sourceOnSite(list)}\\s+${sourceOnSite(kind)}$`);
}

export class PostingRules {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }
  async open(branch = BR_A): Promise<void> {
    await this.page.goto('/id/finance/posting-rules');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Budget posting rules' })).toBeVisible();
    await this.main.getByRole('combobox', { name: 'Branch' }).selectOption({ label: branch });
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  row(kind: string): Locator {
    return this.main.getByRole('table').getByRole('row').filter({ hasText: kind });
  }
  debit(kind: string): Locator {
    return this.main.getByRole('combobox', { name: accountList('Debit account', kind) });
  }
  credit(kind: string): Locator {
    return this.main.getByRole('combobox', { name: accountList('Credit account', kind) });
  }
  /** Accounts chosen in place of a new account of the test that the list does not offer (found blocker 40). */
  readonly standIns: string[] = [];
  /**
   * Picks the account `code`. The lists offer only the first 50 accounts
   * (found blocker 40): an account of the test that is not offered is
   * replaced by the first offered QA account of the same code start
   * ("QA-3010-…"), recorded in `standIns`.
   */
  async choose(box: Locator, code: string): Promise<void> {
    const options = await box.locator('option').allInnerTexts();
    let label = options.find((o) => o.startsWith(code.toUpperCase()));
    const base = code.toUpperCase().replace(/-[A-Z0-9]{8,}$/, '');
    if (!label && base !== code.toUpperCase()) {
      // An offered QA account of the same code start, else the first QA account offered at all.
      label = options.find((o) => o.startsWith(`${base}-`)) ?? options.find((o) => /^QA-/.test(o.trim()));
      if (label) this.standIns.push(`${code} is not offered; ${label.split(' ')[0]} stands in`);
    }
    if (!label) throw new Error(`no option ${code} in ${await box.getAttribute('aria-label')}`);
    await box.selectOption({ label });
  }
  async status(kind: string): Promise<string> {
    const cells = await this.row(kind).getByRole('cell').allInnerTexts();
    return cells[3].trim();
  }
  async save(kind: string, debit?: string, credit?: string): Promise<string[]> {
    if (debit) await this.choose(this.debit(kind), debit);
    if (credit) await this.choose(this.credit(kind), credit);
    return clickFor(this.page, this.row(kind).getByRole('button', { name: 'Save' }));
  }
  async remove(kind: string): Promise<string[]> {
    return clickFor(this.page, this.row(kind).getByRole('button', { name: 'Remove' }));
  }
}

/** The rule of a kind on BR-A as it is now (debit and credit labels), to put it back later. */
export async function ruleNow(page: Page, kind: string): Promise<{ status: string; debit: string; credit: string }> {
  const r = new PostingRules(page);
  await r.open();
  const pickedText = async (b: Locator) => ((await b.count()) ? b.evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.textContent ?? '') : '');
  return { status: await r.status(kind), debit: await pickedText(r.debit(kind)), credit: await pickedText(r.credit(kind)) };
}

/** Puts a rule of BR-A back: removes it when it was "Not set", or saves the earlier accounts. */
export async function restoreRule(page: Page, kind: string, was: { status: string; debit: string; credit: string }): Promise<void> {
  const r = new PostingRules(page);
  await r.open();
  if (was.status === 'Not set') {
    if (await r.row(kind).getByRole('button', { name: 'Remove' }).count()) await r.remove(kind);
    return;
  }
  if (was.debit && (await r.debit(kind).count())) await r.debit(kind).selectOption({ label: was.debit });
  if (was.credit) await r.credit(kind).selectOption({ label: was.credit });
  await r.save(kind);
}

// ------------------------------------------------------------ financial years

export class Years {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto('/id/finance/financial-years');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Financial years' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  row(code: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }
  async cells(code: string): Promise<string[]> {
    return (await this.row(code).getByRole('cell').allInnerTexts()).map((t) => t.trim());
  }
  /** The latest end date of all years. */
  async latestEnd(): Promise<string> {
    await this.open();
    const ends = await this.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[3]?.textContent?.trim() ?? ''));
    return ends.filter(Boolean).sort().pop()!;
  }
  async create(v: { code: string; description: string; type?: string; start?: string; end?: string; finalization?: string }): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'New financial year' }).click();
    const d = this.dialog;
    await d.getByRole('textbox', { name: 'Code' }).fill(v.code);
    if (v.type) await d.getByRole('combobox', { name: 'Period type' }).selectOption(v.type);
    await d.getByRole('textbox', { name: 'Description' }).fill(v.description);
    if (v.start) await d.getByRole('textbox', { name: 'Start date' }).fill(v.start);
    if (v.end) await d.getByRole('textbox', { name: 'End date' }).fill(v.end);
    if (v.finalization) await d.getByRole('textbox', { name: 'Account finalization date' }).fill(v.finalization);
    return clickFor(this.page, d.getByRole('button', { name: /^(Save|Saving…)$/ }));
  }
}

/** yyyy-mm-dd plus n months (the day kept, or the month's last day). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** FY-NEXT (00-test-data.xlsx | Catalogue, 19): "QA-FY-NEXT", made once after the latest year and reused. */
export const FY_NEXT = 'QA-FY-NEXT';

/**
 * The code of FY-NEXT to use: the list shows only its newest years (latest start first, found blocker 40), so the plain
 * QA-FY-NEXT of an earlier run may be past them; then the newest year whose code starts with QA-FY-NEXT stands in.
 * Only when the list shows none is QA-FY-NEXT made, after the latest year.
 */
export async function ensureFyNext(page: Page): Promise<string> {
  const y = new Years(page);
  await y.open();
  if (await y.row(FY_NEXT).count()) return FY_NEXT;
  const codes = (await y.rows().locator('td:first-child').allInnerTexts()).map((t) => t.trim());
  const shown = codes.find((c) => c.startsWith(`${FY_NEXT}-`));
  if (shown) return shown;
  const end = addMonths(await y.latestEnd(), 12);
  const toasts = await y.create({ code: FY_NEXT, description: 'QA Tahun buku uji', finalization: addMonths(end, 3) });
  if (toasts.includes('That financial year code is already used.')) {
    await y.open();
    if (!(await y.row(FY_NEXT).count())) throw new NotOffered(`${FY_NEXT} exists but is not among the years the list shows (found blocker 40)`);
    return FY_NEXT;
  }
  expect(toasts).toContain('Financial year created');
  return FY_NEXT;
}

// ------------------------------------------------------------ vouchers

export const plain = (t: string) => t.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Vouchers (/finance/vouchers): no <main>; "Create voucher" and the voucher detail are panels, not dialogs. */
/**
 * The rows of a kind (e.g. /^SV-/) on the first page of Vouchers that holds any: the list shows 10 rows a page,
 * the newest date first, and a busy day's journals (VCH-) and deposits (TD-) fill the first pages (seen 2026-10-31).
 */
export async function voucherRowsOnPages(page: Page, kind: RegExp): Promise<Locator> {
  const rows = new Vouchers(page).rows().filter({ hasText: kind });
  // The pager of Vouchers sits outside <main>.
  const next = page.getByRole('button', { name: 'Next page' });
  for (let i = 0; i < 40; i++) {
    if (await rows.first().waitFor({ timeout: 2_500 }).then(() => true, () => false)) break;
    if (!(await next.isVisible()) || (await next.isDisabled())) break;
    await next.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return rows;
}

export class Vouchers {
  constructor(readonly page: Page) {}
  async open(): Promise<void> {
    await this.page.goto('/id/finance/vouchers');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Vouchers' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The panel holding a heading (the "Create voucher" form or the voucher detail). */
  panel(heading: string | RegExp): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(heading, { exact: typeof heading === 'string' }) })
      .filter({ has: this.page.getByRole('button', { name: /^(Save|Close)$/ }) })
      .last();
  }
  get form(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByRole('heading', { name: 'Create voucher' }) });
  }
  async openForm(): Promise<void> {
    await this.open();
    await this.page.getByRole('button', { name: 'New voucher' }).click();
    await expect(this.form.getByText('Create a voucher and post it to the ledger.')).toBeVisible();
  }
  /** A field of the form: its label wraps a span with the name and the input. */
  field(label: string): Locator {
    return this.form.locator('label').filter({ has: this.page.locator(`span:text-is("${label}")`) }).locator('input, select, textarea');
  }
  async create(v: { value?: string; party?: string; narration?: string; currency?: string; type?: string }): Promise<string[]> {
    await this.openForm();
    if (v.type) await this.field('Doc type').selectOption({ label: v.type });
    if (v.currency !== undefined) await this.field('Currency').fill(v.currency);
    if (v.value !== undefined) await this.field('Voucher value').fill(v.value);
    if (v.party !== undefined) await this.field('Party').fill(v.party);
    if (v.narration !== undefined) await this.field('Narration').fill(v.narration);
    return clickFor(this.page, this.form.getByRole('button', { name: /^(Save|Saving…)$/ }));
  }
  /** The detail panel shown after a save or after "Open". */
  get detail(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: /^(VCH|SV|DC|DIET)-/ }) })
      .filter({ has: this.page.getByRole('term') })
      .last();
  }
}
