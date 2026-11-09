import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { breakdown, BREAKDOWN, CA, JB, NE, NV, ORDER, plans, SPARE, TC_APP026_001, TC_APP026_004, work } from './cases';
import { expectStatus } from '../shared/desk-status';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of maintenance.spec.ts, shared with the end-to-end chains (chain.run). */

export const amc = (p: Page) => new Desk(p, '/maintenance/amc', 'AMC', 'AMC indent');

export async function jobCard(page: Page, qa: Qa): Promise<string> {
  const code = qa.bed('X-JC-AC');
  expect(await plans(page).save({ [CA]: code, [NE]: qa.name('X Servis AC uji') })).toContain(SAVED);
  return code;
}

export const TC_APP026_002: QaBody = async ({ page, qa }) => {
  const p = plans(page);
  const card = await jobCard(page, qa);
  const asset = qa.bed('X-AST-AC1');
  await qa.step(1, async () => refused(qa, 1, await p.save({ [CA]: qa.bed('X-JC-AC'), [NE]: '' }), 'code and name are required'));
  await qa.step(2, async () => refused(qa, 2, await p.save({ [CA]: asset, [NE]: 'daily', [JB]: '' }, 'Plan'), 'Please enter job card'));
  await qa.step(3, async () => refused(qa, 3, await p.save({ [CA]: asset, [NE]: 'daily', [JB]: qa.bed('X-TIDAK-ADA') }, 'Plan'), 'Please enter job card'));
  await qa.step(4, async () => refused(qa, 4, await p.save({ [CA]: '', [JB]: card, Date: todayWib() }, 'Asset schedule'), 'asset is required'));
  await qa.step(5, async () => refused(qa, 5, await p.save({ [CA]: asset, Date: '' }, 'Daily status'), 'asset and date are required'));
  await qa.step(6, async () => {
    const toasts = await p.save({ Date: addDays(todayWib(), 3000) }, 'Open due');
    qa.note(6, `"Open due" on a day with no schedule (the date field is not used by it): "${toasts.join(' / ')}"`);
  });
  await qa.step(7, async () => refused(qa, 7, await p.save({ [CA]: card, [NE]: qa.name('X Servis AC uji') }), 'duplicate'));
};

