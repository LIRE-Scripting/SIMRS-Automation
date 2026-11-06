import { NotOffered } from '../../../lib/not-offered';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { createAccount, account } from '../19-finance/helpers';
import { Desk, SAVED } from '../shared/desk';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 27-fixed-assets that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP027_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const m = masters(page);
  const cat = qa.code('X-ALKES');
  const sub = qa.code('X-USG');
  const ACCOUNT = await assetAccount(page, qa);
  qa.note(4, `asset account ${ACCOUNT}, a test leaf of Finance (1501 is not in the chart of accounts)`);
  await qa.step(1, async () => {
    await page.goto('/id/fixed-assets');
    await page.getByRole('main').getByRole('link', { name: 'Classification' }).click();
    await expect(m.main.getByRole('heading', { level: 1, name: 'Classification' })).toBeVisible();
    await expect(m.main.getByRole('button', { name: 'Category', exact: true })).toBeVisible();
    await expect(m.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await m.main.getByRole('button', { name: 'Category', exact: true }).click();
    for (const f of ['Code', CH, AI]) await expect(m.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(m.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Category', 'Sub category', 'Deactivate']);
  });
  await qa.step(3, async () => {
    expect(await m.save({ Code: cat, [CH]: qa.name('X Alat kesehatan uji') })).toContain(SAVED);
  });
  let listed = true;
  await qa.step(4, async () => {
    expect(await m.save({ Code: sub, [CH]: cat, [AI]: ACCOUNT }, 'Sub category')).toContain(SAVED);
    const rows = await m.list();
    const row = rows.find((r) => r[1].includes(ACCOUNT) && r[0] === 'active');
    listed = !!row;
    // The desk lists hold only their first records (found blocker 40): a sub category saved now is often not listed.
    if (!row) qa.note(4, `the sub category ${sub} is saved but not among the ${rows.length} rows the list shows (found blocker 40)`);
    else qa.note(4, `rows show the name and the account only (e.g. "${row.join(' | ')}")`);
  });
  await qa.step(5, async () => {
    const before = (await m.list()).filter((r) => r[0] === 'active').length;
    expect(await m.save({ Code: sub }, 'Deactivate')).toContain(SAVED);
    const after = (await m.list()).filter((r) => r[0] === 'active').length;
    if (listed) expect(after).toBe(before - 1);
    else qa.note(5, 'the sub category is not listed (step 4), so its deactivation cannot be read on the list');
  });
  await qa.step(6, async () => {
    const rows = await m.list();
    qa.note(6, `${rows.length} row(s); the category "${cat}" is ${rows.some((r) => r[1].includes(cat)) ? '' : 'not '}listed`);
  });
};

export const TC_APP027_003 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const r = register(page);
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/fixed-assets');
    await page.getByRole('main').getByRole('link', { name: 'Register' }).click();
    await expect(r.main.getByRole('heading', { level: 1, name: 'Register' })).toBeVisible();
    for (const b of ['Buy', 'Find asset number']) await expect(r.main.getByRole('button', { name: b })).toBeVisible();
    await expect(r.main.getByRole('columnheader')).toHaveText(['Code', 'Status', 'Holder', '']);
  });
  await qa.step(2, async () => {
    await r.main.getByRole('button', { name: 'Buy' }).click();
    await expect(r.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/^1\s*Details$/, /^2\s*Review$/]);
    for (const f of ['Number', 'Code', CH, AI, 'Document', SLR]) await expect(r.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  let listed = true;
  // The item of the test in Inventory (a batch of 5 in the general store) and a sub category (checklist blocker 14 until 2026-11-01).
  const item = await assetItem(page, qa);
  const sub = await subCategory(page, qa);
  qa.note(3, `item ${item.code} with batch ${item.batch} (5) in ${ASSET_STORE.code}; sub category ${sub}`);
  let a: Asset | null = null;
  await qa.step(3, async () => {
    a = await commissionedAsset(page, qa, 'buy', { item, sub });
    no = a.no;
    listed = (await registerRows(page, no)).some((x) => x[0] === no);
    if (!listed) qa.note(3, `${no} is bought ("Saved."), but "Find asset number" does not show it`);
  });
  await qa.step(4, async () => {
    const toasts = await register(page).save({ Code: no, [CH]: sub, [SLR]: a!.serial, Store: ASSET_STORE.code, Batch: item.batch, Quantity: '1', Document: a!.id }, 'Install');
    expect(toasts).toContain(SAVED);
    const row = (await registerRows(page, no)).find((x) => x[0] === no);
    const left = (await stockOf(page, item.code)).get(`${ASSET_STORE.code} ${item.batch}`);
    qa.note(4, `row "${row?.join(' | ') ?? 'not shown'}"; the batch in ${ASSET_STORE.code} holds ${left} of 5`);
    if (row && !/installed/i.test(row[1])) qa.deviation(4, 'The row shows the state installed', `"${row[1]}"`);
  });
  await qa.step(5, async () => {
    expect(await register(page).save({ Code: no }, 'Commission')).toContain(SAVED);
    const row = (await registerRows(page, no)).find((x) => x[0] === no);
    qa.note(5, `row "${row?.join(' | ') ?? 'not shown'}"`);
    if (row && !/commissioned/i.test(row[1])) qa.deviation(5, 'The row shows the state commissioned', `"${row[1]}"`);
  });
  await qa.step(6, async () => {
    const rows = await registerRows(page, no);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((x) => x[0] === no)).toBe(true);
  });
};

