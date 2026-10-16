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
    await page.goto('/en/fixed-assets');
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
  await qa.step(4, async () => {
    expect(await m.save({ Code: sub, [CH]: cat, [AI]: ACCOUNT }, 'Sub category')).toContain(SAVED);
    const row = (await m.list()).find((r) => r[1].includes(ACCOUNT) && r[0] === 'active');
    expect(row).toBeTruthy();
    qa.note(4, `rows show the name and the account only (e.g. "${row!.join(' | ')}")`);
  });
  await qa.step(5, async () => {
    const before = (await m.list()).filter((r) => r[0] === 'active').length;
    expect(await m.save({ Code: sub }, 'Deactivate')).toContain(SAVED);
    const after = (await m.list()).filter((r) => r[0] === 'active').length;
    expect(after).toBe(before - 1);
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
    await page.goto('/en/fixed-assets');
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
  await qa.step(3, async () => {
    const b = await buy(page, qa);
    expect(b.toasts).toContain(SAVED);
    no = b.no;
    expect((await registerRows(page)).some((x) => x[0] === no)).toBe(true);
  });
  qa.blocked(4, 14);
  qa.blocked(5, 14);
  qa.note(4, NO_STOCK);
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

export const NO_STOCK = 'the item "X-USG-01" with a batch in "X Gudang umum" is not in Inventory (07), so no test asset can be installed or commissioned';

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
  await page.goto('/en/procurement/requests');
  await page.waitForLoadState('networkidle').catch(() => {});
  const id = (await page.getByRole('main').innerText()).match(new RegExp(`${state} \\S+ ([0-9a-f-]{36})`))?.[1];
  expect(id, `a ${state} row on /procurement/requests`).toBeTruthy();
  return id!;
}
