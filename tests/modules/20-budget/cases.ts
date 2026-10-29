import { toastsAfter } from '../18-settings/helpers';
import { toastMark } from '../../../lib/assertions';
import { asOnSite, onSite, onSiteStartingWith } from '../../../lib/i18n';
import type { Locator, Page } from '@playwright/test';
import { addDays, todayWib } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import { addMonths } from '../19-finance/helpers';
import type { Qa } from '../../../fixtures/e2e';
import { sourceOnSite } from '../../../lib/i18n';

/** A locked year of the list, "2025 (locked)" (the site writes "(terkunci)"). */
const LOCKED = new RegExp(`${sourceOnSite('(locked)')}$`);

/**
 * Test cases of 20-budget that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

/** TC-APP020-001: a budget book made, changed and offered to circulars; returns the book (E2E-011 hands it on). */
export const TC_APP020_001 = async ({ page, qa }: CaseArgs): Promise<{ code: string; name: string }> => {
  const b = books(page);
  const code = qa.code('X-OPS');
  const name = qa.name('X Buku operasional uji');
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Budget books' }).click();
    await expect(b.main.getByRole('heading', { level: 1, name: 'Budget books' })).toBeVisible();
    await expect(b.main.getByText('Funding sources and budget schemes. Only one book is the default.', { exact: true })).toBeVisible();
    await expect(b.main.getByRole('searchbox')).toBeVisible();
    await expect(b.main.getByRole('button', { name: 'New book' })).toBeVisible();
    await expect(b.main.getByRole('columnheader')).toHaveText(['Code', 'Book name', 'Sponsor / scheme', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await b.main.getByRole('button', { name: 'New book' }).click();
    await expect(b.dialog).toHaveAccessibleName('New budget book');
    for (const f of ['Code', 'Book name', 'Sponsor / scheme name', 'Remarks']) await expect(b.dialog.getByRole('textbox', { name: f })).toBeVisible();
    for (const f of ['Active', 'Default book']) await expect(b.dialog.getByRole('checkbox', { name: f })).toBeVisible();
    await expect(b.dialog.getByText('A master already in use is deactivated, not deleted.')).toBeVisible();
  });
  await qa.step(3, async () => {
    await b.fill({ Code: code, 'Book name': name, 'Sponsor / scheme name': qa.prefix('X BLUD') });
    expect(await b.save()).toContain('Budget book created');
    const c = await b.cells(code);
    expect(c.slice(0, 4)).toEqual([code, name, qa.prefix('X BLUD'), 'Active']);
  });
  await qa.step(4, async () => {
    await b.edit(code);
    await b.fill({ 'Book name': qa.name('X Buku operasional uji') });
    expect(await b.save()).toContain('Budget book updated');
  });
  await qa.step(5, async () => {
    await page.goto('/id/budget/circulars');
    await page.getByRole('main').getByRole('button', { name: /New circular/ }).click();
    const options = await page.getByRole('dialog').getByRole('combobox', { name: 'Budget book' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.startsWith(code))).toBe(true);
  });
  return { code, name: qa.name('X Buku operasional uji') };
};

export const TC_APP020_003 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const h = heads(page);
  const alkes = { code: qa.code('X-ALKES'), name: qa.name('X Belanja alkes uji') };
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Budget heads' }).click();
    await expect(h.main.getByRole('heading', { level: 1, name: 'Budget heads' })).toBeVisible();
    await expect(h.main.getByText('Budget heads per financial year, split into capital and operating spending.', { exact: true })).toBeVisible();
    await expect(h.main.getByRole('button', { name: 'New head' })).toBeVisible();
    await expect(h.main.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Spending type', 'Financial year', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await h.main.getByRole('button', { name: 'New head' }).click();
    await expect(h.dialog).toHaveAccessibleName('New budget head');
    for (const f of ['Code', 'Head name', 'Remarks']) await expect(h.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(h.dialog.getByRole('combobox', { name: 'Spending type' }).locator('option')).toHaveText(['Capital (Belanja Modal)', 'Operating (Belanja Operasional)']);
    await expect(h.dialog.getByRole('checkbox', { name: 'Active' })).toBeVisible();
  });
  await qa.step(3, async () => {
    const years = await h.dialog.getByRole('combobox', { name: 'Financial year' }).locator('option').allInnerTexts();
    qa.note(3, `years: ${years.join(', ')}`);
    expect(years).toContain(YEAR);
    expect(years.some((y) => LOCKED.test(y))).toBe(true);
  });
  await qa.step(4, async () => {
    await h.fill({ Code: alkes.code, 'Head name': alkes.name, 'Spending type': 'Capital', 'Financial year': YEAR });
    expect(await h.save()).toContain('Budget head created');
    const c = await h.cells(alkes.code);
    expect([c[0], c[1], c[3]]).toEqual([alkes.code, alkes.name, YEAR]);
    // The site writes the spending type "Belanja Modal", which reads back as itself.
    expect(c[2]).toMatch(new RegExp(`^${sourceOnSite('Capital (Belanja Modal)')}$`));
  });
  await qa.step(5, async () => {
    await head(page, qa);
  });
};

