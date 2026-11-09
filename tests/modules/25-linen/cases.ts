import { Desk, SAVED } from '../shared/desk';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 25-linen that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP025_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const s = stores(page);
  await qa.step(1, async () => {
    await page.goto('/id/linen');
    await page.getByRole('main').getByRole('link', { name: 'Stores and recipe' }).click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Stores and recipe' })).toBeVisible();
    await expect(s.main.getByRole('button', { name: 'Save stores' })).toBeVisible();
    await expect(s.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'Save stores' }).click();
    await expect(s.dialog).toHaveAccessibleName('Stores and recipe');
    for (const f of [...Object.keys(STORES), 'Finished item', 'Quantity']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(s.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save stores', 'Save recipe']);
  });
  await qa.step(3, async () => {
    expect(await s.save(STORES)).toContain(SAVED);
    qa.note(3, 'the stores of the branch (GLB, LDR, GST) are saved again: the workbook\'s "X Gudang linen", "X Laundry" and "X Gudang bangsal" are not in Inventory');
    expect((await s.list()).some((r) => r[1].includes('GLB / LDR / GST'))).toBe(true);
  });
  const it = await linenItems(page, qa);
  qa.note(4, `items of the test in Inventory: finished ${it.finished}, component ${it.component} (100 in GLB, batch ${it.componentBatch})`);
  await qa.step(4, async () => {
    expect(await saveRecipe(page, it)).toContain(SAVED);
    const rows = await s.list(it.finished);
    const row = rows.filter((r) => r.join(' ').includes(it.finished)).map((r) => r.join(' | '));
    if (!row.length) qa.deviation(4, 'A row for the recipe', `toast "Saved."; no row of the list names ${it.finished}`);
    else qa.note(4, `recipe row: ${row.join(' ; ')}`);
  });
  await qa.step(5, async () => {
    const second = qa.bed('X-BENANG');
    const toasts = await stores(page).save({ 'Finished item': it.finished, 'Component / linen store': second, Quantity: '1' }, 'Save recipe');
    qa.note(5, `a second component (${second}, not in Inventory) for ${it.finished}: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
};

export const STORES = { 'Component / linen store': 'GLB', 'Contractor / laundry': 'LDR', 'Sterile / ward store': 'GST' };

export const stores = (p: Page) => new Desk(p, '/linen/stores', 'Stores and recipe', 'Save stores');


// ------------------------------------------------------------------ the items of a test in Inventory

/**
 * Checklist blocker 14 named the items of Linen (the finished item "X-SPREI", its component "X-KAIN" and their
 * stock in the linen store) as records of Inventory the site lacks. Since 2026-11-01 the tests make them in
 * Inventory themselves: two batch-tracked items (codes that sort first: the item lists show the first ones only,
 * found blocker 40) and a batch of the component in the linen store GLB.
 */
export interface LinenItems { finished: string; component: string; componentBatch: string }

/** The store names of the branch in Inventory, by code. */
export const STORE_NAME: Record<string, string> = { GLB: 'Gudang Linen Bersih', LDR: 'Laundry', GST: 'Gudang Steril' };

/** Adds a batch of an item to a store in Item Master. */
export async function addStock(page: Page, code: string, store: string, batch: string, quantity: string, expiry = addDays(todayWib(), 365)): Promise<void> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openEdit({ code });
  const mark = await toastMark(page);
  await items.addBatch(d, { store: STORE_NAME[store] ?? store, batch, expiry, quantity });
  await expect.poll(() => toastsSince(page, mark)).toContain('Batch quantity added.');
}

/** The two items of a test and `componentQty` of the component in GLB. */
export async function linenItems(page: Page, qa: Qa, componentQty = '100'): Promise<LinenItems> {
  const items = new ItemMasterPage(page);
  const it = { finished: qa.bed('X-SPREI'), component: qa.bed('X-KAIN'), componentBatch: qa.code('X-KAIN-B') };
  for (const [code, name] of [[it.finished, qa.name('X Sprei uji')], [it.component, qa.name('X Kain uji')]]) {
    await items.open();
    const d = await items.openAdd();
    await items.fill(d, { code, name, lastCost: '25000', batchTracked: true });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    await expect.poll(() => toastsSince(page, mark)).toContain('Item added.');
  }
  await addStock(page, it.component, 'GLB', it.componentBatch, componentQty);
  return it;
}

/** The recipe of the finished item: `quantity` of the component per piece. */
export async function saveRecipe(page: Page, it: LinenItems, quantity = '2.5'): Promise<string[]> {
  return stores(page).save({ 'Finished item': it.finished, 'Component / linen store': it.component, Quantity: quantity }, 'Save recipe');
}

/** The stock of an item by store and batch ("GLB X-B-1" -> 75), from "Stock on hand" of Item Master. */
export async function stockIn(page: Page, code: string): Promise<Map<string, number>> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openEdit({ code });
  const lines = d.getByText('Stock on hand', { exact: true }).locator('xpath=..').getByRole('listitem');
  await lines.first().waitFor({ timeout: 10_000 }).catch(() => {});
  const out = new Map<string, number>();
  for (const line of await lines.allInnerTexts()) {
    const m = line.replace(/\s+/g, ' ').match(/^(\S+) · (\S+) (-?[\d.,]+) · \d{4}-\d{2}-\d{2}$/);
    if (m) out.set(`${m[1]} ${m[2]}`, Number(m[3].replace(/,/g, '')));
  }
  return out;
}

// The work order list shows only its first ~20 rows by number, with no paging (found blocker 40): order numbers use qa.bed so they sort first.
export const orders = (p: Page) => new Desk(p, '/linen/orders', 'Work orders', 'Save order');
export const moves = (p: Page) => new Desk(p, '/linen/moves', 'Circulation', 'Clean issue');

/** A work order of the test for `quantity` finished pieces, saved, sent, approved (on the component batch) and received; returns its ids. */
export async function finishedLinen(page: Page, qa: Qa, it: LinenItems, quantity = '10'): Promise<{ order: string; receipt: string; batch: string }> {
  const o = orders(page);
  const order = (await o.create({ Number: qa.bed('X-WO-001'), 'Contractor / laundry': qa.prefix('X Konveksi uji'), 'Finished item': it.finished, Quantity: quantity })).id;
  expect(order, 'the work order of the test is saved').toBeTruthy();
  expect(await o.save({ Document: order }, 'Send order')).toContain(SAVED);
  expect(await o.save({ Batch: it.componentBatch, Document: order }, 'Approve order')).toContain(SAVED);
  const batch = qa.code('X-SPREI-B');
  const r = await o.create({ Batch: batch, Expiry: addDays(todayWib(), 730), Quantity: quantity, Document: order }, 'Receive finished');
  expect(r.toasts).toContain(SAVED);
  return { order, receipt: r.id, batch };
}

// ------------------------------------------------------------------ cases the chains run too (E2E-016, E2E-047)

export const ORDER = (qa: Qa, extra: Record<string, string> = {}) => ({
  Number: qa.bed('X-WO-001'),
  'Contractor / laundry': qa.prefix('X Konveksi uji'),
  'Finished item': qa.code('X-SPREI'),
  Quantity: '10',
  ...extra,
});


/**
 * One round of a batch through the stores (TC-APP025-008 and 012): clean issue, ward receipt, soiled issue,
 * laundry receipt, washed issue and linen receipt, 4 pieces each. Makes its own items and batch when none is given.
 * Returns a note per step of TC-APP025-008 (3 to 7) and the first step that was not saved.
 */
export async function round(page: Page, qa: Qa, given?: LinenItems, givenBatch?: string, after?: (label: string) => Promise<void>): Promise<{ steps: [number, string][]; failed: string }> {
  const m = moves(page);
  const it = given ?? (await linenItems(page, qa));
  let batch = givenBatch ?? '';
  if (!given) {
    expect(await saveRecipe(page, it)).toContain(SAVED);
    batch = (await finishedLinen(page, qa, it, '10')).batch;
  }
  const v = { 'Finished item': it.finished, Batch: batch, Quantity: '4' };
  const steps: [number, string][] = [];
  let failed = '';
  const stock = async () => {
    const s = await stockIn(page, it.finished);
    return `GLB ${s.get(`GLB ${batch}`) ?? 0}, GST ${s.get(`GST ${batch}`) ?? 0}, LDR ${s.get(`LDR ${batch}`) ?? 0}`;
  };
  const act = async (step: number, label: string, run: () => Promise<{ toasts: string[]; id?: string }>) => {
    const r = await run();
    if (!r.toasts.includes(SAVED) && !failed) failed = `${label}: "${r.toasts.join(' / ')}"`;
    steps.push([step, `${label}: "${r.toasts.join(' / ')}"; ${await stock()}`]);
    await after?.(label);
    return r.id ?? '';
  };
  const clean = await act(3, 'clean issue', () => m.create(v));
  await act(4, 'ward receipt', async () => ({ toasts: await m.save({ Document: clean, 'Sterile / ward store': 'GST' }, 'Ward receipt') }));
  const soiled = await act(5, 'soiled issue', () => m.create({ ...v, 'Sterile / ward store': 'GST' }, 'Soiled issue'));
  await act(6, 'laundry receipt', async () => ({ toasts: await m.save({ Document: soiled }, 'Laundry receipt') }));
  const washed = await act(7, 'washed issue', () => m.create(v, 'Washed issue'));
  await act(7, 'linen receipt', async () => ({ toasts: await m.save({ Document: washed }, 'Linen receipt') }));
  return { steps, failed };
}


/** TC-APP025-004: a work order made, sent, approved, received and charged (E2E-016 step 2). */
export const TC_APP025_004 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const o = orders(page);
  await qa.step(1, async () => {
    await page.goto('/id/linen');
    await page.getByRole('main').getByRole('link', { name: 'Work orders' }).click();
    await expect(o.main.getByRole('heading', { level: 1, name: 'Work orders' })).toBeVisible();
    await expect(o.main.getByRole('button', { name: 'Save order' })).toBeVisible();
    await expect(o.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await o.main.getByRole('button', { name: 'Save order' }).click();
    await expect(o.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/^1\s*Details$/, /^2\s*Review$/]);
    for (const f of ['Number', 'Contractor / laundry', 'Finished item', 'Document']) await expect(o.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(o.dialog.getByRole('button', { name: 'Back' })).toBeDisabled();
  });
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  let order = '';
  let receipt = '';
  const batch = qa.code('X-SPREI-B');
  await qa.step(3, async () => {
    const r = await o.create({ Number: qa.bed('X-WO-001'), 'Contractor / laundry': qa.prefix('X Konveksi uji'), 'Finished item': it.finished, Quantity: '10' });
    order = r.id;
    expect(r.toasts).toContain(SAVED);
    expect(await o.status(order)).toMatch(/draft/i);
  });
  await qa.step(4, async () => {
    expect(await o.save({ Document: order }, 'Send order')).toContain(SAVED);
    expect(await o.status(order)).toMatch(/sent/i);
  });
  await qa.step(5, async () => {
    expect(await o.save({ Batch: it.componentBatch, Document: order }, 'Approve order')).toContain(SAVED);
    expect(await o.status(order)).toMatch(/approved/i);
    const left = (await stockIn(page, it.component)).get(`GLB ${it.componentBatch}`);
    qa.note(5, `component ${it.component} in GLB: 100 before, ${left} after`);
    expect(left).toBe(75);
  });
  await qa.step(6, async () => {
    const r = await o.create({ Batch: batch, Expiry: addDays(todayWib(), 730), Quantity: '10', Document: order }, 'Receive finished');
    receipt = r.id;
    expect(r.toasts).toContain(SAVED);
    const got = (await stockIn(page, it.finished)).get(`GLB ${batch}`);
    qa.note(6, `receipt ${receipt}; finished ${it.finished} in GLB: ${got} of batch ${batch}`);
    expect(got).toBe(10);
  });
  await qa.step(7, async () => {
    const toasts = await o.save({ Document: receipt, Amount: '750000' }, 'Charge');
    expect(toasts).toContain(SAVED);
    qa.note(7, `Charge 750000 for ${receipt}: "${toasts.join(' / ')}" (TBD in the workbook: the voucher in Finance)`);
  });
};

/** TC-APP025-008: a round of circulation (E2E-016 step 3, E2E-047 step 2). */
export const TC_APP025_008 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const m = moves(page);
  await qa.step(1, async () => {
    await page.goto('/id/linen');
    await page.getByRole('main').getByRole('link', { name: 'Circulation' }).click();
    await expect(m.main.getByRole('heading', { level: 1, name: 'Circulation' })).toBeVisible();
    await expect(m.main.getByRole('button', { name: 'Clean issue' })).toBeVisible();
    await expect(m.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await m.main.getByRole('button', { name: 'Clean issue' }).click();
    for (const f of ['Finished item', 'Batch', 'Sterile / ward store', 'Document', 'Quantity']) await expect(m.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(m.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Clean issue', 'Ward receipt', 'Soiled issue', 'Laundry receipt', 'Washed issue', 'Linen receipt']);
  });
  await page.keyboard.press('Escape');
  const r = await round(page, qa);
  for (const [s, text] of r.steps) await qa.step(s, async () => {
    qa.note(s, text);
  });
  expect(r.failed, r.failed).toBe('');
};

/** TC-APP025-012: the stock of a batch over a full round (E2E-016 step 4). */
export const TC_APP025_012 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const f = await finishedLinen(page, qa, it, '10');
  const where = async () => {
    const s = await stockIn(page, it.finished);
    return ['GLB', 'GST', 'LDR'].map((st) => s.get(`${st} ${f.batch}`) ?? 0);
  };
  let start: number[] = [];
  await qa.step(1, async () => {
    start = await where();
    qa.note(1, `GLB, GST, LDR: ${start.join(', ')}`);
    expect(start).toEqual([10, 0, 0]);
  });
  await qa.step(2, async () => {
    const r = await round(page, qa, it, f.batch, async (label) => qa.note(3, `after ${label}: GLB, GST, LDR ${(await where()).join(', ')}`));
    expect(r.failed, r.failed).toBe('');
  });
  await qa.step(3, async () => {
    qa.note(3, 'the stock after each step is in the notes of step 3 above');
  });
  await qa.step(4, async () => {
    await page.goto('/id/inventory/ledger');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = (await page.getByRole('main').innerText()).replace(/\s+/g, ' ');
    qa.note(4, `Stock book ${text.includes(f.batch) ? 'names' : 'does not name'} the batch ${f.batch} on its first page (TBD in the workbook: six entries naming Linen)`);
  });
  await qa.step(5, async () => {
    const end = await where();
    qa.note(5, `GLB, GST, LDR at the end: ${end.join(', ')}`);
    expect(end.reduce((a, b) => a + b, 0)).toBe(start.reduce((a, b) => a + b, 0));
  });
};
