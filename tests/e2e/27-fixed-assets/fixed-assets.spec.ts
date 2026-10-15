import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { screenOpens } from '../shared/screen-opens';
import { account, createAccount } from '../19-finance/helpers';

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

const CH = 'Category / holder';
const AI = 'Account / item';
const SLR = 'Serial / location / reason';
/** A leaf asset account of Finance for the sub category (the workbook's 1501 is not in the chart of accounts). */
async function assetAccount(page: Page, qa: Qa): Promise<string> {
  return (await createAccount(page, account(qa, 'QA-1501', 'QA Aset alkes uji', 'Asset'))).code.toUpperCase();
}
const NO_STOCK = 'the item "X-USG-01" with a batch in "X Gudang umum" is not in Inventory (07), so no test asset can be installed or commissioned';

const masters = (p: Page) => new Desk(p, '/fixed-assets/masters', 'Classification', 'Category');
const register = (p: Page) => new Desk(p, '/fixed-assets/register', 'Register', 'Buy');
const moves = (p: Page) => new Desk(p, '/fixed-assets/moves', 'Movement', 'Move');

async function category(page: Page, qa: Qa): Promise<string> {
  const code = qa.code('X-ALKES');
  expect(await masters(page).save({ Code: code, [CH]: qa.name('X Alat kesehatan uji') })).toContain(SAVED);
  return code;
}

/** The id of an approved order of Procurement (made by 09). */
async function approvedOrder(page: Page, state = 'approved'): Promise<string> {
  await page.goto('/en/procurement/requests');
  await page.waitForLoadState('networkidle').catch(() => {});
  const id = (await page.getByRole('main').innerText()).match(new RegExp(`${state} \\S+ ([0-9a-f-]{36})`))?.[1];
  expect(id, `a ${state} row on /procurement/requests`).toBeTruthy();
  return id!;
}

/** Register rows as [code, status, holder]. */
async function registerRows(page: Page, find?: string): Promise<string[][]> {
  const r = register(page);
  await r.open();
  if (find) {
    await r.main.getByRole('textbox').first().fill(find);
    await r.main.getByRole('button', { name: 'Find asset number' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return r.rows().evaluateAll((rs) => rs.filter((x) => x.querySelectorAll('td').length >= 3).map((x) => Array.from(x.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.trim() ?? '')));
}

async function buy(page: Page, qa: Qa, extra: Record<string, string> = {}): Promise<{ toasts: string[]; no: string }> {
  const no = qa.code('X-FA-001');
  const toasts = await register(page).save({ Number: no, [AI]: qa.code('X-USG-01'), Document: await approvedOrder(page), Quantity: '1', ...extra });
  return { toasts, no };
}

qaTest('TC-APP027-001', async ({ page, qa }) => {
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
});

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

qaTest('TC-APP027-003', async ({ page, qa }) => {
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
});

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
