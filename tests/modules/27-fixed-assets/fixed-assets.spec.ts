import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { screenOpens } from '../shared/screen-opens';
import { AI, approvedOrder, assetAccount, buy, CH, masters, NO_STOCK, register, SLR, TC_APP027_001, TC_APP027_003 } from './cases';

/**
 * 27-fixed-assets.xlsx: classification, register and movement. Codes and
 * numbers carry a token. A purchase ("Buy") takes the internal id of an
 * approved order of Procurement (/procurement/requests, made by 09). The
 * item "X-USG-01" with a batch in "X Gudang umum" is a record of Inventory
 * that is not on the site, so no asset of a test can be installed or
 * commissioned: the steps that need one cite checklist blocker 14. The
 * seed assets (USG-001, USG-SOLD, USG-WO) are not touched. Refusals show
 * "Minified React error #441"; the server text of the workbook is recorded.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});
const moves = (p: Page) => new Desk(p, '/fixed-assets/moves', 'Movement', 'Move');

async function category(page: Page, qa: Qa): Promise<string> {
  const code = qa.code('X-ALKES');
  expect(await masters(page).save({ Code: code, [CH]: qa.name('X Alat kesehatan uji') })).toContain(SAVED);
  return code;
}

qaTest('TC-APP027-001', TC_APP027_001);

qaTest('TC-APP027-002', async ({ page, qa }) => {
  const m = masters(page);
  const cat = await category(page, qa);
  const ACCOUNT = await assetAccount(page, qa);
  await qa.step(1, async () => refused(qa, 1, await m.save({ Code: qa.code('X-ALKES'), [CH]: '' }), 'code and name are required'));
  await qa.step(2, async () => refused(qa, 2, await m.save({ Code: qa.code('X-USG'), [CH]: cat, [AI]: '' }, 'Sub category'), 'Please Select the asset account'));
  await qa.step(3, async () => {
    const toasts = await m.save({ Code: qa.code('X-USG'), [CH]: cat, [AI]: '9999-QA' }, 'Sub category');
    qa.note(3, `an account Finance does not have: "${toasts.join(' / ').slice(0, 100)}"`);
  });
  await qa.step(4, async () => refused(qa, 4, await m.save({ Code: qa.code('X-USG'), [CH]: qa.code('X-TIDAK-ADA'), [AI]: ACCOUNT }, 'Sub category'), 'category is missing'));
  await qa.step(5, async () => refused(qa, 5, await m.save({ Code: cat, [CH]: qa.name('X Alat kesehatan uji') }), 'duplicate'));
  qa.blocked(6, 14);
  qa.note(6, NO_STOCK);
});

qaTest('TC-APP027-003', TC_APP027_003);

qaTest('TC-APP027-004', async ({ page, qa }) => {
  const r = register(page);
  await qa.step(1, async () => refused(qa, 1, await r.save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: '', Quantity: '1' }), 'document is missing'));
  await qa.step(2, async () => {
    const draft = await approvedOrder(page, 'draft');
    const toasts = await r.save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: draft, Quantity: '1' });
    expect(toasts).not.toContain(SAVED);
    qa.note(2, `an order that is not approved: "${toasts.join(' / ').slice(0, 100)}"`);
  });
  await qa.step(3, async () => refused(qa, 3, (await buy(page, qa, { Quantity: '0' })).toasts, 'number, item and quantity are required'));
  const bought = await buy(page, qa);
  expect(bought.toasts).toContain(SAVED);
  await qa.step(4, async () => refused(qa, 4, await r.save({ Code: bought.no, [CH]: '', [SLR]: qa.code('X-SN-0001'), Store: qa.prefix('X Gudang umum'), Batch: qa.code('X-B') }, 'Install'), 'asset and sub category are required'));
  for (const s of [5, 6, 7]) qa.blocked(s, 14);
  qa.note(5, NO_STOCK);
  await qa.step(8, async () => refused(qa, 8, await r.save({ Code: bought.no }, 'Commission'), 'install the asset first'));
});

qaTest('TC-APP027-005', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const order = await approvedOrder(page);
    const a = await register(page).save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: order, Quantity: '1' });
    const b = await register(page).save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: order, Quantity: '1' });
    qa.note(1, `two purchases on one order: "${a.join(' / ')}", "${b.join(' / ')}"`);
  });
  qa.blocked(2, 14);
  qa.blocked(3, 14);
  qa.note(2, NO_STOCK);
});

qaTest('TC-APP027-006', async ({ qa }) => {
  for (const s of [1, 2, 3, 4, 5]) qa.blocked(s, 14);
  qa.note(1, NO_STOCK);
  test.skip(true, 'Blocker 14: a record made in another application (00-blockers-checklist-linked.xlsx | Checklist | row 18)');
});

qaTest('TC-APP027-007', async ({ page, qa }) => {
  const r = register(page);
  qa.blocked(1, 14);
  await qa.step(2, async () => {
    const b = await buy(page, qa);
    expect(b.toasts).toContain(SAVED);
    refused(qa, 2, await r.save({ Code: b.no, Date: addDays(todayWib(), -15), Amount: '2500000' }, 'Depreciate'), 'commission the asset first');
  });
  for (const s of [3, 4, 5]) qa.blocked(s, 14);
  qa.note(1, NO_STOCK);
});

qaTest('TC-APP027-008', async ({ qa }) => {
  for (const s of [1, 2, 3, 4, 5, 6]) qa.blocked(s, 14);
  qa.note(1, NO_STOCK);
  test.skip(true, 'Blocker 14: a record made in another application (00-blockers-checklist-linked.xlsx | Checklist | row 18)');
});

qaTest('TC-APP027-009', async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => {
    await page.goto('/en/fixed-assets');
    await page.getByRole('main').getByRole('link', { name: 'Movement' }).click();
    await expect(m.main.getByRole('heading', { level: 1, name: 'Movement' })).toBeVisible();
    await expect(m.main.getByRole('button', { name: 'Move', exact: true })).toBeVisible();
    await expect(m.main.getByRole('columnheader')).toHaveText(['Code', 'Status', 'Holder', '']);
  });
  await qa.step(2, async () => {
    await m.main.getByRole('button', { name: 'Move', exact: true }).click();
    for (const f of ['Code', CH, SLR, 'Number', 'Date']) await expect(m.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(m.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Move', 'Transfer', 'Issue', 'Return', 'Gate pass', 'Lease']);
  });
  for (const s of [3, 4, 5, 6, 7]) qa.blocked(s, 14);
  qa.note(3, NO_STOCK);
});

qaTest('TC-APP027-010', async ({ page, qa }) => {
  const m = moves(page);
  const b = await buy(page, qa);
  expect(b.toasts).toContain(SAVED);
  await qa.step(1, async () => refused(qa, 1, await m.save({ Code: b.no, [SLR]: '' }), 'asset and location are required'));
  await qa.step(2, async () => refused(qa, 2, await m.save({ Code: b.no, [CH]: '', Date: todayWib() }, 'Issue'), 'asset, holder and date are required'));
  qa.blocked(3, 14);
  await qa.step(4, async () => refused(qa, 4, await m.save({ Code: b.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue'), 'commission the asset first'));
  await qa.step(5, async () => refused(qa, 5, await m.save({ Code: b.no, Date: addDays(todayWib(), 1) }, 'Return'), 'issue the asset first'));
  qa.blocked(6, 14);
  await qa.step(7, async () => refused(qa, 7, await m.save({ Number: '', Code: b.no, [CH]: qa.prefix('X PT Sewa Uji') }, 'Lease'), 'number, asset and vendor are required'));
  await qa.step(8, async () => refused(qa, 8, await m.save({ Code: qa.code('X-FA-TIDAK-ADA'), [SLR]: qa.prefix('X Poli Kandungan') }), 'asset is missing'));
  qa.note(3, NO_STOCK);
});

qaTest('TC-APP027-011', async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => {
    await m.openDialog();
    const fields = await m.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    qa.note(1, `"Move" and "Transfer" share the fields ${fields.join(', ')}; nothing tells them apart`);
  });
  qa.blocked(2, 14);
  qa.blocked(3, 14);
  qa.note(2, NO_STOCK);
});

qaTest('TC-APP027-012', async ({ qa }) => {
  qa.notRun(1, 'the approval and receipt of a purchase order are the 09 Procurement flow (receipts answer HTTP 500, found blocker 31)');
  for (const s of [2, 3, 5]) qa.blocked(s, 14);
  qa.notRun(4, 'needs a commissioned asset and a completed work order (26)');
  qa.notRun(6, 'see step 2');
  qa.note(2, NO_STOCK);
});

const ROUTES: [string, string, string][] = [
  ['TC-APP027-014', '/fixed-assets', 'Fixed assets'],
  ['TC-APP027-015', '/fixed-assets/masters', 'Classification'],
  ['TC-APP027-016', '/fixed-assets/moves', 'Movement'],
  ['TC-APP027-017', '/fixed-assets/register', 'Register'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
