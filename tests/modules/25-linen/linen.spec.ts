import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { ITEMS, stores, STORES, TC_APP025_001 } from './cases';

/**
 * 25-linen.xlsx: stores and recipe, work orders and circulation. The branch
 * already names its three linen stores (GLB / LDR / GST); a save of other
 * stores is put back to these at the end of the test. The finished item
 * "X-SPREI", its component "X-KAIN" and their stock in the linen store are
 * records of Inventory (07) that are not on the site: the steps that need
 * them cite checklist blocker 14 (a record made in another application).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});
const orders = (p: Page) => new Desk(p, '/linen/orders', 'Work orders', 'Save order');
const moves = (p: Page) => new Desk(p, '/linen/moves', 'Circulation', 'Clean issue');

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
    qa.blocked(3, 14);
    qa.blocked(4, 14);
    qa.note(3, ITEMS);
    await qa.step(5, async () => {
      const toasts = await s.save({ 'Component / linen store': 'GST', 'Contractor / laundry': 'LDR', 'Sterile / ward store': 'GLB' });
      const rows = (await s.list()).filter((r) => r[0] === 'named').map((r) => r[1]);
      qa.note(5, `other names: "${toasts.join(' / ')}"; the list shows ${rows.join(' ; ')}`);
    });
  } finally {
    await restoreStores(page);
  }
});

qaTest('TC-APP025-003', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
});

const ORDER = (qa: Qa, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-WO-001'),
  'Contractor / laundry': qa.prefix('X Konveksi uji'),
  'Finished item': qa.code('X-SPREI'),
  Quantity: '10',
  ...extra,
});

qaTest('TC-APP025-004', async ({ page, qa }) => {
  const o = orders(page);
  await qa.step(1, async () => {
    await page.goto('/en/linen');
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
  for (const s of [3, 4, 5, 6, 7]) qa.blocked(s, 14);
  qa.note(3, ITEMS);
});

qaTest('TC-APP025-005', async ({ page, qa }) => {
  const o = orders(page);
  await qa.step(1, async () => refused(qa, 1, await o.save(ORDER(qa)), 'recipe is missing'));
  await qa.step(2, async () => refused(qa, 2, await o.save(ORDER(qa, { Quantity: '0' })), 'number, contractor, item and quantity are required'));
  for (const s of [3, 4, 5, 6, 7, 8, 9]) qa.blocked(s, 14);
  qa.note(3, `needs a saved work order: ${ITEMS}`);
});

qaTest('TC-APP025-006', async ({ qa }) => {
  for (const s of [1, 2, 3, 4]) qa.blocked(s, 14);
  qa.note(1, ITEMS);
  test.skip(true, 'Blocker 14: a record made in another application (00-blockers-checklist-linked.xlsx | Checklist | row 18)');
});

qaTest('TC-APP025-007', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
});

const MOVE = (qa: Qa, extra: Record<string, string> = {}) => ({ 'Finished item': qa.code('X-SPREI'), Batch: qa.code('X-B-001'), Quantity: '4', ...extra });

qaTest('TC-APP025-008', async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => {
    await page.goto('/en/linen');
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
  for (const s of [3, 4, 5, 6, 7]) qa.blocked(s, 14);
  qa.note(3, ITEMS);
});

qaTest('TC-APP025-009', async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => refused(qa, 1, await m.save(MOVE(qa, { Batch: '' })), 'item, batch and quantity are required'));
  qa.blocked(2, 14);
  await qa.step(3, async () => refused(qa, 3, await m.save(MOVE(qa, { 'Sterile / ward store': '' }), 'Soiled issue'), 'store is missing'));
  qa.blocked(4, 14);
  qa.blocked(5, 14);
  qa.note(2, ITEMS);
  await qa.step(6, async () => refused(qa, 6, await m.save({ Document: '' }, 'Ward receipt'), 'document is missing'));
});

for (const id of ['TC-APP025-010', 'TC-APP025-012', 'TC-APP025-013']) {
  qaTest(id, async ({ qa }) => {
    const steps = { 'TC-APP025-010': [1, 2, 3, 4], 'TC-APP025-012': [1, 2, 3, 4, 5], 'TC-APP025-013': [1, 2] }[id]!;
    for (const s of steps) qa.blocked(s, 14);
    qa.note(1, ITEMS);
    test.skip(true, 'Blocker 14: a record made in another application (00-blockers-checklist-linked.xlsx | Checklist | row 18)');
  });
}

qaTest('TC-APP025-011', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
});

qaTest('TC-APP025-014', async ({ page, qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/linen', ['Stores and recipe', 'Work orders', 'Circulation'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      refused(qa, 2, await moves(staff).save(MOVE(qa)), 'missing required privilege');
      qa.note(2, `the item has no stock either: ${ITEMS}`);
    });
    // No work order can be saved, so none is sent or received (the finished item and its recipe are records of Inventory, checklist blocker 14).
    for (const s of [3, 4]) qa.blocked(s, 14);
    qa.note(3, ITEMS);
    await qa.step(5, async () => {
      const entries = await auditEntries(page, 'linen');
      qa.note(5, `Audit Log, module "linen": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''}; no order of a user with the right can be approved or charged (blocker 14) (TBD in the workbook)`);
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
