import { toastsAfter } from '../18-settings/helpers';
import { toastMark } from '../../../lib/assertions';
import { asOnSite, onSite, onSiteStartingWith, regexOnSite } from '../../../lib/i18n';
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
  // A code that sorts first: the book picker of circulars lists only the first books in code order (found blocker 40).
  const code = qa.bed('X-OPS');
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
    // The options of the books are loaded after the dialog opens.
    const options = page.getByRole('dialog').getByRole('combobox', { name: 'Budget book' }).locator('option');
    await expect.poll(async () => (await options.allInnerTexts()).some((o) => o.startsWith(code)), { timeout: 15_000 }).toBe(true);
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
  // The book lists (Budget chart, the documents) offer the first books by code only (found blocker 40): the code sorts first.
  const b = { code: qa.bed('X-OPS'), name: qa.name('X Buku operasional uji') };
  expect(await books(page).add({ Code: b.code, 'Book name': b.name, 'Sponsor / scheme name': qa.prefix('X BLUD'), ...extra })).toContain('Budget book created');
  return b;
}

export const YEAR = todayWib().slice(0, 4);

export async function head(page: Page, qa: Qa, base = 'X-OBAT', name = 'X Belanja obat uji', type = 'Operating'): Promise<{ code: string; name: string }> {
  // Head lists (the destination of a transfer) offer the first heads by code only (found blocker 40): the code sorts first.
  const h = { code: qa.bed(base), name: qa.name(name) };
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
/** Closes the dialogs still open (a saved sanction proposal stays open; Escape does not always close it). */
export async function closeOpenDialogs(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const open = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ visible: true });
    if (!(await open.count())) return;
    await page.keyboard.press('Escape');
    if (await open.count()) await open.last().getByRole('button', { name: /^(Cancel|Close)$/ }).last().click({ timeout: 3_000 }).catch(() => {});
  }
}