export const TC_APP020_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = chart(page);
  const b = await book(page, qa);
  const grp = await head(page, qa);
  const child = await head(page, qa, 'X-OBAT', 'X Belanja obat uji anak');
  const proj = qa.name('X Proyek uji');
  expect(await projects(page).add({ 'Project name': proj, Type: 'Intramural', 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) })).toContain('Project created.');
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('main').getByRole('link', { name: 'Budget chart' }).click();
    await expect(c.main.getByRole('heading', { level: 1, name: 'Budget chart' })).toBeVisible();
    await expect(c.main.getByRole('combobox', { name: 'Book' })).toBeVisible();
    await expect(c.main.getByText('A head is removed by deactivating it. A head with active children cannot be removed.').first()).toBeVisible();
    await expect(c.main.getByRole('columnheader')).toHaveText(['Head', 'Kind', 'Year', 'Projects', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
    await c.main.getByRole('button', { name: 'Add head' }).click();
    await expect(c.dialog).toHaveAccessibleName('Add head to chart');
    for (const l of ['Budget head', 'Parent']) await expect(c.dialog.getByRole('combobox', { name: l })).toBeVisible();
    await expect(c.dialog.getByRole('checkbox', { name: 'Group (can hold child heads)' })).toBeVisible();
    await expect(c.dialog.getByText('Only a group can hold child heads. A head appears once per book.')).toBeVisible();
  });
  await qa.step(3, async () => {
    expect(await addToChart(page, b, grp.code, { group: true })).toContain('Head added to the chart.');
    const row = await chartRow(page, b, grp.code);
    await expect(row).toContainText(/group/i);
  });
  await qa.step(4, async () => {
    const row = await chartRow(page, b, grp.code);
    await row.getByRole('button', { name: 'Add child' }).click();
    await choose(c.dialog.getByRole('combobox', { name: 'Budget head' }), child.code);
    expect(await c.saveText()).toContain('Head added to the chart.');
    const r = await chartRow(page, b, child.code);
    qa.note(4, `child row: ${(await r.innerText()).replace(/\s+/g, ' ')}`);
  });
  await qa.step(5, async () => {
    const r = await chartRow(page, b, child.code);
    const buttons = (await r.getByRole('button').allInnerTexts()).map((x) => x.trim());
    qa.note(5, `row buttons: ${buttons.join(', ')}`);
    const attach = r.getByRole('button', { name: /project/i });
    if (!(await attach.count())) {
      qa.note(5, 'no button to attach a project on the row');
      return;
    }
    await attach.first().click();
    const d = c.dialog;
    const offered = await d.getByRole('combobox').first().locator('option').allInnerTexts().catch(() => [] as string[]);
    qa.note(5, `projects offered: ${offered.join(', ')}`);
    expect(offered.some((o) => o.includes(proj))).toBe(false);
  });
  await qa.step(6, async () => {
    const text = await deactivate(page, b, child.code);
    const after = await chartRow(page, b, child.code);
    qa.note(6, `"${text}"; row: ${(await after.innerText()).replace(/\s+/g, ' ')}`);
    await expect(after).toContainText(/Inactive/);
  });
};