export const CH = 'Category / holder';

export const AI = 'Account / item';

export const SLR = 'Serial / location / reason';

/** A leaf asset account of Finance for the sub category (the workbook's 1501 is not in the chart of accounts). */
export async function assetAccount(page: Page, qa: Qa): Promise<string> {
  return (await createAccount(page, account(qa, 'QA-1501', 'QA Aset alkes uji', 'Asset'))).code.toUpperCase();
}


export const masters = (p: Page) => new Desk(p, '/fixed-assets/masters', 'Classification', 'Category');

export const register = (p: Page) => new Desk(p, '/fixed-assets/register', 'Register', 'Buy');

/** Register rows as [code, status, holder]. */
export async function registerRows(page: Page, find?: string): Promise<string[][]> {
  const r = register(page);
  await r.open();
  if (find) {
    await r.main.getByRole('textbox').first().fill(find);
    await r.main.getByRole('button', { name: 'Find asset number' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return r.rows().evaluateAll((rs) => rs.filter((x) => x.querySelectorAll('td').length >= 3).map((x) => Array.from(x.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.trim() ?? '')));
}

export async function buy(page: Page, qa: Qa, extra: Record<string, string> = {}): Promise<{ toasts: string[]; no: string }> {
  const no = qa.code('X-FA-001');
  const toasts = await register(page).save({ Number: no, [AI]: qa.code('X-USG-01'), Document: await approvedOrder(page), Quantity: '1', ...extra });
  return { toasts, no };
}

/** The id of an approved order of Procurement (made by 09). */
export async function approvedOrder(page: Page, state = 'approved'): Promise<string> {
  await page.goto('/id/procurement/requests');
  await page.waitForLoadState('networkidle').catch(() => {});
  const id = (await page.getByRole('main').innerText()).match(new RegExp(`${state} \\S+ ([0-9a-f-]{36})`))?.[1];
  expect(id, `a ${state} row on /procurement/requests`).toBeTruthy();
  return id!;
}

// ------------------------------------------------------------------ an asset of the test, installed and commissioned

/**
 * Checklist blocker 14 named the item "X-USG-01" with a batch in "X Gudang umum" as a record of Inventory the
 * site lacks, so no asset could be installed. Since 2026-11-01 the tests make the item in Inventory (a code that
 * sorts first: the item lists show the first ones only, found blocker 40) with a batch in the general store.
 */
export const ASSET_STORE = { code: 'GU05-00-00', name: 'GUDANG UMUM RUMAH SAKIT' };

/** An item of the test with `quantity` in one batch of the general store. */
export async function assetItem(page: Page, qa: Qa, quantity = '5'): Promise<{ code: string; batch: string }> {
  const items = new ItemMasterPage(page);
  const it = { code: qa.bed('X-USG-01'), batch: qa.code('X-USG-B') };
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, { code: it.code, name: qa.name('X USG portabel uji'), lastCost: '40000000', batchTracked: true });
  let mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => toastsSince(page, mark)).toContain('Item added.');
  await items.open();
  const e = await items.openEdit({ code: it.code });
  mark = await toastMark(page);
  await items.addBatch(e, { store: ASSET_STORE.name, batch: it.batch, expiry: addDays(todayWib(), 3650), quantity });
  await expect.poll(() => toastsSince(page, mark)).toContain('Batch quantity added.');
  return it;
}

/** A category and a sub category of the test, with a leaf asset account of Finance. */
export async function subCategory(page: Page, qa: Qa): Promise<string> {
  const m = masters(page);
  const cat = qa.code('X-ALKES');
  expect(await m.save({ Code: cat, [CH]: qa.name('X Alat kesehatan uji') })).toContain(SAVED);
  const sub = qa.code('X-USG');
  expect(await m.save({ Code: sub, [CH]: cat, [AI]: await assetAccount(page, qa) }, 'Sub category')).toContain(SAVED);
  return sub;
}

export interface Asset { no: string; item: { code: string; batch: string }; sub: string; serial: string; order: string; id: string }

/** Buy, Install and Commission of one asset of the test; `upTo` stops after a stage. Returns the asset and the toasts of each stage. */
export async function commissionedAsset(page: Page, qa: Qa, upTo: 'buy' | 'install' | 'commission' = 'commission', given?: { item?: Asset['item']; sub?: string }): Promise<Asset & { toasts: Record<string, string[]> }> {
  const item = given?.item ?? (await assetItem(page, qa));
  const sub = given?.sub ?? (await subCategory(page, qa));
  const r = register(page);
  const a = { no: qa.code('X-FA-001'), item, sub, serial: qa.code('X-SN'), order: await approvedOrder(page), id: '', toasts: {} as Record<string, string[]> };
  // The id of the purchase is read from the answer of the save; now and then it is in neither the answer nor the
  // first rows of the list (found blocker 40): the purchase is made once more with a new number.
  let bought = await r.create({ Number: a.no, [AI]: item.code, Document: a.order, Quantity: '1' }).catch((e: Error) => (e instanceof NotOffered ? null : Promise.reject(e)));
  if (!bought) {
    a.no = qa.code('X-FA-001');
    bought = await r.create({ Number: a.no, [AI]: item.code, Document: a.order, Quantity: '1' });
  }
  a.toasts.buy = bought.toasts;
  a.id = bought.id;
  expect(a.toasts.buy, 'the asset of the test is bought').toContain(SAVED);
  if (upTo === 'buy') return a;
  // "Install" takes the internal id of the purchase in "Document" (the server answers "document is missing" without it).
  a.toasts.install = await r.save({ Code: a.no, [CH]: sub, [SLR]: a.serial, Store: ASSET_STORE.code, Batch: item.batch, Quantity: '1', Document: a.id }, 'Install');
  expect(a.toasts.install, `the asset of the test is installed (${a.toasts.install.join(' / ')})`).toContain(SAVED);
  if (upTo === 'install') return a;
  a.toasts.commission = await r.save({ Code: a.no }, 'Commission');
  expect(a.toasts.commission, `the asset of the test is commissioned (${a.toasts.commission.join(' / ')})`).toContain(SAVED);
  return a;
}

/** The stock of an item by store and batch ("GU05-00-00 X-B" -> 4), from "Stock on hand" of Item Master. */
export async function stockOf(page: Page, code: string): Promise<Map<string, number>> {
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