export async function rowAction(page: Page, route: string, no: string, action: string): Promise<string[]> {
  await closeOpenDialogs(page);
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
  if (action === 'Edit' || action === 'View') {
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

// ------------------------------------------------------------------ allocation, release, withdrawal
//
// Since 2026-11-01 an approved budget request can be allocated, sent and approved on Podomoro, and the
// allocation journal is posted (checklist blocker 13 no longer stops this part). The helpers below make
// the chain circular → internal budgets → budget request → allocation → fund release → withdrawal.

/** The consolidated amount per head and department of the test's budget request: two departments, so 140000000 a head. */
export const PER_DEPARTMENT = '70000000';

/** The amount inputs of the consolidation form: every text input that is not a header field. */
export async function consolidationInputs(dialog: Locator): Promise<Locator[]> {
  const header = ['Budget circular', 'Document date', 'Reference document no.', 'Reference document date', 'Prepared by', 'Submitted by'];
  const out: Locator[] = [];
  for (const i of await dialog.locator('input[type="text"], input:not([type])').all()) {
    const label = await i.evaluate((e) => (e as HTMLInputElement).labels?.[0]?.innerText.trim() ?? e.getAttribute('aria-label') ?? '');
    if (!header.includes(label) && !/(Prepared|Submitted) by|Reference/.test(label)) out.push(i);
  }
  return out;
}

export type ApprovedRequest = Awaited<ReturnType<typeof approvedCircular>> & { request: string };

/** A budget request of the test: an approved circular, an approved internal budget per department, consolidated at 70000000 each, sent and approved. */
export async function approvedRequest(page: Page, qa: Qa): Promise<ApprovedRequest> {
  const c = await approvedCircular(page, qa);
  const internals: string[] = [];
  for (const d of c.departments.slice(0, 2)) {
    const r = await internalBudget(page, c.circular, d, AMOUNTS(c.heads));
    expect(r.no, `internal budget of ${d} (${r.toasts.join(' / ')})`).toBeTruthy();
    expect((await sendAndApprove(page, 'internal-budgets', r.no)).status.toLowerCase()).toBe('approved');
    internals.push(r.no);
  }
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/requests');
  await page.getByRole('main').getByRole('button', { name: 'New consolidation' }).click();
  await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
  for (const i of internals) await expect(dialog).toContainText(i, { timeout: 15_000 });
  for (const i of internals) await dialog.getByRole('checkbox', { name: new RegExp(i) }).check();
  await expect.poll(async () => (await consolidationInputs(dialog)).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  for (const i of await consolidationInputs(dialog)) await i.fill(PER_DEPARTMENT);
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const request = draftNo(await toastsAfter(page, mark), 'Budget request');
  expect(request, 'the budget request of the test is saved').toBeTruthy();
  expect((await sendAndApprove(page, 'requests', request)).status.toLowerCase()).toBe('approved');
  return { ...c, request };
}

/** The row of a request on Budget allocation, after a fresh load. */
export async function allocationRow(page: Page, request: string): Promise<Locator> {
  await page.goto('/id/budget/allocations');
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: request }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  return row;
}

/**
 * The cells of a request's row on Budget allocation, by position: the site writes two pairs of columns with
 * the same Indonesian word ("Konsolidasi", "Alokasi"), so the columns are not found by their names.
 */
export async function allocationCells(page: Page, request: string): Promise<{ consolidated: string; allocated: string; authority: string; status: string; journal: string; actions: string[] }> {
  const row = await allocationRow(page, request);
  const c = (await row.getByRole('cell').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
  return { consolidated: c[2], allocated: c[3], authority: c[4], status: c[5], journal: c[6], actions: (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()) };
}

/** Opens "Allocate" (or "Edit" of a draft) of a request; returns the dialog. */
export async function openAllocation(page: Page, request: string): Promise<Locator> {
  const row = await allocationRow(page, request);
  await row.getByRole('button', { name: /^(Allocate|Edit)$/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Authority no. (dasar alokasi)', { exact: true }).first()).toBeVisible();
  return dialog;
}

/** Fills the allocation form: today's date, per head the authority DIPA and its number (empty to skip), and "Use consolidated" where asked. */
export async function fillAllocation(dialog: Locator, heads: { authority: string; useConsolidated?: boolean }[]): Promise<void> {
  await dialog.getByLabel('Allocation date (journal date)', { exact: true }).fill(todayWib());
  const types = dialog.getByLabel('Authority', { exact: true });
  const numbers = dialog.getByLabel('Authority no. (dasar alokasi)', { exact: true });
  const fill = dialog.getByRole('button', { name: 'Use consolidated' });
  for (const [i, h] of heads.entries()) {
    await types.nth(i).selectOption({ label: 'DIPA' });
    await numbers.nth(i).fill(h.authority);
    if (h.useConsolidated !== false) await fill.nth(i).click();
  }
}

/** Clicks "Save" of the allocation dialog; returns the toasts and the texts the dialog shows afterwards. */
export async function saveAllocation(page: Page): Promise<{ toasts: string[]; dialog: string }> {
  const dialog = page.getByRole('dialog');
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const toasts = await toastsAfter(page, mark);
  const text = (await dialog.isVisible()) ? (await dialog.innerText()).replace(/\s+/g, ' ') : '';
  return { toasts, dialog: text };
}

/** Reloads a list until the posting cell of a document reads "Posted" or "Posting failed" (finance posts in the background); returns the last reading. */
export async function postingOf(read: () => Promise<string>, timeout = 90_000): Promise<string> {
  let last = '';
  await expect
    .poll(async () => (last = await read()), { timeout, intervals: [3_000, 5_000, 10_000] })
    .toMatch(/^(Posted|Posting failed|Reversed|Reversal failed)\b/)
    .catch(() => {});
  return last;
}

export type ApprovedAllocation = ApprovedRequest & { authorities: string[]; journal: string };

/** An approved allocation of the test's request: each head allocated at its consolidated amount under its own DIPA authority. */
export async function approvedAllocation(page: Page, qa: Qa): Promise<ApprovedAllocation> {
  const r = await approvedRequest(page, qa);
  const authorities = r.heads.map(() => qa.code('X-DIPA'));
  await openAllocation(page, r.request);
  await fillAllocation(page.getByRole('dialog'), authorities.map((authority) => ({ authority })));
  const saved = await saveAllocation(page);
  expect(saved.toasts.join(' / '), 'the allocation of the test is saved').toMatch(/saved as draft/);
  await rowAction(page, 'allocations', r.request, 'Send');
  await rowAction(page, 'allocations', r.request, 'Approve');
  const cells = await allocationCells(page, r.request);
  expect(cells.status, 'the allocation of the test is approved').toMatch(/^Approved/);
  const journal = await postingOf(async () => (await allocationCells(page, r.request)).journal);
  return { ...r, authorities, journal };
}

/** Clicks a row action of a budget list and reads its confirmation before confirming; returns both. */
export async function rowActionRead(page: Page, route: string, no: string, action: string): Promise<{ confirm: string; toasts: string[] }> {
  await closeOpenDialogs(page);
  await page.goto(`/id/budget/${route}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: no }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  const mark = await toastMark(page);
  await row.getByRole('button', { name: action, exact: true }).click();
  const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  await confirm.waitFor({ timeout: 5_000 }).catch(() => {});
  let text = '';
  if (await confirm.isVisible()) {
    text = (await confirm.innerText()).replace(/\s+/g, ' ').trim();
    await confirm.getByRole('button', { name: new RegExp(`^(${action}|Confirm|Yes|OK)$`, 'i') }).last().click();
  }
  return { confirm: text, toasts: await toastsAfter(page, mark) };
}

/** Clicks "Save" of the open dialog; returns the toasts and the text the dialog shows afterwards ('' once it closed). */
export const saveForm = saveAllocation;

/** A line of a fund release: the allocation line by its authority (and department), and the amounts. */
export interface ReleaseLine { authority: string; department?: string; requested: string; released: string }

/** Opens "New release" and fills it for a book of the test (Operating heads); returns the dialog. */
export async function releaseDialog(page: Page, bookCode: string, lines: ReleaseLine[]): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/fund-releases');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').getByRole('button', { name: 'New release' }).click();
  await expect(dialog.getByLabel('Budget book', { exact: true })).toBeVisible();
  await dialog.getByLabel('Document date', { exact: true }).fill(todayWib());
  await choose(dialog.getByLabel('Budget book', { exact: true }), bookCode);
  await choose(dialog.getByLabel('Head type', { exact: true }), 'Belanja Operasional');
  for (let i = 1; i < lines.length; i++) await dialog.getByRole('button', { name: 'Add line' }).click();
  // The line lists are named "1. Allocation line (dasar alokasi)", "2. …": found by their first option.
  const pick = dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Choose the allocation line' }) });
  await expect.poll(() => pick.first().locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  for (const [i, l] of lines.entries()) {
    const labels = await asOnSite(() => pick.nth(i).locator('option').allInnerTexts());
    const label = labels.find((o) => o.includes(l.authority) && (!l.department || o.includes(l.department)));
    if (!label) throw new Error(`no allocation line of ${l.authority} ${l.department ?? ''}: ${labels.join(' | ').slice(0, 300)}`);
    await asOnSite(() => pick.nth(i).selectOption({ label }));
    await dialog.getByLabel('Requested (IDR)', { exact: true }).nth(i).fill(l.requested);
    await dialog.getByLabel('Released (IDR)', { exact: true }).nth(i).fill(l.released);
  }
  return dialog;
}

/** An approved fund release of one allocation line (the first department of an authority); returns its number and posting. */
export async function approvedRelease(page: Page, bookCode: string, authority: string, amount = '40000000'): Promise<{ no: string; posting: string }> {
  await ensurePostingRules(page);
  await releaseDialog(page, bookCode, [{ authority, requested: amount, released: amount }]);
  const saved = await saveForm(page);
  const no = saved.toasts.map((t) => t.match(/^Fund release (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
  expect(no, `the fund release of the test is saved (${saved.toasts.join(' / ')} ${saved.dialog.slice(0, 200)})`).toBeTruthy();
  await rowAction(page, 'fund-releases', no, 'Send');
  await rowAction(page, 'fund-releases', no, 'Approve');
  expect(isApproved(await cellOf(page, 'fund-releases', no, 'Status'))).toBe(true);
  const posting = await postingOf(() => cellOf(page, 'fund-releases', no, 'Finance posting'));
  return { no, posting };
}

/** The bank account of Podomoro's finance configuration (Finance, Configuration): an active bank account of the branch. */
export async function branchBank(page: Page): Promise<string> {
  await page.goto('/id/finance/configuration');
  await page.waitForLoadState('networkidle').catch(() => {});
  const main = page.getByRole('main');
  await choose(main.locator('select').first(), 'HO');
  await page.waitForLoadState('networkidle').catch(() => {});
  const bank = (await asOnSite(() => main.getByLabel(/^(Bank|Bank)$/, { exact: true }).first().locator('option:checked').innerText())).trim();
  expect(bank, 'Podomoro has a bank account in its finance configuration').toMatch(/·/);
  return bank.split(' · ')[0];
}

/** Opens "New withdrawal" and fills it; an empty field stays empty. Returns the dialog. */
export async function withdrawalDialog(page: Page, bookCode: string, v: { authority: string; bank: string; amount: string; instrumentNo?: string }): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/fund-withdrawals');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').getByRole('button', { name: 'New withdrawal' }).click();
  await expect(dialog.getByLabel('Budget book', { exact: true })).toBeVisible();
  await dialog.getByLabel('Document date', { exact: true }).fill(todayWib());
  await choose(dialog.getByLabel('Budget book', { exact: true }), bookCode);
  await choose(dialog.getByLabel('Head type', { exact: true }), 'Belanja Operasional');
  const authority = dialog.getByLabel('Dasar alokasi', { exact: true });
  await expect.poll(async () => (await asOnSite(() => authority.locator('option').allInnerTexts())).join('|'), { timeout: 15_000 }).toContain(v.authority);
  await choose(authority, v.authority);
  if (v.bank) await choose(dialog.getByLabel('Bank account', { exact: true }), v.bank);
  await dialog.getByLabel('Withdrawal amount (IDR)', { exact: true }).fill(v.amount);
  await choose(dialog.getByLabel('Instrument', { exact: true }), 'SP2D');
  if (v.instrumentNo !== '') await dialog.getByLabel('Instrument no.', { exact: true }).fill(v.instrumentNo ?? `QA-SP2D-${Date.now().toString(36).toUpperCase()}`);
  await dialog.getByLabel('Instrument date', { exact: true }).fill(todayWib());
  return dialog;
}

/** A sanction proposal's values: the line by its authority (and department) under a head of the test's book. */
export interface SanctionValues { bookCode: string; head: string; authority: string; department?: string; request?: string; sanction?: string }

/** Opens "New proposal" and fills it; returns the dialog. */
export async function sanctionDialog(page: Page, v: SanctionValues): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/sanctions');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').getByRole('button', { name: 'New proposal' }).click();
  await expect(dialog.getByLabel('Budget book', { exact: true })).toBeVisible();
  await dialog.getByLabel('Document date', { exact: true }).fill(todayWib());
  await choose(dialog.getByLabel('Budget book', { exact: true }), v.bookCode);
  await choose(dialog.getByLabel('Budget head', { exact: true }), v.head);
  const line = dialog.getByLabel('Requesting department and authority', { exact: true });
  await expect.poll(() => line.locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  const labels = await asOnSite(() => line.locator('option').allInnerTexts());
  const label = labels.find((o) => o.includes(v.authority) && (!v.department || o.includes(v.department)));
  if (!label) throw new Error(`no line of ${v.authority} ${v.department ?? ''}: ${labels.join(' | ')}`);
  await asOnSite(() => line.selectOption({ label }));
  await choose(dialog.getByLabel('Requested by', { exact: true }), 'QA-EMP');
  await dialog.getByLabel('Request amount (IDR)', { exact: true }).fill(v.request ?? '20000000');
  await dialog.getByLabel('Sanction amount (IDR)', { exact: true }).fill(v.sanction ?? '18000000');
  return dialog;
}

/** Saves the open sanction dialog; returns the number of the draft ('' if refused) and what the site showed. */
export async function saveSanction(page: Page): Promise<{ no: string; toasts: string[]; dialog: string }> {
  const r = await saveForm(page);
  const no = r.toasts.map((t) => t.match(/^Sanction proposal (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
  // A saved proposal stays open (for its documents); it is closed so the list can be used.
  const dialog = page.getByRole('dialog');
  if (no && (await dialog.isVisible())) await closeOpenDialogs(page);
  return { ...r, no };
}

/** A sanction proposal of the test, saved, sent and approved; returns its number. */
export async function approvedSanction(page: Page, v: SanctionValues): Promise<string> {
  await sanctionDialog(page, v);
  await answerChecklist(page.getByRole('dialog'));
  const r = await saveSanction(page);
  expect(r.no, `the sanction proposal of the test is saved (${r.toasts.join(' / ')} ${r.dialog.slice(0, 160)})`).toBeTruthy();
  await rowAction(page, 'sanctions', r.no, 'Send');
  await rowAction(page, 'sanctions', r.no, 'Approve');
  expect(isApproved(await cellOf(page, 'sanctions', r.no, 'Status')), 'the sanction proposal of the test is approved').toBe(true);
  return r.no;
}

/** The head code of an allocation authority: the allocation row names them "HEAD: AUTHORITY". */
export async function headOf(page: Page, request: string, authority: string): Promise<string> {
  const cells = await allocationCells(page, request);
  const m = new RegExp(`(\\S+): ${authority.replace(/[-]/g, '\\-')}`).exec(cells.authority);
  expect(m, `the head of ${authority} in "${cells.authority}"`).toBeTruthy();
  return m![1];
}

// ------------------------------------------------------------------ budget position

/** A line of the budget position. */
export interface PositionLine { head: string; department: string; authority: string; allocated: number; transferredIn: number; transferredOut: number; reserved: number; utilised: number; balance: number }

/** Opens the budget position (the Budget hub) for a book. */
export async function openPosition(page: Page, bookCode: string): Promise<void> {
  const main = page.getByRole('main');
  await page.goto('/id/budget');
  await page.waitForLoadState('networkidle').catch(() => {});
  const books = main.locator('select').filter({ has: page.locator('option', { hasText: bookCode }) }).first();
  await choose(books, bookCode);
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * The lines the budget position shows now, by the column order of the screen ("Budget head", "Department / branch",
 * "Allocation authority", "Allocated", "Transferred in", "Transferred out", "Reserved", "Utilised", "Balance"):
 * "Dasar alokasi" names a column of several budget screens with different English names, so names are not used.
 */
export async function shownLines(page: Page): Promise<PositionLine[]> {
  const rows = await page.getByRole('main').getByRole('table').last().getByRole('row').evaluateAll((rs) =>
    rs.map((r) => [...r.querySelectorAll('td')].map((td) => (td as HTMLElement).innerText.replace(/\s+/g, ' ').trim())),
  );
  return rows
    .filter((c) => c.length >= 9)
    .map((c) => ({ head: c[0], department: c[1], authority: c[2], allocated: amountOf(c[3]), transferredIn: amountOf(c[4]), transferredOut: amountOf(c[5]), reserved: amountOf(c[6]), utilised: amountOf(c[7]), balance: amountOf(c[8]) }));
}

/**
 * The position lines of a test's authorities in its book. The table first shows every book and re-renders for the
 * chosen one, so it is read again until `expected` lines of the authorities are there (or 30 s pass).
 */
export async function linesOf(page: Page, bookCode: string, authorities: string[], expected = 1): Promise<PositionLine[]> {
  await openPosition(page, bookCode);
  const read = async () => (await shownLines(page)).filter((x) => authorities.some((a) => x.authority.includes(a)));
  let lines: PositionLine[] = [];
  await expect.poll(async () => (lines = await read()).length, { timeout: 30_000, intervals: [1_000, 2_000, 5_000] }).toBeGreaterThanOrEqual(expected).catch(() => {});
  return lines;
}

/** "140.000.000" or "140,000,000.00" as a number. */
export const amountOf = (text: string): number => Number(text.replace(/[^\d,.-]/g, '').replace(/[.,](\d{2})$/, '#$1').replace(/[.,]/g, '').replace('#', '.'));


// ------------------------------------------------------------------ budget transfer

/** A transfer line: the source by its authority and department, the destination head (code) and department. */
export interface TransferValues { bookCode: string; authority: string; department: string; destHead: string; destDepartment: string; destBranch?: string; amount: string; headType?: string }

/** Opens "New transfer" and fills one line; returns the dialog. */
export async function transferDialog(page: Page, v: TransferValues): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/transfers');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').getByRole('button', { name: 'New transfer' }).click();
  await expect(dialog.getByLabel('Budget book', { exact: true })).toBeVisible();
  await dialog.getByLabel('Document date', { exact: true }).fill(todayWib());
  await choose(dialog.getByLabel('Budget book', { exact: true }), v.bookCode);
  await choose(dialog.getByLabel('Head type', { exact: true }), v.headType ?? 'Belanja Operasional');
  // The source lists are named "1. Source line", "2. …": found by their first option.
  const source = dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Choose the source line' }) }).first();
  await expect.poll(() => source.locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  const labels = await asOnSite(() => source.locator('option').allInnerTexts());
  const label = labels.find((o) => o.includes(v.authority) && o.includes(v.department));
  if (!label) throw new Error(`no source line ${v.authority} ${v.department}: ${labels.join(' | ').slice(0, 300)}`);
  await asOnSite(() => source.selectOption({ label }));
  await choose(dialog.getByLabel('Destination head', { exact: true }).first(), v.destHead);
  if (v.destBranch) await choose(dialog.getByLabel('Destination branch', { exact: true }).first(), v.destBranch);
  await choose(dialog.getByLabel('Destination department', { exact: true }).first(), v.destDepartment);
  await dialog.getByLabel('Amount (IDR)', { exact: true }).first().fill(v.amount);
  return dialog;
}

/** Saves the open transfer dialog; returns the draft number ('' if refused) and what the site showed. */
export async function saveTransfer(page: Page): Promise<{ no: string; toasts: string[]; dialog: string }> {
  const r = await saveForm(page);
  return { ...r, no: r.toasts.map((t) => t.match(/^Transfer (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '' };
}

/** A transfer of the test, saved, sent and approved; returns its number. */
export async function approvedTransfer(page: Page, v: TransferValues): Promise<string> {
  await transferDialog(page, v);
  const r = await saveTransfer(page);
  expect(r.no, `the transfer of the test is saved (${r.toasts.join(' / ')} ${r.dialog.slice(0, 160)})`).toBeTruthy();
  await rowAction(page, 'transfers', r.no, 'Send');
  await rowAction(page, 'transfers', r.no, 'Approve');
  expect(isApproved(await cellOf(page, 'transfers', r.no, 'Status'))).toBe(true);
  return r.no;
}

/** The department names of an allocation's position lines ("Anak HO · Podomoro" → "Anak"). */
export const departmentName = (line: { department: string }): string => line.department.replace(/\s+HO\b.*$/, '').trim();

// ------------------------------------------------------------------ Finance, Budget posting rules of Podomoro

export type PostingKind = 'Allocation — operating' | 'Allocation — capital' | 'Fund release' | 'Fund withdrawal';

/** Opens Finance, Budget posting rules for Podomoro; returns the row of a posting kind. */
async function ruleRow(page: Page, kind: PostingKind): Promise<Locator> {
  await page.goto('/id/finance/posting-rules');
  await page.waitForLoadState('networkidle').catch(() => {});
  const main = page.getByRole('main');
  // The rules of the chosen branch load after the choice (the table first shows the first branch of the list).
  const loaded = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/finance/posting-rules'), { timeout: 15_000 }).catch(() => null);
  await choose(main.getByLabel('Branch', { exact: true }).or(main.locator('select').first()).first(), 'HO');
  await loaded;
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = main.getByRole('table').getByRole('row').filter({ hasText: kind }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  return row;
}

/** "Ready", "Not set" or "Not ready": the status of a posting rule of Podomoro. */
export async function postingRuleStatus(page: Page, kind: PostingKind): Promise<string> {
  const cells = (await (await ruleRow(page, kind)).getByRole('cell').allInnerTexts()).map((c) => c.trim());
  return cells.find((c) => /^(Ready|Not set|Not ready)$/.test(c)) ?? cells.join(' | ');
}

/**
 * The accounts the tests give the budget posting rules that Podomoro lacked (set-up of checklist blocker 13,
 * "Budget posting rule that can be used in Finance for the branch"): the first QA expense account as debit and
 * 4101 Pendapatan as credit; a withdrawal debits the bank account of its document.
 */
const RULE_ACCOUNTS = { debit: 'QA-0D43DRA3X-501001', credit: '4101' };

/** Saves a posting rule of Podomoro with the test accounts; returns the toasts. */
export async function savePostingRule(page: Page, kind: PostingKind): Promise<string[]> {
  const row = await ruleRow(page, kind);
  const selects = row.locator('select');
  if (kind !== 'Fund withdrawal') await choose(selects.first(), RULE_ACCOUNTS.debit);
  await choose(selects.last(), RULE_ACCOUNTS.credit);
  const mark = await toastMark(page);
  await row.getByRole('button', { name: 'Save', exact: true }).click();
  return toastsAfter(page, mark);
}

/** Removes a posting rule of Podomoro; returns the toasts. */
export async function removePostingRule(page: Page, kind: PostingKind): Promise<string[]> {
  const row = await ruleRow(page, kind);
  const mark = await toastMark(page);
  await row.getByRole('button', { name: 'Remove', exact: true }).click();
  const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  if (await confirm.waitFor({ timeout: 3_000 }).then(() => true, () => false)) await confirm.getByRole('button', { name: /^(Remove|Confirm|Yes|OK)$/ }).last().click();
  return toastsAfter(page, mark);
}

/** Makes sure the fund release and fund withdrawal rules of Podomoro are ready (saved once, then kept). */
export async function ensurePostingRules(page: Page): Promise<string[]> {
  const done: string[] = [];
  for (const kind of ['Fund release', 'Fund withdrawal'] as PostingKind[]) {
    if ((await postingRuleStatus(page, kind)) === 'Ready') continue;
    await savePostingRule(page, kind);
    await expect.poll(() => postingRuleStatus(page, kind), { timeout: 30_000, message: `the ${kind} rule of Podomoro is ready` }).toBe('Ready');
    done.push(kind);
  }
  return done;
}

// ------------------------------------------------------------------ sanction documents

/** A file for the document upload: a small PDF, or any name, type and size. */
export const file = (name: string, mimeType: string, size = 2_000) => ({ name, mimeType, buffer: Buffer.concat([Buffer.from('%PDF-1.4\n% QA test document\n'), Buffer.alloc(Math.max(0, size - 30), 32)]) });

/** Opens "Edit" of a draft proposal; returns the dialog. */
export async function editSanction(page: Page, no: string): Promise<Locator> {
  await rowAction(page, 'sanctions', no, 'Edit');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Supporting documents', { exact: true })).toBeVisible();
  return dialog;
}

/** Uploads a file to the open proposal; returns the toasts. */
export async function upload(page: Page, f: ReturnType<typeof file>): Promise<string[]> {
  const mark = await toastMark(page);
  await page.getByRole('dialog').locator('input[type="file"]').setInputFiles(f);
  return toastsAfter(page, mark);
}


/** Saves a posting rule again until it reads "Ready" (the restore after a step that took it away). */
export async function restorePostingRule(page: Page, kind: PostingKind): Promise<void> {
  for (let i = 0; i < 3 && (await postingRuleStatus(page, kind)) !== 'Ready'; i++) await savePostingRule(page, kind);
  await expect.poll(() => postingRuleStatus(page, kind), { timeout: 30_000, message: `the ${kind} rule of Podomoro is ready again` }).toBe('Ready');
}

/** A text the site shows, in English or as the site writes it (a template's Indonesian form too). */
export const shows = (re: RegExp, text: string): boolean => re.test(text) || regexOnSite(re).test(text);

/** A status cell that reads approved (the site may add what the approval did: "Approved, reserved on line(s)"). */
export const isApproved = (status: string): boolean => /^(approved|disetujui)\b/i.test(status.trim());

/** Answers every checklist question of the open proposal "Yes" (a select, a radio or a button, as the site draws it). */
export async function answerChecklist(dialog: Locator): Promise<number> {
  let n = 0;
  for (const sel of await dialog.locator('select').all()) {
    if ((await sel.locator('option').allInnerTexts()).map((o) => o.trim()).includes('Yes')) {
      await sel.selectOption({ label: 'Yes' });
      n += 1;
    }
  }
  for (const r of await dialog.getByRole('radio', { name: 'Yes', exact: true }).all()) {
    await r.check();
    n += 1;
  }
  if (!n) {
    for (const b of await dialog.getByRole('button', { name: 'Yes', exact: true }).all()) {
      await b.click();
      n += 1;
    }
  }
  return n;
}


/** The allocation balance of an authority's first line, as "New release" offers it ("… · balance 69.000.000"). */
export async function allocationLineBalance(page: Page, bookCode: string, authority: string): Promise<number> {
  const dialog = await releaseDialog(page, bookCode, [{ authority, requested: '1', released: '1' }]);
  const pick = dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Choose the allocation line' }) }).first();
  const label = await asOnSite(() => pick.locator('option:checked').innerText());
  await closeOpenDialogs(page);
  return amountOf(label.match(/(?:balance|saldo) ([\d.,]+)/)?.[1] ?? '');
}