/** Chooses in a list: a select by the option that starts with the text, or a typed list by its option. */
export async function choose(box: Locator, text: string): Promise<void> {
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    // The labels as the site shows them, matched by the English text or its Indonesian one (lib/i18n).
    const labels = await asOnSite(() => box.locator('option').allInnerTexts());
    const site = onSite(text, true);
    const starting = onSiteStartingWith(text);
    const label =
      labels.find((o) => (typeof site === 'string' ? false : site.test(o.trim()))) ??
      labels.find((o) => starting.includes(o.trim())) ??
      labels.find((o) => o.startsWith(text) || o.includes(text));
    if (!label) throw new Error(`no option "${text}"`);
    await asOnSite(() => box.selectOption({ label }));
    return;
  }
  await box.fill(text);
  const id = await box.getAttribute('aria-controls');
  const options = id ? box.page().locator(`[id="${id}"]`).getByRole('option') : box.page().getByRole('option');
  const option = options.filter({ hasText: text }).first();
  await expect(option).toBeVisible();
  const button = option.getByRole('button');
  await ((await button.count()) ? button : option).dispatchEvent('click');
  await expect(box).not.toHaveAttribute('data-stored', '');
}

export const books = (p: Page) => new Master(p, 'books', 'Budget books', 'New book');

export const heads = (p: Page) => new Master(p, 'heads', 'Budget heads', 'New head');

export const projects = (p: Page) => new Master(p, 'projects', 'Projects', 'Add project');

export const chart = (p: Page) => new Master(p, 'chart', 'Budget chart', 'Add head');

export async function book(page: Page, qa: Qa, extra: Record<string, string | boolean> = {}): Promise<{ code: string; name: string }> {
  const b = { code: qa.code('X-OPS'), name: qa.name('X Buku operasional uji') };
  expect(await books(page).add({ Code: b.code, 'Book name': b.name, 'Sponsor / scheme name': qa.prefix('X BLUD'), ...extra })).toContain('Budget book created');
  return b;
}

export const YEAR = todayWib().slice(0, 4);

export async function head(page: Page, qa: Qa, base = 'X-OBAT', name = 'X Belanja obat uji', type = 'Operating'): Promise<{ code: string; name: string }> {
  const h = { code: qa.code(base), name: qa.name(name) };
  expect(await heads(page).add({ Code: h.code, 'Head name': h.name, 'Spending type': type, 'Financial year': YEAR })).toContain('Budget head created');
  return h;
}

/** Adds a head to the chart of a book; returns the toasts and dialog text. */
export async function addToChart(page: Page, b: { code: string; name: string }, h: string, opts: { parent?: string; group?: boolean } = {}): Promise<string> {
  const c = chart(page);
  await c.open();
  await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
  await page.waitForLoadState('networkidle').catch(() => {});
  await c.main.getByRole('button', { name: 'Add head' }).click();
  await choose(c.dialog.getByRole('combobox', { name: 'Budget head' }), h);
  if (opts.parent) await choose(c.dialog.getByRole('combobox', { name: 'Parent' }), opts.parent);
  if (opts.group) await c.dialog.getByRole('checkbox', { name: 'Group (can hold child heads)' }).check();
  return c.saveText();
}

export async function chartRow(page: Page, b: { code: string; name: string }, h: string): Promise<Locator> {
  const c = chart(page);
  await c.open();
  await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = c.rows().filter({ hasText: h }).first();
  await expect(row).toBeVisible();
  return row;
}

/** Deactivates a head of the chart (Edit, clear "Active", Save); returns the toasts and text shown. */
export async function deactivate(page: Page, b: { code: string; name: string }, h: string): Promise<string> {
  const c = chart(page);
  await (await chartRow(page, b, h)).getByRole('button', { name: 'Edit' }).click();
  await c.dialog.getByRole('checkbox', { name: 'Active' }).uncheck();
  return c.saveText();
}

export class Master {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
    readonly heading: string,
    readonly addLabel: string,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/id/budget/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  async row(text: string): Promise<Locator> {
    await this.open();
    const search = this.main.getByRole('searchbox');
    if (await search.count()) await search.fill(text);
    const r = this.rows().filter({ hasText: text });
    await expect(r.first()).toBeVisible();
    return r.first();
  }
  async cells(text: string): Promise<string[]> {
    return (await (await this.row(text)).getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  async openAdd(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: this.addLabel }).click();
    await expect(this.dialog).toBeVisible();
  }
  async fill(v: Record<string, string | boolean>): Promise<void> {
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === 'boolean') {
        await this.dialog.getByRole('checkbox', { name: k, exact: true }).setChecked(val);
        continue;
      }
      const box = this.dialog.getByRole('textbox', { name: k, exact: true }).or(this.dialog.getByRole('spinbutton', { name: k, exact: true }));
      if (await box.count()) {
        await box.fill(val);
        continue;
      }
      await choose(this.dialog.getByRole('combobox', { name: k, exact: true }), val);
    }
  }
  async save(): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
  /** Toasts and any text the dialog shows after a save. */
  async saveText(): Promise<string> {
    const toasts = await this.save();
    const inDialog = (await this.dialog.isVisible()) ? await this.dialog.innerText() : '';
    return [...toasts, inDialog].join(' / ');
  }
  async add(v: Record<string, string | boolean>): Promise<string[]> {
    await this.openAdd();
    await this.fill(v);
    return this.save();
  }
  async edit(text: string): Promise<void> {
    await (await this.row(text)).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog).toBeVisible();
  }
}