export const TC_APP026_003: QaBody = async ({ page, qa }) => {
  const p = plans(page);
  const card = await jobCard(page, qa);
  await qa.step(1, async () => {
    const toasts = await p.save({ [CA]: qa.bed('X-AST-TIDAK-ADA'), [NE]: 'daily', [JB]: card }, 'Plan');
    qa.note(1, `an asset code that exists nowhere: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await p.save({ [CA]: qa.bed('X-AST-AC1'), [NE]: 'sometimes', [JB]: card }, 'Plan');
    qa.note(2, `frequency "sometimes": "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const a = await p.save({}, 'Open due');
    const b = await p.save({}, 'Open due');
    qa.note(3, `"Open due" twice: "${a.join(' / ')}", then "${b.join(' / ')}"`);
  });
};

export const TC_APP026_005: QaBody = async ({ page, qa }) => {
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
  expect(draft.toasts, 'the draft order of steps 5–11').toContain(SAVED);
  await qa.step(5, async () => refused(qa, 5, await w.save({ Document: draft.id }, 'Approve order'), 'send the order first'));
  await qa.step(6, async () => {
    const big = await w.create(ORDER(qa, bd, { Amount: '999999999999' }), 'Work order');
    expect(big.toasts).toContain(SAVED);
    expect(await w.save({ Document: big.id }, 'Send order')).toContain(SAVED);
    const toasts = await w.save({ Document: big.id }, 'Approve order');
    const status = await w.status(big.id);
    qa.note(6, `approve above the balance: "${toasts.join(' / ').slice(0, 80)}"; the order reads "${status}"`);
    expect(status).toBe('sent');
  });
  await qa.step(7, async () => refused(qa, 7, await w.save({ [JB]: qa.bed('X-FREON'), Store: qa.prefix('X Gudang IPSRS'), Batch: qa.bed('X-B'), Quantity: '1', Document: draft.id }, 'Spare'), 'approve the order first'));
  qa.blocked(8, 14);
  qa.note(8, SPARE);
  await qa.step(9, async () => refused(qa, 9, await w.save({ [NV]: '', Document: draft.id }, 'Complete'), 'note is required'));
  await qa.step(10, async () => refused(qa, 10, await w.save({ Amount: '450000', Document: draft.id }, 'Invoice'), 'complete the work first'));
  await qa.step(11, async () => refused(qa, 11, await w.save({ Amount: '0', Document: draft.id }, 'Invoice'), 'amount must be positive'));
};

export const TC_APP026_006: QaBody = async ({ page, qa }) => {
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
};

export const INDENT = (qa: Qa, extra: Record<string, string> = {}) => ({ Number: qa.bed('X-IND-001'), [CA]: qa.bed('X-AST-CT1'), Amount: '120000000', ...extra });

export const CONTRACT = (qa: Qa, indent: string, extra: Record<string, string> = {}) => ({
  Number: qa.bed('X-AMC-001'),
  [CA]: qa.bed('X-AST-CT1'),
  [NE]: '2027-10-31',
  [NV]: qa.prefix('X PT Servis Uji'),
  Document: indent,
  Date: '2026-11-01',
  ...extra,
});

export async function indent(page: Page, qa: Qa, approved = true): Promise<string> {
  const a = amc(page);
  const r = await a.create(INDENT(qa), 'AMC indent');
  expect(r.toasts).toContain(SAVED);
  if (approved) for (const x of ['Send indent', 'Approve indent']) expect(await a.save({ Document: r.id }, x), x).toContain(SAVED);
  return r.id;
}

export const TC_APP026_007: QaBody = async ({ page, qa }) => {
  const a = amc(page);
  const card = await jobCard(page, qa);
  let ind = '';
  let con = '';
  await qa.step(1, async () => {
    await page.goto('/id/maintenance');
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
    await expectStatus(qa, 3, a, ind, 'draft');
  });
  await qa.step(4, async () => {
    expect(await a.save({ Document: ind }, 'Send indent')).toContain(SAVED);
    await expectStatus(qa, 4, a, ind, 'sent');
    expect(await a.save({ Document: ind }, 'Approve indent')).toContain(SAVED);
    await expectStatus(qa, 4, a, ind, 'approved');
  });
  await qa.step(5, async () => {
    const r = await a.create(CONTRACT(qa, ind), 'Contract');
    expect(r.toasts).toContain(SAVED);
    con = r.id;
    await expectStatus(qa, 5, a, con, 'draft');
  });
  await qa.step(6, async () => {
    expect(await a.save({ Document: con }, 'Send contract')).toContain(SAVED);
    await expectStatus(qa, 6, a, con, 'sent');
    expect(await a.save({ Document: con }, 'Approve contract')).toContain(SAVED);
    await expectStatus(qa, 6, a, con, 'approved');
  });
  await qa.step(7, async () => {
    expect(await a.save({ [JB]: card, Date: '2026-12-01', Document: con }, 'AMC schedule')).toContain(SAVED);
  });
  await qa.step(8, async () => {
    expect(await a.save({ Amount: '30000000', Document: con }, 'Instalment')).toContain(SAVED);
  });
};

export const TC_APP026_008: QaBody = async ({ page, qa }) => {
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
};

export const TC_APP026_009: QaBody = async ({ page, qa }) => {
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
};

export const TC_APP026_010: QaBody = async ({ page, qa }) => {
  const a = amc(page);
  const asset = qa.bed('X-AST-CT1');
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
};

export const TC_APP026_011: QaBody = async ({ page, qa }) => {
  const a = amc(page);
  const asset = qa.bed('X-AST-CT1');
  await qa.step(1, async () => refused(qa, 1, await a.save({ [CA]: asset, [NE]: 'renew', Date: '2028-12-31' }, 'Warranty'), 'asset, type and date are required'));
  await qa.step(2, async () => refused(qa, 2, await a.save({ [CA]: asset, Date: '2028-12-31' }, 'Warranty'), 'asset, type and date are required'));
  await qa.step(3, async () => refused(qa, 3, await a.save({ [CA]: '', [NE]: 'released' }, 'Certificate'), 'asset is required'));
  await qa.step(4, async () => refused(qa, 4, await a.save({ [CA]: asset, [NE]: 'held', [NV]: '' }, 'Certificate'), 'reason is required'));
};

export const TC_APP026_012: QaBody = async ({ page, qa }) => {
  const w = work(page);
  qa.notRun(1, 'needs an asset registered in Fixed assets (27): its asset code is checked there');
  await qa.step(2, async () => {
    const r = await w.create(BREAKDOWN(qa, qa.bed('X-AST-TIDAK-ADA')), 'Breakdown');
    qa.note(2, `a code Fixed assets does not have: "${r.toasts.join(' / ')}"`);
  });
  for (const s of [3, 4, 5, 6]) qa.notRun(s, 'needs a completed and invoiced work order (budget hold needs U5; the spare is not in Inventory)');
};

export const TC_APP026_013: QaBody = async ({ page, qa, browser }) => {
  // Preconditions (made by U1): a breakdown and a work order sent for approval.
  const w = work(page);
  // A new document's id is read from the answer or the list; the list holds only its first 40 rows (found blocker 40).
  const notListed = (e: Error) => {
    if (!/blocker 40/.test(e.message)) throw e;
    return '';
  };
  const bd = await breakdown(page, qa).catch(notListed);
  const sent = bd ? await w.create(ORDER(qa, bd), 'Work order').catch((e: Error) => ({ toasts: [SAVED], id: notListed(e) })) : { toasts: [SAVED], id: '' };
  expect(sent.toasts).toContain(SAVED);
  if (sent.id) expect(await w.save({ Document: sent.id }, 'Send order')).toContain(SAVED);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/maintenance', ['Plans', 'Work', 'AMC'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const toasts = await work(staff).save(BREAKDOWN(qa, qa.bed('X-AST-AC1')), 'Breakdown');
      qa.note(2, `a breakdown reported by U3: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook: whether a ward nurse may report one)`);
    });
    if (!sent.id) {
      // No id of the order of the test (found blocker 40): its approval and invoice cannot be tried by U3.
      qa.blocked(3, 40);
      qa.blocked(4, 40);
    } else await qa.step(3, async () => {
      refused(qa, 3, await work(staff).save({ Document: sent.id }, 'Approve order'), 'missing required privilege');
      const status = await w.status(sent.id);
      if (status) expect(status).toBe('sent');
      else qa.note(3, 'the status of the order cannot be read: the list shows its first 40 rows (found blocker 40)');
    });
    if (sent.id) await qa.step(4, async () => {
      // No order can be approved and completed (no budget head has a balance): "Invoice" is tried on the sent order.
      refused(qa, 4, await work(staff).save({ Amount: '450000', Document: sent.id }, 'Invoice'), 'missing required privilege');
      qa.note(4, 'the order is sent, not completed: no order can be approved while no budget head has a balance (allocations need U5)');
    });
    await qa.step(5, async () => {
      const entries = await auditEntries(page, 'maintenance');
      qa.note(5, `Audit Log, module "maintenance": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''} (TBD in the workbook: no entry is written)`);
    });
  } finally {
    await staff.context().close();
  }
};

export const ROUTES: [string, string, string][] = [
  ['TC-APP026-014', '/maintenance', 'Maintenance'],
  ['TC-APP026-015', '/maintenance/amc', 'AMC'],
  ['TC-APP026-016', '/maintenance/plans', 'Plans'],
  ['TC-APP026-017', '/maintenance/work', 'Work'],
];
