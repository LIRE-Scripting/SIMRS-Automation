import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, saveIfOffered, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { AI, approvedOrder, assetAccount, assetItem, ASSET_STORE, buy, CH, commissionedAsset, masters, register, registerRows, SLR, subCategory, TC_APP027_001, TC_APP027_003, type Asset } from './cases';
import { newItem } from '../07-inventory/cases';
import { raise } from '../09-procurement/cases';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of fixed-assets.spec.ts, shared with the end-to-end chains (chain.run). */

export const moves = (p: Page) => new Desk(p, '/fixed-assets/moves', 'Movement', 'Move');

export async function category(page: Page, qa: Qa): Promise<string> {
  const code = qa.code('X-ALKES');
  expect(await masters(page).save({ Code: code, [CH]: qa.name('X Alat kesehatan uji') })).toContain(SAVED);
  return code;
}

export const TC_APP027_002: QaBody = async ({ page, qa }) => {
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
  await qa.step(6, async () => {
    // A sub category of the test with an installed asset (an item of the test in Inventory, blocker 14 until 2026-11-01).
    const a = await commissionedAsset(page, qa, 'install');
    refused(qa, 6, await m.save({ Code: a.sub }, 'Deactivate'), 'sub category has assets');
  });
};

export const TC_APP027_004: QaBody = async ({ page, qa }) => {
  const r = register(page);
  await qa.step(1, async () => refused(qa, 1, await r.save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: '', Quantity: '1' }), 'document is missing'));
  await qa.step(2, async () => {
    // A purchase request of the test, saved and not sent: the list shows its first rows only, so a draft row of it may be absent.
    const draft = await raise(new ProcurementDeskPage(page), await newItem(page, qa));
    const toasts = await r.save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: draft, Quantity: '1' });
    expect(toasts).not.toContain(SAVED);
    qa.note(2, `an order that is not approved: "${toasts.join(' / ').slice(0, 100)}"`);
  });
  await qa.step(3, async () => refused(qa, 3, (await buy(page, qa, { Quantity: '0' })).toasts, 'number, item and quantity are required'));
  const bought = await buy(page, qa);
  expect(bought.toasts).toContain(SAVED);
  await qa.step(4, async () => refused(qa, 4, await r.save({ Code: bought.no, [CH]: '', [SLR]: qa.code('X-SN-0001'), Store: qa.prefix('X Gudang umum'), Batch: qa.code('X-B') }, 'Install'), 'asset and sub category are required'));
  // An item of the test in Inventory with 5 in one batch of the general store, and a sub category (blocker 14 until 2026-11-01).
  const item = await assetItem(page, qa);
  const sub = await subCategory(page, qa);
  const install = async (extra: Record<string, string>) => {
    const a = await commissionedAsset(page, qa, 'buy', { item, sub });
    return r.save({ Code: a.no, [CH]: sub, [SLR]: a.serial, Store: ASSET_STORE.code, Batch: item.batch, Quantity: '1', Document: a.id, ...extra }, 'Install');
  };
  await qa.step(5, async () => refused(qa, 5, await install({ Quantity: '2' }), 'Please Add the Serial Nos Up to the install Quantity'));
  await qa.step(6, async () => refused(qa, 6, await install({ Quantity: '9', [SLR]: Array.from({ length: 9 }, (_, i) => qa.code(`X-SN-${i}`)).join(',') }), 'The Available Stock Qty is Only'));
  await qa.step(7, async () => refused(qa, 7, await install({ [CH]: qa.code('X-SUB-TIDAK-ADA') }), 'sub category is missing'));
  await qa.step(8, async () => refused(qa, 8, await r.save({ Code: bought.no }, 'Commission'), 'install the asset first'));
};