/** Clicks a row action of a document of a list (circulars, internal budgets, budget requests) and its confirmation (the confirm button repeats the action, else "Confirm"); returns the toasts. */
export async function rowAction(page: Page, route: string, no: string, action: string): Promise<string[]> {
  if (!page.url().includes(`/budget/${route}`)) {
    await page.goto(`/id/budget/${route}`);
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: no }).first();
  // A list opened before the document changed (a second window) shows it after a reload.
  if (!(await row.waitFor({ timeout: 10_000 }).then(() => true, () => false))) {
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await expect(row).toBeVisible({ timeout: 20_000 });
  const mark = await toastMark(page);
  await row.getByRole('button', { name: action, exact: true }).click();
  // "Edit" opens the document's form; the other actions ask for a confirmation.
  if (action === 'Edit') {
    await expect(page.getByRole('dialog')).toBeVisible();
    return [];
  }
  const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  await confirm.waitFor({ timeout: 5_000 }).catch(() => {});
  if (await confirm.isVisible()) await confirm.getByRole('button', { name: new RegExp(`^(${action}|Confirm|Yes|OK)$`, 'i') }).last().click();
  return toastsAfter(page, mark);
}

const circularAction = (page: Page, no: string, action: string) => rowAction(page, 'circulars', no, action);

