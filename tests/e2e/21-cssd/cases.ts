import { toastsAfter } from '../18-settings/helpers';
import { toastMark } from '../../../lib/assertions';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../../fixtures/e2e';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 21-cssd that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP021_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const a = master(page, 'autoclave');
  const number = code(qa, 'X-A2');
  const cycle = qa.code('X-UAP121');
  const packing = qa.code('X-POUCH');
  await qa.step(1, async () => {
    await page.goto('/en/cssd');
    await page.getByRole('complementary').last().getByRole('link', { name: 'Autoclave' }).click();
    await expect(a.main.getByRole('heading', { level: 1, name: 'Autoclave' })).toBeVisible();
    await expect(a.main.getByText('The sterilizer. Its number is stored in upper case and must be unique.', { exact: true })).toBeVisible();
    await expect(a.main.getByRole('searchbox')).toBeVisible();
    await expect(a.main.getByRole('link', { name: 'CSV' })).toBeVisible();
    await expect(a.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(a.main.getByRole('columnheader')).toHaveText(['Number', 'Name', 'Description', 'Status', 'Action']);
  });
  await qa.step(2, async () => {
    await a.main.getByRole('button', { name: 'New', exact: true }).click();
    await expect(a.dialog).toHaveAccessibleName('New');
    await expect(a.dialog.getByText('An inactive master is hidden when a new document asks for one.')).toBeVisible();
    for (const f of ['Number', 'Name', 'Description']) await expect(a.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(a.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(3, async () => {
    expect(await a.add({ code: number, name: qa.name('X Autoklaf uji') })).toContain('Saved.');
    expect((await a.cells(number))[0]).toBe(number.toUpperCase());
  });
  const cycleName = qa.name('X uap 121 C');
  await qa.step(4, async () => {
    await made(page, 'cycle', { code: cycle, name: cycleName });
    const offered = await offeredOn(page, 'cycles/new');
    expect(offered).toContain(cycleName);
  });
  await qa.step(5, async () => {
    const packingName = qa.name('X pouch');
    await made(page, 'packing', { code: packing, name: packingName });
    const offered = await offeredOn(page, 'requests/new');
    if (!offered.some((o) => o.includes(packing.toUpperCase()) || o.includes(packingName))) qa.note(5, 'the packing type is asked on a request line; the empty request offers no packing list');
  });
  await qa.step(6, async () => {
    const p = master(page, 'cycle');
    await p.edit(cycle);
    await p.dialog.getByRole('checkbox', { name: 'Active' }).uncheck();
    expect(await p.save()).toContain('Updated.');
    const offered = await offeredOn(page, 'cycles/new');
    expect(offered).not.toContain(cycleName);
  });
  await qa.step(7, async () => {
    await a.open();
    const f = await csv(page);
    qa.note(7, `CSV: ${f.lines} line(s), header "${f.header}"`);
    expect(f.lines).toBeGreaterThan(1);
  });
};

export const master = (page: Page, kind: Kind) => new Master(page, kind);

export async function made(page: Page, kind: Kind, v: { code: string; name: string; parent?: string; active?: boolean }): Promise<void> {
  expect(await master(page, kind).add(v)).toContain('Saved.');
}

/** The options of the lists on a new document, flattened. */
export async function offeredOn(page: Page, route: string): Promise<string[]> {
  await page.goto(`/en/cssd/${route}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  return page.getByRole('main').locator('option').allInnerTexts();
}

/** Clicks a "CSV" link and returns the downloaded file's first line and line count. */
export async function csv(page: Page): Promise<{ header: string; lines: number }> {
  const download = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByRole('main').getByRole('link', { name: 'CSV' }).click();
  const d = await download;
  const path = await d.path();
  const text = path ? (await import('node:fs')).readFileSync(path, 'utf8') : '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  return { header: lines[0] ?? '', lines: lines.length };
}

export const code = (qa: Qa, base: string) => qa.code(base).toLowerCase();

export type Kind = keyof typeof MASTERS;

export class Master {
  readonly main: Locator;
  readonly dialog: Locator;
  readonly m: (typeof MASTERS)[Kind];
  constructor(
    readonly page: Page,
    kind: Kind,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
    this.m = MASTERS[kind];
  }
  async open(): Promise<void> {
    await this.page.goto(`/en/cssd/${this.m.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.m.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  async row(code: string): Promise<Locator> {
    await this.open();
    await this.main.getByRole('searchbox').fill(code);
    const r = this.rows().filter({ has: this.page.getByRole('cell', { name: code.toUpperCase(), exact: true }) });
    await expect(r).toHaveCount(1);
    return r;
  }
  async cells(code: string): Promise<string[]> {
    return (await (await this.row(code)).getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** Opens "New", fills code, name and the parent list (by its code), saves; returns toasts and any text of the dialog. */
  async add(v: { code: string; name: string; parent?: string; active?: boolean }): Promise<string> {
    await this.open();
    await this.main.getByRole('button', { name: 'New', exact: true }).click();
    await this.dialog.getByRole('textbox', { name: this.m.code }).fill(v.code);
    await this.dialog.getByRole('textbox', { name: 'Name' }).fill(v.name);
    if (v.parent !== undefined) {
      const box = this.dialog.getByRole('combobox');
      if (v.parent === '') await box.selectOption({ index: 0 });
      else await box.selectOption({ label: (await box.locator('option').allInnerTexts()).find((o) => o.startsWith(v.parent!.toUpperCase()))! });
    }
    if (v.active !== undefined) await this.dialog.getByRole('checkbox', { name: 'Active' }).setChecked(v.active);
    return this.save();
  }
  async save(): Promise<string> {
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    const toasts = await toastsAfter(this.page, mark);
    const inDialog = (await this.dialog.isVisible()) ? await this.dialog.innerText() : '';
    return [...toasts, inDialog].join(' / ');
  }
  async edit(code: string): Promise<void> {
    await (await this.row(code)).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog).toBeVisible();
  }
}

export const MASTERS = {
  autoclave: { route: 'autoclaves', heading: 'Autoclave', code: 'Number' },
  cycle: { route: 'cycle-types', heading: 'Cycle Type', code: 'Code' },
  packing: { route: 'packing-types', heading: 'Packing Type', code: 'Code' },
  indicator: { route: 'indicator-types', heading: 'Indicator Type', code: 'Code' },
  test: { route: 'test-names', heading: 'Test Name', code: 'Code' },
  result: { route: 'result-types', heading: 'Result Type', code: 'Code' },
} as const;
