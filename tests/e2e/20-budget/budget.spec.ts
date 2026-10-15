import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields, toastsAfter } from '../18-settings/helpers';
import { addMonths } from '../19-finance/helpers';
import { payrollEmployee } from '../17-payroll/helpers';

/**
 * 20-budget.xlsx: the masters (books, heads, chart, utilisation types,
 * projects, sanction checklist) and the screen checks. Codes and names carry
 * a token. The default book of the tenant is never moved: steps that would
 * make a test book the default are only run when another book already is.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

class Master {
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
    await this.page.goto(`/en/budget/${this.route}`);
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

/** Chooses in a list: a select by the option that starts with the text, or a typed list by its option. */
async function choose(box: Locator, text: string): Promise<void> {
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    const label = (await box.locator('option').allInnerTexts()).find((o) => o.startsWith(text) || o.includes(text));
    if (!label) throw new Error(`no option "${text}"`);
    await box.selectOption({ label });
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

const books = (p: Page) => new Master(p, 'books', 'Budget books', 'New book');
const heads = (p: Page) => new Master(p, 'heads', 'Budget heads', 'New head');
const types = (p: Page) => new Master(p, 'util-types', 'Utilisation types', 'Add type');
const projects = (p: Page) => new Master(p, 'projects', 'Projects', 'Add project');
const questions = (p: Page) => new Master(p, 'sanction-checklists', 'Sanction checklist', 'New question');
const chart = (p: Page) => new Master(p, 'chart', 'Budget chart', 'Add head');

async function book(page: Page, qa: Qa, extra: Record<string, string | boolean> = {}): Promise<{ code: string; name: string }> {
  const b = { code: qa.code('X-OPS'), name: qa.name('X Buku operasional uji') };
  expect(await books(page).add({ Code: b.code, 'Book name': b.name, 'Sponsor / scheme name': qa.prefix('X BLUD'), ...extra })).toContain('Budget book created');
  return b;
}

const YEAR = todayWib().slice(0, 4);

async function head(page: Page, qa: Qa, base = 'X-OBAT', name = 'X Belanja obat uji', type = 'Operating'): Promise<{ code: string; name: string }> {
  const h = { code: qa.code(base), name: qa.name(name) };
  expect(await heads(page).add({ Code: h.code, 'Head name': h.name, 'Spending type': type, 'Financial year': YEAR })).toContain('Budget head created');
  return h;
}

qaTest('TC-APP020-001', async ({ page, qa }) => {
  const b = books(page);
  const code = qa.code('X-OPS');
  const name = qa.name('X Buku operasional uji');
  await qa.step(1, async () => {
    await page.goto('/en/budget');
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
    await page.goto('/en/budget/circulars');
    await page.getByRole('main').getByRole('button', { name: /New circular/ }).click();
    const options = await page.getByRole('dialog').getByRole('combobox', { name: 'Budget book' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.startsWith(code))).toBe(true);
  });
});

qaTest('TC-APP020-002', async ({ page, qa }) => {
  const b = books(page);
  const mine = await book(page, qa);
  await qa.step(1, async () => {
    await b.openAdd();
    await b.fill({ Code: mine.code, 'Book name': qa.name('X Buku operasional uji'), 'Sponsor / scheme name': qa.prefix('X BLUD') });
    expect(await b.saveText()).toContain('That book code is already used.');
  });
  await qa.step(2, async () => {
    await b.open();
    const marked = (await b.main.getByRole('table').innerText()).includes('Default');
    if (!marked) {
      qa.notRun(2, 'the list marks no default book; ticking "Default book" on a test book would make it the tenant\'s default');
      return;
    }
    await b.edit(mine.code);
    await b.fill({ 'Default book': true });
    const text = await b.saveText();
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Budget book updated');
  });
  await qa.step(3, async () => {
    await b.edit(mine.code);
    await b.fill({ Active: false });
    if (await b.dialog.getByRole('checkbox', { name: 'Default book' }).isDisabled()) {
      qa.note(3, '"Default book" cannot be ticked once "Active" is cleared (disabled), so an inactive book cannot become the default');
      return;
    }
    await b.fill({ 'Default book': true });
    const text = await b.saveText();
    if (text.includes('Budget book updated')) {
      qa.deviation(3, 'The text "An inactive book cannot be the default."', 'saved');
      await b.edit(mine.code);
      await b.fill({ 'Default book': false });
      await b.save();
    } else expect(text).toContain('An inactive book cannot be the default.');
  });
  await qa.step(4, async () => {
    await b.edit(mine.code);
    const buttons = (await b.dialog.getByRole('button').allInnerTexts()).map((x) => x.trim());
    expect(buttons.some((x) => /delete/i.test(x))).toBe(false);
  });
});

qaTest('TC-APP020-003', async ({ page, qa }) => {
  const h = heads(page);
  const alkes = { code: qa.code('X-ALKES'), name: qa.name('X Belanja alkes uji') };
  await qa.step(1, async () => {
    await page.goto('/en/budget');
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
    expect(years.some((y) => /\(locked\)$/.test(y))).toBe(true);
  });
  await qa.step(4, async () => {
    await h.fill({ Code: alkes.code, 'Head name': alkes.name, 'Spending type': 'Capital', 'Financial year': YEAR });
    expect(await h.save()).toContain('Budget head created');
    const c = await h.cells(alkes.code);
    expect(c.slice(0, 4)).toEqual([alkes.code, alkes.name, 'Capital (Belanja Modal)', YEAR]);
  });
  await qa.step(5, async () => {
    await head(page, qa);
  });
});

qaTest('TC-APP020-004', async ({ page, qa }) => {
  const h = heads(page);
  const alkes = await head(page, qa, 'X-ALKES', 'X Belanja alkes uji', 'Capital');
  await qa.step(1, async () => {
    await h.openAdd();
    await h.fill({ Code: alkes.code, 'Head name': qa.name('X Belanja alkes uji'), 'Financial year': YEAR });
    expect(await h.saveText()).toContain('That head code is already used.');
  });
  await qa.step(2, async () => {
    await h.openAdd();
    const box = h.dialog.getByRole('combobox', { name: 'Financial year' });
    const locked = (await box.locator('option').allInnerTexts()).find((o) => o.endsWith('(locked)'))!;
    const disabled = await box.locator('option', { hasText: locked }).isDisabled();
    if (disabled) {
      qa.note(2, `"${locked}" cannot be chosen (the option is disabled)`);
      return;
    }
    await h.fill({ Code: qa.code('X-ALKES'), 'Head name': qa.name('X Belanja alkes uji') });
    await box.selectOption({ label: locked });
    const text = await h.saveText();
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Budget head created');
    expect(text).toMatch(/locked/i);
  });
  qa.notRun(3, 'needs a year removed or renamed in Finance while the dialog is open; Finance can neither change nor delete a year (TC-APP019-021)');
});

qaTest('TC-APP020-007', async ({ page, qa }) => {
  const t = types(page);
  const code = qa.code('X-JASA');
  await qa.step(1, async () => {
    await page.goto('/en/budget');
    await page.getByRole('main').getByRole('link', { name: 'Utilisation types' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Utilisation types' })).toBeVisible();
    await expect(t.main.getByText('Classify utilisation lines and the taxes they carry. PPN and PPh may apply together.', { exact: true })).toBeVisible();
    await expect(t.main.getByRole('columnheader')).toHaveText(['Code', 'Description', 'Tax codes', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await t.main.getByRole('button', { name: 'Add type' }).click();
    await expect(t.dialog).toHaveAccessibleName('New utilisation type');
    await expect(t.dialog.getByText('Code, description, and remarks are required.')).toBeVisible();
    for (const f of ['Code', 'Description', 'Remarks']) await expect(t.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(t.dialog.getByRole('group', { name: 'Tax codes' }).getByRole('checkbox').first()).toBeVisible();
  });
  await qa.step(3, async () => {
    await t.fill({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') });
    for (const c of ['PPN · ', 'PPH · ']) await t.dialog.getByRole('checkbox', { name: new RegExp(`^${c}`) }).check();
    expect(await t.save()).toContain('Utilisation type created.');
    const c = await t.cells(code);
    expect(c[2]).toMatch(/PPN/);
    expect(c[2]).toMatch(/PPH/);
  });
  await qa.step(4, async () => {
    await t.edit(code);
    await t.dialog.getByRole('checkbox', { name: /^PPH · / }).uncheck();
    expect(await t.save()).toContain('Utilisation type updated.');
  });
});

qaTest('TC-APP020-008', async ({ page, qa }) => {
  const t = types(page);
  const code = qa.code('X-JASA');
  expect(await t.add({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') })).toContain('Utilisation type created.');
  await qa.step(1, async () => {
    await t.openAdd();
    await t.fill({ Code: code, Description: qa.name('X Belanja jasa uji'), Remarks: qa.prefix('X uji') });
    expect(await t.saveText()).toContain('This code already exists.');
  });
  await qa.step(2, async () => {
    await t.openAdd();
    await t.fill({ Code: qa.code('X-JASA'), Description: qa.name('X Belanja jasa uji') });
    const text = await t.saveText();
    const invalid = await invalidFields(t.dialog);
    expect(text).not.toContain('Utilisation type created.');
    qa.note(2, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 120)}"`);
  });
  qa.notRun(3, 'needs a tax code set inactive in Settings while the dialog is open (two windows at once)');
});

qaTest('TC-APP020-009', async ({ page, qa }) => {
  const p = projects(page);
  const b = await book(page, qa);
  const emp = await payrollEmployee(page, qa, HR.emp1);
  const name = qa.name('X Proyek uji');
  const end = addMonths(todayWib(), 3);
  await qa.step(1, async () => {
    await page.goto('/en/budget');
    await page.getByRole('main').getByRole('link', { name: 'Projects' }).click();
    await expect(p.main.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(p.main.getByRole('button', { name: 'Add project' })).toBeVisible();
    await expect(p.main.getByRole('columnheader')).toHaveText(['Name', 'Type', 'Period', 'Employee', 'Budget books', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Add project' }).click();
    await expect(p.dialog).toHaveAccessibleName('New project');
    for (const f of ['Project name', 'Start date', 'End date', 'Remarks']) await expect(p.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(p.dialog.getByRole('combobox', { name: 'Type' }).locator('option')).toHaveText(['Extramural', 'Intramural']);
    await expect(p.dialog.getByRole('combobox', { name: 'Employee' })).toBeVisible();
    await expect(p.dialog.getByRole('group', { name: 'Budget books' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await p.fill({ 'Project name': name, Type: 'Intramural', 'Start date': todayWib(), 'End date': end, Employee: emp.no });
    await p.dialog.getByRole('checkbox', { name: new RegExp(`^${b.code} · `) }).check();
    expect(await p.save()).toContain('Project created.');
    const c = await p.cells(name);
    qa.note(3, `row: ${c.join(' | ')}`);
    expect(c[1]).toBe('Intramural');
    expect(c.join(' ')).toContain(b.code);
  });
  await qa.step(4, async () => {
    const c = chart(page);
    await c.open();
    await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
    qa.note(4, 'attaching is run in TC-APP020-005 (the chart needs a head first)');
  });
});

qaTest('TC-APP020-010', async ({ page, qa }) => {
  const p = projects(page);
  const name = qa.name('X Proyek uji');
  expect(await p.add({ 'Project name': name, Type: 'Intramural', 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) })).toContain('Project created.');
  await qa.step(1, async () => {
    await p.openAdd();
    await p.fill({ 'Project name': qa.name('X Proyek uji'), 'Start date': todayWib(), 'End date': addDays(todayWib(), -5) });
    expect(await p.saveText()).toContain('The end date is before the start date.');
  });
  await qa.step(2, async () => {
    await p.openAdd();
    await p.fill({ 'Project name': name, 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) });
    expect(await p.saveText()).toContain('A project with this name already exists.');
  });
  qa.notRun(3, 'run with the chart in TC-APP020-006');
  qa.notRun(4, 'needs an employee removed in HR while the dialog is open (two windows at once)');
});

qaTest('TC-APP020-011', async ({ page, qa }) => {
  const q = questions(page);
  const b = await book(page, qa);
  const question = qa.name('X Apakah TOR sudah dilampirkan?');
  await qa.step(1, async () => {
    await page.goto('/en/budget');
    await page.getByRole('main').getByRole('link', { name: 'Sanction checklist' }).click();
    await expect(q.main.getByRole('heading', { level: 1, name: 'Sanction checklist' })).toBeVisible();
    await expect(q.main.getByRole('combobox', { name: 'Book' })).toBeVisible();
    await expect(q.main.getByRole('columnheader')).toHaveText(['Book', 'Order', 'Question', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await q.main.getByRole('button', { name: 'New question' }).click();
    await expect(q.dialog).toHaveAccessibleName('New checklist question');
    await expect(q.dialog.getByText('Proposals must answer every active question of their book before they are sent.')).toBeVisible();
    await expect(q.dialog.getByRole('combobox', { name: 'Budget book' })).toBeVisible();
    await expect(q.dialog.getByRole('spinbutton', { name: 'Order' })).toBeVisible();
    await expect(q.dialog.getByRole('textbox', { name: 'Question' })).toBeVisible();
    await expect(q.dialog.getByRole('checkbox', { name: 'Active (asked of new proposals)' })).toBeChecked();
  });
  await qa.step(3, async () => {
    await q.fill({ 'Budget book': b.code, Order: '1', Question: question });
    expect(await q.save()).toContain('Question added.');
    const c = await q.cells(question);
    expect(c.slice(0, 3)).toEqual([b.code, '1', question]);
  });
  await qa.step(4, async () => {
    await page.goto('/en/budget/sanctions');
    await page.getByRole('main').getByRole('button', { name: /New proposal/ }).click();
    const d = page.getByRole('dialog');
    await choose(d.getByRole('combobox', { name: /Budget book|Book/ }).first(), b.code);
    await expect(d.getByText(question)).toBeVisible();
  });
});

qaTest('TC-APP020-012', async ({ page, qa }) => {
  const q = questions(page);
  const b = await book(page, qa);
  const question = qa.name('X Apakah TOR sudah dilampirkan?');
  expect(await q.add({ 'Budget book': b.code, Order: '1', Question: question })).toContain('Question added.');
  await qa.step(1, async () => {
    await q.openAdd();
    await q.fill({ 'Budget book': b.code, Order: '2', Question: question });
    expect(await q.saveText()).toContain('This book already asks this question.');
  });
  await qa.step(2, async () => {
    await q.openAdd();
    await q.fill({ 'Budget book': b.code, Order: '3' });
    const text = await q.saveText();
    const invalid = await invalidFields(q.dialog);
    expect(text).not.toContain('Question added.');
    qa.note(2, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `"${text.slice(0, 120)}"`);
  });
  await qa.step(3, async () => {
    const off = await book(page, qa, { Active: false });
    await q.openAdd();
    const offered = (await q.dialog.getByRole('combobox', { name: 'Budget book' }).locator('option').allInnerTexts()).some((o) => o.startsWith(off.code));
    if (!offered) {
      qa.note(3, 'the inactive book is not offered');
      return;
    }
    await q.fill({ 'Budget book': off.code, Question: qa.name('X Apakah TOR sudah dilampirkan?') });
    expect(await q.saveText()).toContain('The budget book is inactive.');
  });
});

/** Adds a head to the chart of a book; returns the toasts and dialog text. */
async function addToChart(page: Page, b: { code: string; name: string }, h: string, opts: { parent?: string; group?: boolean } = {}): Promise<string> {
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

async function chartRow(page: Page, b: { code: string; name: string }, h: string): Promise<Locator> {
  const c = chart(page);
  await c.open();
  await c.main.getByRole('combobox', { name: 'Book' }).selectOption({ label: `${b.code} · ${b.name}` });
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = c.rows().filter({ hasText: h }).first();
  await expect(row).toBeVisible();
  return row;
}

/** Deactivates a head of the chart (Edit, clear "Active", Save); returns the toasts and text shown. */
async function deactivate(page: Page, b: { code: string; name: string }, h: string): Promise<string> {
  const c = chart(page);
  await (await chartRow(page, b, h)).getByRole('button', { name: 'Edit' }).click();
  await c.dialog.getByRole('checkbox', { name: 'Active' }).uncheck();
  return c.saveText();
}

qaTest('TC-APP020-005', async ({ page, qa }) => {
  const c = chart(page);
  const b = await book(page, qa);
  const grp = await head(page, qa);
  const child = await head(page, qa, 'X-OBAT', 'X Belanja obat uji anak');
  const proj = qa.name('X Proyek uji');
  expect(await projects(page).add({ 'Project name': proj, Type: 'Intramural', 'Start date': todayWib(), 'End date': addMonths(todayWib(), 3) })).toContain('Project created.');
  await qa.step(1, async () => {
    await page.goto('/en/budget');
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
});

qaTest('TC-APP020-006', async ({ page, qa }) => {
  const b = await book(page, qa);
  const grp = await head(page, qa);
  const child = await head(page, qa, 'X-OBAT', 'X Belanja obat uji anak');
  const leaf = await head(page, qa, 'X-ALKES', 'X Belanja alkes uji', 'Capital');
  expect(await addToChart(page, b, grp.code, { group: true })).toContain('Head added to the chart.');
  expect(await addToChart(page, b, child.code, { parent: grp.code })).toContain('Head added to the chart.');
  expect(await addToChart(page, b, leaf.code)).toContain('Head added to the chart.');
  await qa.step(1, async () => {
    expect(await addToChart(page, b, grp.code)).toContain("This head is already in this book's chart.");
  });
  await qa.step(2, async () => {
    const other = await head(page, qa, 'X-OBAT', 'X Belanja obat uji dua');
    const text = await addToChart(page, b, other.code, { parent: leaf.code }).catch((e) => `not offered: ${String(e).slice(0, 60)}`);
    qa.note(2, `"${text.slice(0, 160)}"`);
    expect(text).not.toContain('Head added to the chart.');
  });
  await qa.step(3, async () => {
    const row = await chartRow(page, b, grp.code);
    await row.getByRole('button', { name: 'Edit' }).click();
    await chart(page).dialog.getByRole('checkbox', { name: 'Group (can hold child heads)' }).uncheck();
    expect(await chart(page).saveText()).toContain('A head with children must stay a group.');
  });
  await qa.step(4, async () => {
    expect(await deactivate(page, b, grp.code)).toContain('This head has active children. Deactivate the children first.');
  });
  qa.notRun(5, 'attaching projects: see TC-APP020-005 step 5');
  qa.notRun(6, 'see step 5');
});

qaTest('TC-APP020-042', async ({ qa }) => {
  for (const s of [1, 2, 3, 4, 5]) qa.notRun(s, 'TBD with the product owner; needs a budget line with a balance (allocation needs U5)');
});

const SCREENS: [string, string, string][] = [
  ['TC-APP020-046', '/budget', 'Budget'],
  ['TC-APP020-047', '/budget/allocations', 'Budget allocation'],
  ['TC-APP020-048', '/budget/books', 'Budget books'],
  ['TC-APP020-049', '/budget/chart', 'Budget chart'],
  ['TC-APP020-050', '/budget/circulars', 'Budget circulars'],
  ['TC-APP020-051', '/budget/fund-releases', 'Fund release'],
  ['TC-APP020-052', '/budget/fund-withdrawals', 'Fund withdrawal'],
  ['TC-APP020-053', '/budget/heads', 'Budget heads'],
  ['TC-APP020-054', '/budget/internal-budgets', 'Internal budgets'],
  ['TC-APP020-055', '/budget/projects', 'Projects'],
  ['TC-APP020-056', '/budget/requests', 'Budget requests'],
  ['TC-APP020-057', '/budget/sanction-checklists', 'Sanction checklist'],
  ['TC-APP020-058', '/budget/sanctions', 'Sanction proposals'],
  ['TC-APP020-059', '/budget/transfers', 'Budget transfer'],
  ['TC-APP020-060', '/budget/util-types', 'Utilisation types'],
  ['TC-APP020-061', '/budget/utilisations', 'Budget utilisation'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