/** A cell of a document's row of a list, by its column (in English). */
export async function cellOf(page: Page, route: string, no: string, column: string): Promise<string> {
  await page.goto(`/id/budget/${route}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: no }).first();
  await expect(row).toBeVisible();
  const headers = (await page.getByRole('main').getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
  const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
  return cells[headers.indexOf(column)] ?? '';
}

/** Send, then Approve (U1 is the approver of the budget chains); returns the status afterwards. */
export async function sendAndApprove(page: Page, route: string, no: string): Promise<{ status: string; toasts: string[] }> {
  const toasts = [...(await rowAction(page, route, no, 'Send')), ...(await rowAction(page, route, no, 'Approve'))];
  return { status: await cellOf(page, route, no, 'Status'), toasts };
}

/** The status cell of a circular, as the site shows it (in English). */
async function circularStatus(page: Page, no: string): Promise<string> {
  await page.goto('/id/budget/circulars');
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: no }).first();
  const headers = (await page.getByRole('main').getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
  const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
  return cells[headers.indexOf('Status')] ?? '';
}

/**
 * TC-APP020-013: a budget circular for a book of the test (`book`, else a new
 * one) and the open financial year (the dialog's default), to two departments
 * with an employee each as in-charge; sent, approved and its list downloaded.
 */
export const TC_APP020_013 = async ({ page, qa }: CaseArgs, given?: { code: string; name: string }): Promise<void> => {
  const b = given ?? (await book(page, qa));
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Budget circulars' }).or(main.getByRole('link', { name: 'Budget circulars' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget circulars' })).toBeVisible();
    // "Download CSV" is a link that looks like a button.
    for (const name of ['Download CSV', 'New circular']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['No.', 'Date', 'Budget book', 'Year', 'Due date', 'Issued by', 'Departments', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New circular' }).click();
    await expect(dialog.getByText('New budget circular', { exact: true })).toBeVisible();
    for (const f of ['Circular date', 'Due date', 'Budget book', 'Financial year', 'Issued by']) await expect(dialog.getByLabel(f, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add department' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await dialog.getByLabel('Due date', { exact: true }).fill(addDays(todayWib(), 14));
    await choose(dialog.getByLabel('Budget book', { exact: true }), b.code);
    qa.note(3, `financial year: the dialog's default "${(await dialog.getByLabel('Financial year', { exact: true }).locator('option:checked').innerText()).trim()}" (the open year)`);
    await choose(dialog.getByLabel('Issued by', { exact: true }), 'QA-EMP');
    await dialog.getByRole('button', { name: 'Add department' }).click();
    await dialog.getByRole('button', { name: 'Add department' }).click();
    const departments = dialog.getByLabel('Department', { exact: true });
    const inCharge = dialog.getByLabel('In-charge', { exact: true });
    const names = (await departments.first().locator('option').allInnerTexts()).slice(1, 3);
    for (const [i, d] of names.entries()) {
      await departments.nth(i).selectOption({ label: d });
      await choose(inCharge.nth(i), 'QA-EMP');
    }
    qa.note(3, `departments ${names.join(', ')}; branch "${(await dialog.getByLabel('Branch', { exact: true }).first().locator('option:checked').innerText()).trim()}"`);
    const mark = await toastMark(page);
    await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    const toasts = await toastsAfter(page, mark);
    no = toasts.map((t) => t.match(/^Circular (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(no, `toast "Circular <no> saved as draft." (got "${toasts.join(' / ')}")`).toBeTruthy();
    expect((await circularStatus(page, no)).toLowerCase()).toBe('draft');
  });
  await qa.step(4, async () => {
    const sent = await circularAction(page, no, 'Send');
    qa.note(4, `Send: "${sent.join(' / ')}"`);
    const approved = await circularAction(page, no, 'Approve');
    const status = await circularStatus(page, no);
    if (status.toLowerCase() !== 'approved') qa.deviation(4, 'The status reads "Approved"', `Approve by U1: "${approved.join(' / ')}"; the status reads "${status}"`);
    else qa.note(4, `approved by U1: "${approved.join(' / ')}"`);
  });
  qa.notRun(5, 'TBD in the workbook: the notice to the departments is not on a screen of this user');
  await qa.step(6, async () => {
    const csv = main.getByRole('button', { name: 'Download CSV' }).or(main.getByRole('link', { name: 'Download CSV' })).first();
    const [download] = await Promise.all([page.waitForEvent('download'), csv.click()]);
    const file = await download.path();
    const text = file ? (await import('node:fs')).readFileSync(file, 'utf8') : '';
    qa.note(6, `${download.suggestedFilename()}: ${text.split('\n').filter(Boolean).length} lines`);
    expect(text).toContain(no);
  });
};

/** The first toast "<what> <no> saved as draft…" and its number. */
export function draftNo(toasts: string[], what: string): string {
  return toasts.map((t) => t.match(new RegExp(`^${what} (\\S+?);? saved as draft`))?.[1] ?? t.match(new RegExp(`^${what} (\\S+) saved as draft`))?.[1]).find(Boolean) ?? '';
}

/** A book of the test with two heads on its chart for the year, and an approved circular to two departments. */
export async function approvedCircular(page: Page, qa: Qa): Promise<{ book: { code: string; name: string }; heads: string[]; circular: string; departments: string[] }> {
  const b = await book(page, qa);
  const hs: string[] = [];
  for (const [base, name] of [['X-OBAT', 'X Belanja obat uji'], ['X-ALKES', 'X Belanja alkes uji']]) {
    const h = await head(page, qa, base, name);
    await addToChart(page, b, h.code);
    hs.push(h.code);
  }
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/circulars');
  await page.getByRole('main').getByRole('button', { name: 'New circular' }).click();
  await dialog.getByLabel('Due date', { exact: true }).fill(addDays(todayWib(), 14));
  await choose(dialog.getByLabel('Budget book', { exact: true }), b.code);
  await choose(dialog.getByLabel('Issued by', { exact: true }), 'QA-EMP');
  const departments = (await dialog.getByLabel('Department', { exact: true }).first().locator('option').allInnerTexts().catch(() => [] as string[])).slice(1, 3);
  await dialog.getByRole('button', { name: 'Add department' }).click();
  await dialog.getByRole('button', { name: 'Add department' }).click();
  const names = (await dialog.getByLabel('Department', { exact: true }).first().locator('option').allInnerTexts()).slice(1, 3);
  for (const [i, d] of names.entries()) {
    await dialog.getByLabel('Department', { exact: true }).nth(i).selectOption({ label: d });
    await choose(dialog.getByLabel('In-charge', { exact: true }).nth(i), 'QA-EMP');
  }
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const circular = draftNo(await toastsAfter(page, mark), 'Circular');
  expect(circular, 'the circular of the test is saved').toBeTruthy();
  expect((await sendAndApprove(page, 'circulars', circular)).status.toLowerCase()).toBe('approved');
  return { book: b, heads: hs, circular, departments: departments.length ? departments : names };
}

/** An internal budget of a department for an approved circular, with an amount per head; returns its number and the toasts. */
export async function internalBudget(page: Page, circular: string, department: string, amounts: [string, string][]): Promise<{ no: string; toasts: string[] }> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/internal-budgets');
  await page.getByRole('main').getByRole('button', { name: 'New internal budget' }).click();
  await choose(dialog.getByLabel('Budget circular', { exact: true }), circular);
  await choose(dialog.getByLabel('Department', { exact: true }), department);
  await choose(dialog.getByLabel('Prepared by', { exact: true }), 'QA-EMP');
  await choose(dialog.getByLabel('Submitted by', { exact: true }), 'QA-EMP');
  for (let i = 1; i < amounts.length; i++) await dialog.getByRole('button', { name: 'Add head' }).click();
  await expect.poll(() => dialog.getByLabel('Budget head', { exact: true }).first().locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  for (const [i, [h, amount]] of amounts.entries()) {
    await choose(dialog.getByLabel('Budget head', { exact: true }).nth(i), h);
    await dialog.getByLabel(/^(Requested amount|Nilai usulan) \(IDR\)$/).nth(i).fill(amount);
  }
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const toasts = await toastsAfter(page, mark);
  return { no: draftNo(toasts, 'Internal budget'), toasts };
}

export const AMOUNTS = (heads: string[]): [string, string][] => [[heads[0], '150000000.00'], [heads[1], '75000000.50']];

/**
 * TC-APP020-015: a department answers an approved circular with an internal
 * budget of two heads (150000000.00 and 75000000.50), sent and approved.
 * `given` is the chain's approved circular, else the test makes one.
 */
export const TC_APP020_015 = async ({ page, qa }: CaseArgs, given?: Awaited<ReturnType<typeof approvedCircular>>): Promise<{ circular: Awaited<ReturnType<typeof approvedCircular>>; internal: string }> => {
  const c = given ?? (await approvedCircular(page, qa));
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Internal budgets' }).or(main.getByRole('link', { name: 'Internal budgets' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Internal budgets' })).toBeVisible();
    for (const name of ['Download CSV', 'New internal budget']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    const cols = (await main.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    expect(cols.slice(0, 4)).toEqual(['No.', 'Date', 'Circular', 'Department']);
    qa.note(1, `columns ${cols.join(', ')}`);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New internal budget' }).click();
    for (const f of ['Budget circular', 'Department', 'Document date', 'Reference document no.', 'Reference document date', 'Prepared by', 'Submitted by', 'Budget head']) await expect(dialog.getByLabel(f, { exact: true }).first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add head' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
    // The heads of the circular's book load after the choice.
    const headOptions = dialog.getByLabel('Budget head', { exact: true }).first().locator('option');
    await expect.poll(() => headOptions.count(), { timeout: 15_000 }).toBeGreaterThan(1);
    const offered = (await headOptions.allInnerTexts()).join(' | ');
    for (const h of c.heads) expect(offered).toContain(h);
    qa.note(3, `heads offered: ${offered.slice(0, 200)}`);
    await page.keyboard.press('Escape');
  });
  await qa.step(4, async () => {
    const r = await internalBudget(page, c.circular, c.departments[0], AMOUNTS(c.heads));
    no = r.no;
    expect(no, `toast "Internal budget <no> saved as draft." (got "${r.toasts.join(' / ')}")`).toBeTruthy();
    const total = await cellOf(page, 'internal-budgets', no, 'Total request').catch(() => '');
    qa.note(4, `${no}: total "${total}", status "${await cellOf(page, 'internal-budgets', no, 'Status')}"`);
    if (total && !/225[.,]000[.,]000[.,]50/.test(total)) qa.deviation(4, 'The row shows two heads and the total 225000000.50', `total "${total}"`);
  });
  await qa.step(5, async () => {
    const r = await sendAndApprove(page, 'internal-budgets', no);
    if (r.status.toLowerCase() !== 'approved') qa.deviation(5, 'The status reads "Approved"', `"${r.toasts.join(' / ')}"; the status reads "${r.status}"`);
  });
  return { circular: c, internal: no };
};

