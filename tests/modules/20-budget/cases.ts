import { toastsAfter } from '../18-settings/helpers';
import { toastMark } from '../../../lib/assertions';
import type { Locator, Page } from '@playwright/test';
import { todayWib } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import { addMonths } from '../19-finance/helpers';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 20-budget that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP020_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP020_003 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP020_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

/** Chooses in a list: a select by the option that starts with the text, or a typed list by its option. */
export async function choose(box: Locator, text: string): Promise<void> {
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
