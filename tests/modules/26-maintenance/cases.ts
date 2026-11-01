import { Desk, SAVED } from '../shared/desk';
import { todayWib } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 26-maintenance that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP026_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = plans(page);
  // The plans list holds its first rows only, by code (found blocker 40): codes that sort first.
  const card = qa.bed('X-JC-AC');
  const asset = qa.bed('X-AST-AC1');
  await qa.step(1, async () => {
    await page.goto('/id/maintenance');
    await page.getByRole('main').getByRole('link', { name: 'Plans' }).click();
    await expect(p.main.getByRole('heading', { level: 1, name: 'Plans' })).toBeVisible();
    await expect(p.main.getByRole('button', { name: 'Job card' })).toBeVisible();
    await expect(p.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Job card' }).click();
    for (const f of [CA, NE, JB, 'Date']) await expect(p.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(p.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Job card', 'Plan', 'Asset schedule', 'Daily status', 'Open due']);
  });
  await qa.step(3, async () => {
    expect(await p.save({ [CA]: card, [NE]: qa.name('X Servis AC uji') })).toContain(SAVED);
    expect((await p.list(card)).some((r) => r[1].includes(card))).toBe(true);
  });
  await qa.step(4, async () => {
    expect(await p.save({ [CA]: asset, [NE]: 'daily', [JB]: card }, 'Plan')).toContain(SAVED);
  });
  await qa.step(5, async () => {
    expect(await p.save({ [CA]: asset, [JB]: card, Date: todayWib() }, 'Asset schedule')).toContain(SAVED);
    expect((await p.list(asset)).some((r) => r[1].includes(asset))).toBe(true);
  });
  await qa.step(6, async () => {
    expect(await p.save({ [CA]: asset, Date: todayWib() }, 'Daily status')).toContain(SAVED);
  });
  await qa.step(7, async () => {
    const before = (await work(page).list(asset)).length;
    const toasts = await p.save({}, 'Open due');
    const after = (await work(page).list(asset)).length;
    qa.note(7, `"Open due": "${toasts.join(' / ')}"; work rows for the asset ${before} -> ${after}`);
  });
};

export const TC_APP026_004 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const w = work(page);
  let bd = '';
  let wo = '';
  let approved = false;
  await qa.step(1, async () => {
    await page.goto('/id/maintenance');
    await page.getByRole('main').getByRole('link', { name: 'Work' }).click();
    await expect(w.main.getByRole('heading', { level: 1, name: 'Work' })).toBeVisible();
    await expect(w.main.getByRole('button', { name: 'Breakdown' })).toBeVisible();
    await expect(w.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await w.main.getByRole('button', { name: 'Breakdown' }).click();
    await expect(w.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/^1\s*Details$/, /^2\s*Review$/]);
    for (const f of ['Number', CA, NE, NV, JB]) await expect(w.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  let listed = true;
  await qa.step(3, async () => {
    try {
      bd = await breakdown(page, qa);
    } catch (e) {
      if (!/blocker 40/.test((e as Error).message)) throw e;
      listed = false;
      return qa.note(3, 'the breakdown is saved, but its id is neither in the answer of the save nor in the list, which holds its first 40 rows');
    }
    expect(bd).not.toBe('');
  });
  if (!listed) {
    // No id of the breakdown of the test: no work order can be made for it (found blocker 40).
    for (const st of [3, 4, 5, 6, 7, 8]) qa.blocked(st, 40);
    return;
  }
  await qa.step(4, async () => {
    const r = await w.create(ORDER(qa, bd), 'Work order');
    expect(r.toasts).toContain(SAVED);
    wo = r.id;
    expect(await w.status(wo)).toBe('draft');
    qa.note(4, `budget head "${HEAD}" (seed): no head has a balance, allocations need U5`);
  });
  await qa.step(5, async () => {
    expect(await w.save({ Document: wo }, 'Send order')).toContain(SAVED);
    expect(await w.status(wo)).toBe('sent');
    const toasts = await w.save({ Document: wo }, 'Approve order');
    const status = await w.status(wo);
    qa.note(5, `"Approve order": "${toasts.join(' / ').slice(0, 100)}"; the order reads "${status}"`);
    approved = status === 'approved';
    if (!approved) qa.notRun(5, 'the budget hold needs a head with a balance (allocation needs U5)');
  });
  qa.blocked(6, 14);
  qa.note(6, SPARE);
  if (!approved) {
    qa.notRun(7, 'the order is not approved (step 5)');
    qa.notRun(8, 'the order is not approved (step 5)');
    return;
  }
  await qa.step(7, async () => {
    expect(await w.save({ [NV]: qa.prefix('X Freon diisi ulang'), Document: wo }, 'Complete')).toContain(SAVED);
    expect(await w.status(wo)).toBe('completed');
  });
  await qa.step(8, async () => {
    expect(await w.save({ Amount: '450000', Document: wo }, 'Invoice')).toContain(SAVED);
  });
};

export const plans = (p: Page) => new Desk(p, '/maintenance/plans', 'Plans', 'Job card');

export const work = (p: Page) => new Desk(p, '/maintenance/work', 'Work', 'Breakdown');

export const CA = 'Code / asset';

export const NE = 'Name / end';

export const JB = 'Job card / budget head';

export const NV = 'Note / vendor';

export const HEAD = 'ALKES';

export const SPARE = 'the spare "X-FREON" with stock in "X Gudang IPSRS" is not in Inventory (07)';

export const ORDER = (qa: Qa, breakdown: string, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-WO-001'),
  [NE]: 'external',
  [NV]: qa.prefix('X Teknisi uji'),
  [JB]: HEAD,
  Document: breakdown,
  Amount: '500000',
  ...extra,
});

export async function breakdown(page: Page, qa: Qa): Promise<string> {
  const r = await work(page).create(BREAKDOWN(qa, qa.code('X-AST-AC1')), 'Breakdown');
  expect(r.toasts).toContain(SAVED);
  return r.id;
}

export const BREAKDOWN = (qa: Qa, asset: string) => ({ Number: qa.code('X-BD-001'), [CA]: asset });