/**
 * TC-APP020-019: the approved internal budgets of one circular consolidated
 * into a budget request, saved first with one amount empty, then complete,
 * sent and approved. `given` is the chain's circular with one approved
 * internal budget; the second department's is made here.
 */
export const TC_APP020_019 = async ({ page, qa }: CaseArgs, given?: { circular: Awaited<ReturnType<typeof approvedCircular>>; internal: string }): Promise<void> => {
  const c = given?.circular ?? (await approvedCircular(page, qa));
  const internals: string[] = given ? [given.internal] : [];
  for (const d of c.departments.slice(internals.length, 2)) {
    const r = await internalBudget(page, c.circular, d, AMOUNTS(c.heads));
    expect(r.no, `internal budget of ${d}`).toBeTruthy();
    expect((await sendAndApprove(page, 'internal-budgets', r.no)).status.toLowerCase()).toBe('approved');
    internals.push(r.no);
  }
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  const header = ['Budget circular', 'Document date', 'Reference document no.', 'Reference document date', 'Prepared by', 'Submitted by'];
  /** The amount inputs of "Consolidation per budget head" (every text input that is not a header field). */
  const amountInputs = async () => {
    const all = await dialog.locator('input[type="text"], input:not([type])').all();
    const out = [];
    for (const i of all) {
      const label = await i.evaluate((e) => (e as HTMLInputElement).labels?.[0]?.innerText.trim() ?? e.getAttribute('aria-label') ?? '');
      if (!header.includes(label) && !/(Prepared|Submitted) by|Reference/.test(label)) out.push(i);
    }
    return out;
  };
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Budget requests' }).or(main.getByRole('link', { name: 'Budget requests' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget requests' })).toBeVisible();
    for (const name of ['Download CSV', 'New consolidation']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    qa.note(1, `columns ${(await main.getByRole('columnheader').allInnerTexts()).map((h) => h.trim()).join(', ')}`);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New consolidation' }).click();
    for (const f of header) await expect(dialog.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(3, async () => {
    await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
    // The internal budgets of the circular load after the choice.
    for (const i of internals) await expect(dialog).toContainText(i, { timeout: 15_000 });
  });
  await qa.step(4, async () => {
    for (const i of internals) await dialog.getByRole('checkbox', { name: new RegExp(i) }).check();
    const inputs = await amountInputs();
    expect(inputs.length, 'one amount per head and department').toBeGreaterThanOrEqual(2);
    qa.note(4, `${inputs.length} consolidated amounts, the last one left empty first (step 5)`);
    for (const i of inputs.slice(0, -1)) await i.fill('70000000');
  });
  await qa.step(5, async () => {
    const mark = await toastMark(page);
    await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    const toasts = await toastsAfter(page, mark);
    no = draftNo(toasts, 'Budget request');
    expect(no, `toast "Budget request <no> saved as draft…" (got "${toasts.join(' / ')}")`).toBeTruthy();
    if (!toasts.some((t) => /not fully consolidated|mata belum lengkap/i.test(t))) qa.deviation(5, 'A toast that one head is not fully consolidated yet', `"${toasts.join(' / ')}"`);
    else qa.note(5, `"${toasts.join(' / ')}"`);
  });
  await qa.step(6, async () => {
    await rowAction(page, 'requests', no, 'Edit');
    // The saved lines load into the form after it opens.
    await expect.poll(async () => (await amountInputs()).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    const inputs = await amountInputs();
    await inputs[inputs.length - 1].fill('70000000');
    const mark = await toastMark(page);
    await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    qa.note(6, `saved again: "${(await toastsAfter(page, mark)).join(' / ')}"`);
    const r = await sendAndApprove(page, 'requests', no);
    if (r.status.toLowerCase() !== 'approved') qa.deviation(6, 'The status reads "Approved"', `"${r.toasts.join(' / ')}"; the status reads "${r.status}"`);
    await page.goto('/id/budget/allocations');
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(6, `Budget allocation ${(await main.innerText()).includes(no) ? 'lists' : 'does not list'} ${no}`);
  });
};