export const TC_APP027_005: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    const order = await approvedOrder(page);
    const a = await register(page).save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: order, Quantity: '1' });
    const b = await register(page).save({ Number: qa.code('X-FA-001'), [AI]: qa.code('X-USG-01'), Document: order, Quantity: '1' });
    qa.note(1, `two purchases on one order: "${a.join(' / ')}", "${b.join(' / ')}"`);
  });
  const item = await assetItem(page, qa);
  const sub = await subCategory(page, qa);
  await qa.step(2, async () => {
    const first = await commissionedAsset(page, qa, 'install', { item, sub });
    const second = await commissionedAsset(page, qa, 'buy', { item, sub });
    const toasts = await register(page).save({ Code: second.no, [CH]: sub, [SLR]: first.serial, Store: ASSET_STORE.code, Batch: item.batch, Quantity: '1', Document: second.id }, 'Install');
    qa.note(2, `a second asset installed with the serial ${first.serial} of the first: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(3, async () => {
    const a = await commissionedAsset(page, qa, 'buy', { item, sub });
    const serials = [qa.code('X-SN-A'), qa.code('X-SN-B'), qa.code('X-SN-C')];
    const tried: string[] = [];
    for (const sep of [',', ';', ' ']) {
      const toasts = await register(page).save({ Code: a.no, [CH]: sub, [SLR]: serials.join(sep), Store: ASSET_STORE.code, Batch: item.batch, Quantity: '3', Document: a.id }, 'Install');
      tried.push(`"${sep}": ${toasts.join(' / ')}`);
      if (toasts.includes(SAVED)) break;
    }
    qa.note(3, `three serial numbers in one input: ${tried.join('; ')} (TBD in the workbook)`);
  });
};

export const TC_APP027_006: QaBody = async ({ page, qa }) => {
  const r = register(page);
  const a = await commissionedAsset(page, qa);
  const b = await commissionedAsset(page, qa, 'commission', { item: a.item, sub: a.sub });
  await qa.step(1, async () => {
    await r.open();
    await r.main.getByRole('textbox').first().fill(a.no);
    await r.main.getByRole('button', { name: 'Find asset number' }).click();
    await r.rows().filter({ hasText: a.no }).first().getByRole('button', { name: 'Use' }).click();
    await r.main.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(r.dialog.getByRole('textbox', { name: 'Code', exact: true })).toHaveValue(a.no);
    await page.keyboard.press('Escape');
  });
  await qa.step(2, async () => {
    const lastMonthEnd = addDays(`${todayWib().slice(0, 8)}01`, -1);
    const toasts = await r.save({ Code: a.no, Date: lastMonthEnd, Amount: '2500000' }, 'Depreciate');
    expect(toasts).toContain(SAVED);
    qa.note(2, `depreciation of ${a.no} to ${lastMonthEnd}: "${toasts.join(' / ')}" (TBD in the workbook: the voucher in Finance)`);
  });
  await qa.step(3, async () => {
    const cols = (await r.main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim()).filter(Boolean);
    qa.note(3, `the register shows ${cols.join(', ')}; no cost, accumulated depreciation or book value (TBD in the workbook)`);
  });
  await qa.step(4, async () => {
    expect(await r.save({ Code: a.no, Amount: '40000000' }, 'Sell')).toContain(SAVED);
    const row = (await registerRows(page, a.no)).find((x) => x[0] === a.no);
    qa.note(4, `row "${row?.join(' | ')}" (TBD in the workbook: the sale voucher in Finance)`);
    expect(row?.[1]).toMatch(/sold/i);
  });
  await qa.step(5, async () => {
    expect(await r.save({ Code: b.no, [SLR]: qa.prefix('X Rusak berat') }, 'Write off')).toContain(SAVED);
    const row = (await registerRows(page, b.no)).find((x) => x[0] === b.no);
    qa.note(5, `row "${row?.join(' | ')}"`);
    expect(row?.[1]).toMatch(/written|write/i);
  });
};

export const TC_APP027_007: QaBody = async ({ page, qa }) => {
  const r = register(page);
  const a = await commissionedAsset(page, qa);
  await qa.step(1, async () => refused(qa, 1, await r.save({ Code: a.no, Date: addDays(todayWib(), 30), Amount: '2500000' }, 'Depreciate'), 'end date is in the future'));
  await qa.step(2, async () => {
    const b = await buy(page, qa);
    expect(b.toasts).toContain(SAVED);
    refused(qa, 2, await r.save({ Code: b.no, Date: addDays(todayWib(), -15), Amount: '2500000' }, 'Depreciate'), 'commission the asset first');
  });
  await qa.step(3, async () => refused(qa, 3, await r.save({ Code: a.no, Date: addDays(todayWib(), -15), Amount: '0' }, 'Depreciate'), 'asset, date and amount are required'));
  await qa.step(4, async () => refused(qa, 4, await r.save({ Code: a.no, Amount: '0' }, 'Sell'), 'asset and amount are required'));
  await qa.step(5, async () => refused(qa, 5, await r.save({ Code: a.no, [SLR]: '' }, 'Write off'), 'asset and reason are required'));
};

export const TC_APP027_008: QaBody = async ({ page, qa }) => {
  const r = register(page);
  const m = moves(page);
  const a = await commissionedAsset(page, qa);
  const day = addDays(todayWib(), -1);
  await qa.step(1, async () => {
    const first = await r.save({ Code: a.no, Date: day, Amount: '1000000' }, 'Depreciate');
    const second = await r.save({ Code: a.no, Date: day, Amount: '1000000' }, 'Depreciate');
    qa.note(1, `the same depreciation twice: "${first.join(' / ')}", then "${second.join(' / ')}" (TBD in the workbook: two vouchers)`);
  });
  await qa.step(2, async () => {
    const toasts = await r.save({ Code: a.no, Date: day, Amount: '999000000' }, 'Depreciate');
    qa.note(2, `a depreciation of 999000000 on an item of 40000000: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(3, async () => {
    const b = await commissionedAsset(page, qa, 'commission', { item: a.item, sub: a.sub });
    const issued = await m.save({ Code: b.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue');
    const sold = await r.save({ Code: b.no, Amount: '5000000' }, 'Sell');
    qa.note(3, `an asset issued to a holder ("${issued.join(' / ')}"), then sold: "${sold.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(4, async () => {
    await r.save({ Code: a.no, Amount: '5000000' }, 'Sell');
    const toasts = await r.save({ Code: a.no, Date: day, Amount: '1000000' }, 'Depreciate');
    qa.note(4, `a depreciation after the sale: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(5, async () => {
    await r.open();
    const actions = await r.rows().first().getByRole('button').allInnerTexts();
    qa.note(5, `a row offers ${actions.join(', ') || 'no button'}; a sale or a write-off is one save by one user, with no approval (TBD in the workbook)`);
  });
  await qa.step(6, async () => {
    await r.openDialog();
    await r.dialog.getByRole('button', { name: 'Next' }).click();
    const amount = await r.dialog.getByRole('textbox', { name: 'Amount', exact: true }).inputValue();
    await page.keyboard.press('Escape');
    qa.note(6, `the dialog opens with Amount "${amount}" (TBD in the workbook: an asset sold for 1000 when "Sell" is saved as it opens)`);
  });
};

export const TC_APP027_009: QaBody = async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => {
    await page.goto('/id/fixed-assets');
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
  await page.keyboard.press('Escape');
  const a = await commissionedAsset(page, qa);
  const holder = async () => (await registerRows(page, a.no)).find((x) => x[0] === a.no)?.[2] ?? '';
  await qa.step(3, async () => expect(await m.save({ Code: a.no, [SLR]: qa.prefix('X Poli Kandungan') })).toContain(SAVED));
  await qa.step(4, async () => {
    expect(await m.save({ Code: a.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue')).toContain(SAVED);
    expect(await holder()).toContain(qa.prefix('X dr. Uji'));
  });
  await qa.step(5, async () => {
    expect(await m.save({ Code: a.no, Date: todayWib() }, 'Return')).toContain(SAVED);
    const after = await holder();
    expect(after).not.toContain(qa.prefix('X dr. Uji'));
    if (!/^(—|-|)$/.test(after)) qa.deviation(5, 'The column "Holder" is empty again', `the column shows the last location "${after}"`);
  });
  await qa.step(6, async () => {
    expect(await m.save({ Code: a.no }, 'Gate pass')).toContain(SAVED);
    qa.note(6, 'TBD in the workbook: what a gate pass records and whether it can be printed (the save answers "Saved." only)');
  });
  await qa.step(7, async () => expect(await m.save({ Number: qa.code('X-SEWA'), Code: a.no, [CH]: qa.prefix('X PT Sewa Uji') }, 'Lease')).toContain(SAVED));
};

export const TC_APP027_010: QaBody = async ({ page, qa }) => {
  const m = moves(page);
  const b = await buy(page, qa);
  expect(b.toasts).toContain(SAVED);
  await qa.step(1, async () => refused(qa, 1, await m.save({ Code: b.no, [SLR]: '' }), 'asset and location are required'));
  await qa.step(2, async () => refused(qa, 2, await m.save({ Code: b.no, [CH]: '', Date: todayWib() }, 'Issue'), 'asset, holder and date are required'));
  const a = await commissionedAsset(page, qa);
  await qa.step(3, async () => {
    expect(await m.save({ Code: a.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue')).toContain(SAVED);
    refused(qa, 3, await m.save({ Code: a.no, [CH]: qa.prefix('X dr. Dua'), Date: todayWib() }, 'Issue'), 'The FixedAsset is Already issued, and that documents are Still Pending');
  });
  await qa.step(4, async () => refused(qa, 4, await m.save({ Code: b.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue'), 'commission the asset first'));
  await qa.step(5, async () => refused(qa, 5, await m.save({ Code: b.no, Date: addDays(todayWib(), 1) }, 'Return'), 'issue the asset first'));
  await qa.step(6, async () => refused(qa, 6, await m.save({ Code: a.no, Date: addDays(todayWib(), -5) }, 'Return'), 'The Return Date Should not be Less than the Issue Date'));
  await qa.step(7, async () => refused(qa, 7, await m.save({ Number: '', Code: b.no, [CH]: qa.prefix('X PT Sewa Uji') }, 'Lease'), 'number, asset and vendor are required'));
  await qa.step(8, async () => refused(qa, 8, await m.save({ Code: qa.code('X-FA-TIDAK-ADA'), [SLR]: qa.prefix('X Poli Kandungan') }), 'asset is missing'));
};

export const TC_APP027_011: QaBody = async ({ page, qa }) => {
  const m = moves(page);
  await qa.step(1, async () => {
    await m.openDialog();
    const fields = await m.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    qa.note(1, `"Move" and "Transfer" share the fields ${fields.join(', ')}; nothing tells them apart`);
  });
  await page.keyboard.press('Escape');
  const a = await commissionedAsset(page, qa);
  await qa.step(2, async () => {
    const toasts = await m.save({ Code: a.no, [CH]: 'QA siapa saja 123', Date: todayWib() }, 'Issue');
    qa.note(2, `a holder that is no employee ("QA siapa saja 123"): "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
  await qa.step(3, async () => {
    await m.save({ Code: a.no, Date: todayWib() }, 'Return');
    await register(page).save({ Code: a.no, Amount: '5000000' }, 'Sell');
    const toasts = await m.save({ Code: a.no, [SLR]: qa.prefix('X Poli Anak') });
    qa.note(3, `"Move" of a sold asset: "${toasts.join(' / ')}" (TBD in the workbook)`);
  });
};

export const TC_APP027_012: QaBody = async ({ page, qa }) => {
  qa.notRun(1, 'the approval and receipt of a purchase order are the 09 Procurement flow (receipts answer HTTP 500, found blocker 31)');
  let a: Asset | null = null;
  await qa.step(2, async () => {
    a = await commissionedAsset(page, qa);
    const row = (await registerRows(page, a.no)).find((x) => x[0] === a!.no);
    expect(row?.[1]).toMatch(/commissioned/i);
  });
  await qa.step(3, async () => {
    const m = moves(page);
    expect(await m.save({ Code: a!.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue')).toContain(SAVED);
    expect(await m.save({ Code: a!.no, [SLR]: qa.prefix('X Poli Kandungan') })).toContain(SAVED);
  });
  qa.notRun(4, 'a completed work order of 26-maintenance for the asset: its approval needs a budget head with a balance, possible since 2026-11-01; written with the maintenance journeys');
  await qa.step(5, async () => {
    const r = register(page);
    const shown: string[] = [];
    for (let i = 1; i <= 3; i++) shown.push((await r.save({ Code: a!.no, Date: addDays(`${todayWib().slice(0, 8)}01`, -(i - 1) * 30 - 1), Amount: '1000000' }, 'Depreciate')).join(' / '));
    shown.push((await r.save({ Code: a!.no, Amount: '35000000' }, 'Sell')).join(' / '));
    qa.note(5, `three depreciations and a sale: ${shown.join('; ')} (the four vouchers in Finance are TBD in the workbook)`);
    expect(shown.every((x) => x.includes(SAVED))).toBe(true);
  });
  await qa.step(6, async () => {
    const cols = (await register(page).main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim()).filter(Boolean);
    qa.note(6, `the register row has ${cols.join(', ')}; no screen shows the history of one asset (TBD in the workbook)`);
  });
};

export const TC_APP027_013: QaBody = async ({ page, qa, browser }) => {
  // Precondition (made by U1): an asset bought on Register.
  const b = await buy(page, qa);
  expect(b.toasts).toContain(SAVED);
  const before = (await registerRows(page, b.no)).find((x) => x[0] === b.no);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/fixed-assets', ['Classification', 'Register', 'Movement'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      refused(qa, 2, await moves(staff).save({ Code: b.no, [CH]: qa.prefix('X dr. Uji'), Date: todayWib() }, 'Issue'), 'missing required privilege');
    });
    await qa.step(3, async () => {
      const toasts = await saveIfOffered(register(staff), { Code: b.no, Date: todayWib() }, 'Write off');
      if (toasts === null) qa.note(3, 'Register offers no "Write off" action');
      else refused(qa, 3, toasts, 'missing required privilege');
      expect((await registerRows(page, b.no)).find((x) => x[0] === b.no)?.[1]).toBe(before?.[1]);
    });
    await qa.step(4, async () => {
      refused(qa, 4, await register(staff).save({ Code: b.no, Date: addDays(todayWib(), -15), Amount: '2500000' }, 'Depreciate'), 'missing required privilege');
    });
    await qa.step(5, async () => {
      const entries = await auditEntries(page, 'fixed');
      qa.note(5, `Audit Log, module "fixed": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''} (TBD in the workbook: no entry is written)`);
    });
  } finally {
    await staff.context().close();
  }
};

export const ROUTES: [string, string, string][] = [
  ['TC-APP027-014', '/fixed-assets', 'Fixed assets'],
  ['TC-APP027-015', '/fixed-assets/masters', 'Classification'],
  ['TC-APP027-016', '/fixed-assets/moves', 'Movement'],
  ['TC-APP027-017', '/fixed-assets/register', 'Register'],
];
