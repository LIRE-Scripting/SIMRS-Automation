import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { SAVED, refused } from '../shared/desk';
import { allBranchesSave, asAllBranches, auditEntries, menuScreens, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { addDays, todayWib } from '../../../lib/dates';
import { addStock, finishedLinen, linenItems, moves, orders, saveRecipe, stockIn, stores, STORES, TC_APP025_001, TC_APP025_004, TC_APP025_008, TC_APP025_012 } from './cases';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';

/**
 * 25-linen.xlsx: stores and recipe, work orders and circulation. The branch
 * already names its three linen stores (GLB / LDR / GST); a save of other
 * stores is put back to these at the end of the test. The finished item, its
 * component and the component's stock in the linen store are records of
 * Inventory: checklist blocker 14 named them as missing; since 2026-11-01
 * each test makes its own in Inventory (cases.ts, linenItems) and runs the
 * work order and the circulation on them.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Puts the store names of the branch back (end of a test that saved others). */
async function restoreStores(page: Page): Promise<void> {
  await stores(page).save(STORES);
}

qaTest('TC-APP025-001', TC_APP025_001);

qaTest('TC-APP025-002', async ({ page, qa }) => {
  const s = stores(page);
  try {
    await qa.step(1, async () => refused(qa, 1, await s.save({ ...STORES, 'Contractor / laundry': '' }), 'store is missing'));
    await qa.step(2, async () => {
      const toasts = await s.save({ ...STORES, 'Sterile / ward store': qa.code('X-GUDANG') });
      expect(toasts).not.toContain(SAVED);
      qa.note(2, `a store that is not in Inventory: "${toasts.join(' / ').slice(0, 100)}"`);
    });
    const it = await linenItems(page, qa);
    await qa.step(3, async () => refused(qa, 3, await saveRecipe(page, it, '0'), 'finished item, component and quantity are required'));
    await qa.step(4, async () => refused(qa, 4, await stores(page).save({ 'Finished item': it.finished, 'Component / linen store': qa.bed('X-TIDAKADA'), Quantity: '1' }, 'Save recipe'), 'item is missing'));
    await qa.step(5, async () => {
      const toasts = await s.save({ 'Component / linen store': 'GST', 'Contractor / laundry': 'LDR', 'Sterile / ward store': 'GLB' });
      const rows = (await s.list()).filter((r) => r[0] === 'named').map((r) => r[1]);
      qa.note(5, `other names: "${toasts.join(' / ')}"; the list shows ${rows.join(' ; ')}`);
    });
  } finally {
    await restoreStores(page);
  }
});

qaTest('TC-APP025-003', async ({ qa, browser }) => {
  // The store names of BR-A (the shared ones): a save that is not refused changes nothing of BR-A.
  await asAllBranches(browser, async (u2) => {
    await qa.step(1, async () => allBranchesSave(qa, 1, await stores(u2).save(STORES), SAVED, 'the save needs one branch'));
  });
});

const ORDER = (qa: Qa, extra: Record<string, string> = {}) => ({
  Number: qa.bed('X-WO-001'),
  'Contractor / laundry': qa.prefix('X Konveksi uji'),
  'Finished item': qa.code('X-SPREI'),
  Quantity: '10',
  ...extra,
});

qaTest('TC-APP025-004', TC_APP025_004);

qaTest('TC-APP025-005', async ({ page, qa }) => {
  const o = orders(page);
  await qa.step(1, async () => refused(qa, 1, await o.save(ORDER(qa)), 'recipe is missing'));
  await qa.step(2, async () => refused(qa, 2, await o.save(ORDER(qa, { Quantity: '0' })), 'number, contractor, item and quantity are required'));
  const it = await linenItems(page, qa, '20');
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const draft = async (quantity = '2') => (await o.create(ORDER(qa, { 'Finished item': it.finished, Quantity: quantity }))).id;
  await qa.step(3, async () => refused(qa, 3, await o.save({ Batch: it.componentBatch, Document: await draft() }, 'Approve order'), 'send the order first'));
  await qa.step(4, async () => {
    const id = await draft();
    await o.save({ Document: id }, 'Send order');
    refused(qa, 4, await o.save({ Batch: '', Document: id }, 'Approve order'), 'batch is required');
  });
  await qa.step(5, async () => {
    // 10 pieces need 25 of the component; the batch of the test holds 20.
    const id = await draft('10');
    await o.save({ Document: id }, 'Send order');
    refused(qa, 5, await o.save({ Batch: it.componentBatch, Document: id }, 'Approve order'), 'not enough stock');
  });
  await qa.step(6, async () => {
    const id = await draft();
    await o.save({ Document: id }, 'Send order');
    refused(qa, 6, await o.save({ Batch: qa.code('X-SPREI-B'), Expiry: addDays(todayWib(), 730), Quantity: '2', Document: id }, 'Receive finished'), 'approve the order first');
  });
  await qa.step(7, async () => {
    const id = await draft();
    await o.save({ Document: id }, 'Send order');
    await o.save({ Batch: it.componentBatch, Document: id }, 'Approve order');
    refused(qa, 7, await o.save({ Batch: qa.code('X-SPREI-B'), Expiry: '', Quantity: '2', Document: id }, 'Receive finished'), 'batch, expiry and quantity are required');
  });
  await qa.step(8, async () => {
    const done = await finishedLinen(page, qa, it, '2');
    refused(qa, 8, await o.save({ Document: done.receipt, Amount: '0' }, 'Charge'), 'amount must be positive');
  });
  qa.notRun(9, 'needs a branch whose linen stores are not named; every branch U1 can work on has them (the stores are a setting of the branch)');
});

qaTest('TC-APP025-006', async ({ page, qa }) => {
  const o = orders(page);
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const approved = async (quantity: string) => {
    const id = (await o.create(ORDER(qa, { 'Finished item': it.finished, Quantity: quantity }))).id;
    await o.save({ Document: id }, 'Send order');
    await o.save({ Batch: it.componentBatch, Document: id }, 'Approve order');
    return id;
  };
  const receive = (id: string, quantity: string, batch = qa.code('X-SPREI-B')) => o.create({ Batch: batch, Expiry: addDays(todayWib(), 730), Quantity: quantity, Document: id }, 'Receive finished');
  let receipt = '';
  let order = '';
  await qa.step(1, async () => {
    order = await approved('4');
    const r = await receive(order, '6');
    receipt = r.id;
    qa.note(1, `6 received on an order for 4: "${r.toasts.join(' / ')}" (TBD in the workbook: accepted, not compared with the order)`);
  });
  await qa.step(2, async () => {
    const again = await receive(order, '4');
    qa.note(2, `the same order received a second time: "${again.toasts.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(3, async () => {
    const first = await o.save({ Document: receipt, Amount: '100000' }, 'Charge');
    const second = await o.save({ Document: receipt, Amount: '100000' }, 'Charge');
    qa.note(3, `"Charge" twice for ${receipt}: "${first.join(' / ')}", then "${second.join(' / ')}" (TBD in the workbook: two vouchers in Finance)`);
  });
  await qa.step(4, async () => {
    // A second batch of the component; each is too small for an order of 20 pieces (50 of the component).
    const other = qa.code('X-KAIN-B');
    await addStock(page, it.component, 'GLB', other, '30');
    const id = (await o.create(ORDER(qa, { 'Finished item': it.finished, Quantity: '20' }))).id;
    await o.save({ Document: id }, 'Send order');
    const toasts = await o.save({ Batch: other, Document: id }, 'Approve order');
    qa.note(4, `an order needing 50 of the component, from a batch of 30 (the other holds what is left of 100): "${toasts.join(' / ')}" (TBD in the workbook: one batch is typed for all components)`);
  });
});

qaTest('TC-APP025-007', async ({ qa, browser }) => {
  await asAllBranches(browser, async (u2) => {
    await qa.step(1, async () => allBranchesSave(qa, 1, await orders(u2).save(ORDER(qa)), SAVED, 'the save needs one branch'));
  });
});


const MOVE = (qa: Qa, extra: Record<string, string> = {}) => ({ 'Finished item': qa.code('X-SPREI'), Batch: qa.code('X-B-001'), Quantity: '4', ...extra });

qaTest('TC-APP025-008', TC_APP025_008);

qaTest('TC-APP025-009', async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => refused(qa, 1, await m.save(MOVE(qa, { Batch: '' })), 'item, batch and quantity are required'));
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const f = await finishedLinen(page, qa, it, '4');
  await qa.step(2, async () => refused(qa, 2, await m.save({ 'Finished item': it.finished, Batch: f.batch, Quantity: '9' }), 'not enough stock'));
  await qa.step(3, async () => refused(qa, 3, await m.save(MOVE(qa, { 'Sterile / ward store': '' }), 'Soiled issue'), 'store is missing'));
  // A clean issue to the ward, received; then a soiled issue back from the ward.
  const clean = (await m.create({ 'Finished item': it.finished, Batch: f.batch, Quantity: '2' })).id;
  await m.save({ Document: clean, 'Sterile / ward store': 'GST' }, 'Ward receipt');
  const soiled = (await m.create({ 'Finished item': it.finished, Batch: f.batch, 'Sterile / ward store': 'GST', Quantity: '2' }, 'Soiled issue')).id;
  await qa.step(4, async () => refused(qa, 4, await m.save({ Document: soiled, 'Sterile / ward store': 'GST' }, 'Ward receipt'), 'issue the linen first'));
  await qa.step(5, async () => refused(qa, 5, await m.save({ Document: clean, 'Sterile / ward store': 'GST' }, 'Ward receipt'), 'issue the linen first'));
  await qa.step(6, async () => refused(qa, 6, await m.save({ Document: '' }, 'Ward receipt'), 'document is missing'));
});

qaTest('TC-APP025-010', async ({ page, qa }) => {
  const m = moves(page);
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const f = await finishedLinen(page, qa, it, '8');
  await qa.step(1, async () => {
    const id = (await m.create({ 'Finished item': it.finished, Batch: f.batch, Quantity: '2' })).id;
    const toasts = await m.save({ Document: id, 'Sterile / ward store': 'LDR' }, 'Ward receipt');
    qa.note(1, `a clean issue received into LDR, not the ward store GST: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
  let soiled = '';
  await qa.step(2, async () => {
    const clean = (await m.create({ 'Finished item': it.finished, Batch: f.batch, Quantity: '4' })).id;
    await m.save({ Document: clean, 'Sterile / ward store': 'GST' }, 'Ward receipt');
    soiled = (await m.create({ 'Finished item': it.finished, Batch: f.batch, 'Sterile / ward store': 'GST', Quantity: '4' }, 'Soiled issue')).id;
    const dialogQuantity = await m.save({ Document: soiled, Quantity: '3' }, 'Laundry receipt').catch((e: Error) => [`(${e.message.slice(0, 80)})`]);
    const ldr = (await stockIn(page, it.finished)).get(`LDR ${f.batch}`);
    qa.note(2, `laundry receipt of a soiled issue of 4 with 3 typed: "${dialogQuantity.join(' / ')}"; LDR holds ${ldr} (TBD in the workbook: the whole issue is received, a loss cannot be recorded)`);
  });
  await qa.step(3, async () => {
    const stock = await stockIn(page, it.finished);
    const items = new ItemMasterPage(page);
    await items.open();
    const d = await items.openEdit({ code: it.finished });
    const lines = (await d.getByText('Stock on hand', { exact: true }).locator('xpath=..').getByRole('listitem').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
    qa.note(3, `stock lines of ${it.finished}: ${lines.join(' ; ')} (TBD in the workbook: each receipt sets the expiry 2099-01-01); ${[...stock].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  });
  await qa.step(4, async () => {
    const toasts = await m.save({ Document: soiled }, 'Linen receipt');
    qa.note(4, `"Linen receipt" of a soiled issue (straight back to the linen store): "${toasts.join(' / ')}" (TBD in the workbook: not possible)`);
  });
});

qaTest('TC-APP025-012', TC_APP025_012);

qaTest('TC-APP025-013', async ({ page, qa }) => {
  const m = moves(page);
  const it = await linenItems(page, qa);
  expect(await saveRecipe(page, it)).toContain(SAVED);
  const f = await finishedLinen(page, qa, it, '6');
  await qa.step(1, async () => {
    const id = (await m.create({ 'Finished item': it.finished, Batch: f.batch, Quantity: '4' })).id;
    const s = await stockIn(page, it.finished);
    qa.note(1, `clean issue ${id} never received: GLB ${s.get(`GLB ${f.batch}`) ?? 0}, GST ${s.get(`GST ${f.batch}`) ?? 0}; the row reads "${await m.status(id)}" (TBD in the workbook)`);
  });
  await qa.step(2, async () => {
    const actions = await m.main.getByRole('table').getByRole('row').nth(1).getByRole('button').allInnerTexts();
    qa.note(2, `a row offers ${actions.join(', ') || 'no button'}; the actions of the dialog are ${(await (async () => { await m.openDialog(); const o = await m.dialog.getByRole('combobox', { name: 'Action' }).locator('option').allInnerTexts(); await page.keyboard.press('Escape'); return o.join(', '); })())} (TBD in the workbook: no cancel)`);
  });
});

qaTest('TC-APP025-011', async ({ qa, browser }) => {
  await asAllBranches(browser, async (u2) => {
    await qa.step(1, async () => allBranchesSave(qa, 1, await moves(u2).save(MOVE(qa, { 'Sterile / ward store': STORES['Sterile / ward store'] })), SAVED, 'the save needs one branch'));
  });
});

qaTest('TC-APP025-014', async ({ page, qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/linen', ['Stores and recipe', 'Work orders', 'Circulation'])).join('; ')} (TBD in the workbook)`);
    });
    const it = await linenItems(page, qa);
    expect(await saveRecipe(page, it)).toContain(SAVED);
    const f = await finishedLinen(page, qa, it, '4');
    await qa.step(2, async () => {
      refused(qa, 2, await moves(staff).save({ 'Finished item': it.finished, Batch: f.batch, Quantity: '1' }), 'missing required privilege');
      expect((await stockIn(page, it.finished)).get(`GLB ${f.batch}`)).toBe(4);
    });
    await qa.step(3, async () => {
      const o = orders(page);
      const id = (await o.create(ORDER(qa, { 'Finished item': it.finished, Quantity: '2' }))).id;
      await o.save({ Document: id }, 'Send order');
      refused(qa, 3, await orders(staff).save({ Batch: it.componentBatch, Document: id }, 'Approve order'), 'missing required privilege');
      expect(await o.status(id)).toMatch(/sent/i);
    });
    await qa.step(4, async () => refused(qa, 4, await orders(staff).save({ Document: f.receipt, Amount: '100000' }, 'Charge'), 'missing required privilege'));
    await qa.step(5, async () => {
      const entries = await auditEntries(page, 'linen');
      qa.note(5, `Audit Log, module "linen": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''}; orders of the test were approved and charged by U1 above (TBD in the workbook)`);
    });
  } finally {
    await staff.context().close();
  }
});

const ROUTES: [string, string, string][] = [
  ['TC-APP025-015', '/linen', 'Linen'],
  ['TC-APP025-016', '/linen/moves', 'Circulation'],
  ['TC-APP025-017', '/linen/orders', 'Work orders'],
  ['TC-APP025-018', '/linen/stores', 'Stores and recipe'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
