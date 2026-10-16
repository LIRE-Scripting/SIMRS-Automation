import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { screenOpens } from '../shared/screen-opens';
import { breakdown, BREAKDOWN, CA, HEAD, JB, NE, NV, ORDER, plans, SPARE, TC_APP026_001, TC_APP026_004, work } from './cases';

/**
 * 26-maintenance.xlsx: plans (job card, plan, schedule, daily status, open
 * due), work (breakdown, work order, spare, complete, invoice) and AMC
 * (indent, contract, schedule, instalment, warranty, certificate). Numbers
 * and codes carry a token. No budget head has a balance (allocations need
 * U5): the work order names the seed head "ALKES" and its approval is
 * recorded as the site answers. The spare "X-FREON" in "X Gudang IPSRS" is a
 * record of Inventory that is not on the site (checklist blocker 14).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});
const amc = (p: Page) => new Desk(p, '/maintenance/amc', 'AMC', 'AMC indent');

async function jobCard(page: Page, qa: Qa): Promise<string> {
  const code = qa.code('X-JC-AC');
  expect(await plans(page).save({ [CA]: code, [NE]: qa.name('X Servis AC uji') })).toContain(SAVED);
  return code;
}

qaTest('TC-APP026-001', TC_APP026_001);

qaTest('TC-APP026-002', async ({ page, qa }) => {
  const p = plans(page);
  const card = await jobCard(page, qa);
  const asset = qa.code('X-AST-AC1');
  await qa.step(1, async () => refused(qa, 1, await p.save({ [CA]: qa.code('X-JC-AC'), [NE]: '' }), 'code and name are required'));
  await qa.step(2, async () => refused(qa, 2, await p.save({ [CA]: asset, [NE]: 'daily', [JB]: '' }, 'Plan'), 'Please enter job card'));
  await qa.step(3, async () => refused(qa, 3, await p.save({ [CA]: asset, [NE]: 'daily', [JB]: qa.code('X-TIDAK-ADA') }, 'Plan'), 'Please enter job card'));
  await qa.step(4, async () => refused(qa, 4, await p.save({ [CA]: '', [JB]: card, Date: todayWib() }, 'Asset schedule'), 'asset is required'));
  await qa.step(5, async () => refused(qa, 5, await p.save({ [CA]: asset, Date: '' }, 'Daily status'), 'asset and date are required'));
  await qa.step(6, async () => {
    const toasts = await p.save({ Date: addDays(todayWib(), 3000) }, 'Open due');
    qa.note(6, `"Open due" on a day with no schedule (the date field is not used by it): "${toasts.join(' / ')}"`);
  });
  await qa.step(7, async () => refused(qa, 7, await p.save({ [CA]: card, [NE]: qa.name('X Servis AC uji') }), 'duplicate'));
});

qaTest('TC-APP026-003', async ({ page, qa }) => {
  const p = plans(page);
  const card = await jobCard(page, qa);
  await qa.step(1, async () => {
    const toasts = await p.save({ [CA]: qa.code('X-AST-TIDAK-ADA'), [NE]: 'daily', [JB]: card }, 'Plan');
    qa.note(1, `an asset code that exists nowhere: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await p.save({ [CA]: qa.code('X-AST-AC1'), [NE]: 'sometimes', [JB]: card }, 'Plan');
    qa.note(2, `frequency "sometimes": "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const a = await p.save({}, 'Open due');
    const b = await p.save({}, 'Open due');
    qa.note(3, `"Open due" twice: "${a.join(' / ')}", then "${b.join(' / ')}"`);
  });
});

qaTest('TC-APP026-004', TC_APP026_004);

qaTest('TC-APP026-005', async ({ page, qa }) => {
  const w = work(page);
  await qa.step(1, async () => refused(qa, 1, await w.save(BREAKDOWN(qa, ''), 'Breakdown'), 'number and asset are required'));
  const bd = await breakdown(page, qa);
  await qa.step(2, async () => refused(qa, 2, await w.save(ORDER(qa, ''), 'Work order'), 'document is missing'));
  await qa.step(3, async () => {
    const draftOrder = await w.create(ORDER(qa, bd), 'Work order');
    refused(qa, 3, await w.save(ORDER(qa, draftOrder.id), 'Work order'), 'report the incident first');
  });
  await qa.step(4, async () => refused(qa, 4, await w.save(ORDER(qa, bd, { [NV]: '' }), 'Work order'), 'vendor is required'));
  const draft = await w.create(ORDER(qa, bd), 'Work order');
  await qa.step(5, async () => refused(qa, 5, await w.save({ Document: draft.id }, 'Approve order'), 'send the order first'));
  await qa.step(6, async () => {
    const big = await w.create(ORDER(qa, bd, { Amount: '999999999999' }), 'Work order');
    expect(await w.save({ Document: big.id }, 'Send order')).toContain(SAVED);
    const toasts = await w.save({ Document: big.id }, 'Approve order');
    const status = await w.status(big.id);
    qa.note(6, `approve above the balance: "${toasts.join(' / ').slice(0, 80)}"; the order reads "${status}"`);
    expect(status).toBe('sent');
  });
  await qa.step(7, async () => refused(qa, 7, await w.save({ [JB]: qa.code('X-FREON'), Store: qa.prefix('X Gudang IPSRS'), Batch: qa.code('X-B'), Quantity: '1', Document: draft.id }, 'Spare'), 'approve the order first'));
  qa.blocked(8, 14);
  qa.note(8, SPARE);
  await qa.step(9, async () => refused(qa, 9, await w.save({ [NV]: '', Document: draft.id }, 'Complete'), 'note is required'));
  await qa.step(10, async () => refused(qa, 10, await w.save({ Amount: '450000', Document: draft.id }, 'Invoice'), 'complete the work first'));
  await qa.step(11, async () => refused(qa, 11, await w.save({ Amount: '0', Document: draft.id }, 'Invoice'), 'amount must be positive'));
});

qaTest('TC-APP026-006', async ({ page, qa }) => {
  const w = work(page);
  qa.notRun(1, 'needs a completed order: approval needs a budget head with a balance (allocation needs U5)');
  qa.notRun(2, 'see step 1');
  qa.notRun(3, 'see step 1');
  await qa.step(4, async () => {
    const bd = await breakdown(page, qa);
    const toasts = await w.save(ORDER(qa, bd, { [NE]: 'internal', [NV]: '' }), 'Work order');
    qa.note(4, `an internal order with a budget head and an amount: "${toasts.join(' / ')}"`);
  });
  await qa.step(5, async () => {
    await w.openDialog();
    await expect(w.dialog.getByRole('textbox', { name: JB })).toBeVisible();
    await w.dialog.getByRole('button', { name: 'Next' }).click();
    const labels = await w.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    qa.note(5, `the spare is typed into "${JB}"; step two has ${labels.join(', ')}`);
  });
});

const INDENT = (qa: Qa, extra: Record<string, string> = {}) => ({ Number: qa.code('X-IND-001'), [CA]: qa.code('X-AST-CT1'), Amount: '120000000', ...extra });
const CONTRACT = (qa: Qa, indent: string, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-AMC-001'),
  [CA]: qa.code('X-AST-CT1'),
  [NE]: '2027-10-31',
  [NV]: qa.prefix('X PT Servis Uji'),
  Document: indent,
  Date: '2026-11-01',
  ...extra,
});

async function indent(page: Page, qa: Qa, approved = true): Promise<string> {
  const a = amc(page);
  const r = await a.create(INDENT(qa), 'AMC indent');
  expect(r.toasts).toContain(SAVED);
  if (approved) for (const x of ['Send indent', 'Approve indent']) expect(await a.save({ Document: r.id }, x), x).toContain(SAVED);
  return r.id;
}

qaTest('TC-APP026-007', async ({ page, qa }) => {
  const a = amc(page);
  const card = await jobCard(page, qa);
  let ind = '';
  let con = '';
  await qa.step(1, async () => {
    await page.goto('/en/maintenance');
    await page.getByRole('main').getByRole('link', { name: 'AMC' }).click();
    await expect(a.main.getByRole('heading', { level: 1, name: 'AMC' })).toBeVisible();
    await expect(a.main.getByRole('button', { name: 'AMC indent' })).toBeVisible();
    await expect(a.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await a.main.getByRole('button', { name: 'AMC indent' }).click();
    await expect(a.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveCount(2);
    for (const f of ['Number', CA, NE, NV]) await expect(a.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  await qa.step(3, async () => {
    const r = await a.create(INDENT(qa), 'AMC indent');
    expect(r.toasts).toContain(SAVED);
    ind = r.id;
    expect(await a.status(ind)).toBe('draft');
  });
  await qa.step(4, async () => {
    expect(await a.save({ Document: ind }, 'Send indent')).toContain(SAVED);
    expect(await a.status(ind)).toBe('sent');
    expect(await a.save({ Document: ind }, 'Approve indent')).toContain(SAVED);
    expect(await a.status(ind)).toBe('approved');
  });
  await qa.step(5, async () => {
    const r = await a.create(CONTRACT(qa, ind), 'Contract');
    expect(r.toasts).toContain(SAVED);
    con = r.id;
    expect(await a.status(con)).toBe('draft');
  });
  await qa.step(6, async () => {
    expect(await a.save({ Document: con }, 'Send contract')).toContain(SAVED);
    expect(await a.status(con)).toBe('sent');
    expect(await a.save({ Document: con }, 'Approve contract')).toContain(SAVED);
    expect(await a.status(con)).toBe('approved');
  });
  await qa.step(7, async () => {
    expect(await a.save({ [JB]: card, Date: '2026-12-01', Document: con }, 'AMC schedule')).toContain(SAVED);
  });
  await qa.step(8, async () => {
    expect(await a.save({ Amount: '30000000', Document: con }, 'Instalment')).toContain(SAVED);
  });
});

qaTest('TC-APP026-008', async ({ page, qa }) => {
  const a = amc(page);
  await qa.step(1, async () => refused(qa, 1, await a.save(INDENT(qa, { Amount: '0' }), 'AMC indent'), 'number, asset and amount are required'));
  const draftIndent = await indent(page, qa, false);
  await qa.step(2, async () => refused(qa, 2, await a.save({ Document: draftIndent }, 'Approve indent'), 'send the indent first'));
  await qa.step(3, async () => refused(qa, 3, await a.save(CONTRACT(qa, draftIndent), 'Contract'), 'approve the indent first'));
  const ind = await indent(page, qa);
  await qa.step(4, async () => refused(qa, 4, await a.save(CONTRACT(qa, ind, { [NV]: '' }), 'Contract'), 'number, vendor, start and end are required'));
  await qa.step(5, async () => refused(qa, 5, await a.save(CONTRACT(qa, ind, { [NE]: '2026-10-31' }), 'Contract'), 'end is before start'));
  const draft = await a.create(CONTRACT(qa, ind), 'Contract');
  await qa.step(6, async () => refused(qa, 6, await a.save({ Document: draft.id }, 'Approve contract'), 'send the contract first'));
  await qa.step(7, async () => refused(qa, 7, await a.save({ [JB]: '', Date: '2026-12-01', Document: draft.id }, 'AMC schedule'), 'Please enter job card'));
  await qa.step(8, async () => refused(qa, 8, await a.save({ Amount: '30000000', Document: draft.id }, 'Instalment'), 'approve the contract first'));
  await qa.step(9, async () => {
    for (const x of ['Send contract', 'Approve contract']) expect(await a.save({ Document: draft.id }, x)).toContain(SAVED);
    refused(qa, 9, await a.save({ Amount: '0', Document: draft.id }, 'Instalment'), 'amount must be positive');
  });
});

qaTest('TC-APP026-009', async ({ page, qa }) => {
  const a = amc(page);
  const ind = await indent(page, qa);
  await qa.step(1, async () => {
    const c = await a.create(CONTRACT(qa, ind), 'Contract');
    for (const x of ['Send contract', 'Approve contract']) expect(await a.save({ Document: c.id }, x)).toContain(SAVED);
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await a.save({ Amount: '30000000', Document: c.id }, 'Instalment')).join(' / '));
    qa.note(1, `five instalments of 30000000 on an indent of 120000000: ${results.join(' | ')}`);
  });
  await qa.step(2, async () => {
    const toasts = await a.save(CONTRACT(qa, ind), 'Contract');
    qa.note(2, `a second contract for the asset: "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const toasts = await a.save(CONTRACT(qa, ind, { [NE]: '2026-12-31', Date: '2027-01-01' }), 'Contract');
    refused(qa, 3, toasts, 'end is before start');
  });
});

qaTest('TC-APP026-010', async ({ page, qa }) => {
  const a = amc(page);
  const asset = qa.code('X-AST-CT1');
  await qa.step(1, async () => {
    await a.openDialog();
    await expect(a.dialog).toHaveAccessibleName('AMC');
  });
  await qa.step(2, async () => {
    expect(await a.save({ [CA]: asset, [NE]: 'extend', Date: '2028-12-31' }, 'Warranty')).toContain(SAVED);
  });
  await qa.step(3, async () => {
    expect(await a.save({ [CA]: asset, [NE]: 'released' }, 'Certificate')).toContain(SAVED);
  });
  await qa.step(4, async () => {
    expect(await a.save({ [CA]: asset, [NE]: 'held', [NV]: qa.prefix('X Menunggu kalibrasi') }, 'Certificate')).toContain(SAVED);
  });
  await qa.step(5, async () => {
    const rows = await a.list(asset);
    qa.note(5, `rows of the asset on AMC: ${rows.length}; warranty and certificate are shown nowhere`);
  });
});

qaTest('TC-APP026-011', async ({ page, qa }) => {
  const a = amc(page);
  const asset = qa.code('X-AST-CT1');
  await qa.step(1, async () => refused(qa, 1, await a.save({ [CA]: asset, [NE]: 'renew', Date: '2028-12-31' }, 'Warranty'), 'asset, type and date are required'));
  await qa.step(2, async () => refused(qa, 2, await a.save({ [CA]: asset, Date: '2028-12-31' }, 'Warranty'), 'asset, type and date are required'));
  await qa.step(3, async () => refused(qa, 3, await a.save({ [CA]: '', [NE]: 'released' }, 'Certificate'), 'asset is required'));
  await qa.step(4, async () => refused(qa, 4, await a.save({ [CA]: asset, [NE]: 'held', [NV]: '' }, 'Certificate'), 'reason is required'));
});

qaTest('TC-APP026-012', async ({ page, qa }) => {
  const w = work(page);
  qa.notRun(1, 'needs an asset registered in Fixed assets (27): its asset code is checked there');
  await qa.step(2, async () => {
    const r = await w.create(BREAKDOWN(qa, qa.code('X-AST-TIDAK-ADA')), 'Breakdown');
    qa.note(2, `a code Fixed assets does not have: "${r.toasts.join(' / ')}"`);
  });
  for (const s of [3, 4, 5, 6]) qa.notRun(s, 'needs a completed and invoiced work order (budget hold needs U5; the spare is not in Inventory)');
});

const ROUTES: [string, string, string][] = [
  ['TC-APP026-014', '/maintenance', 'Maintenance'],
  ['TC-APP026-015', '/maintenance/amc', 'AMC'],
  ['TC-APP026-016', '/maintenance/plans', 'Plans'],
  ['TC-APP026-017', '/maintenance/work', 'Work'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
