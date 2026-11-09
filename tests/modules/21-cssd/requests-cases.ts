import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { CssdForm, refusedWith, stockByStore, STORES } from './docs';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of requests.spec.ts, shared with the end-to-end chains (chain.run). */

export const ITEM = PHARMACY.para;

export const TC_APP021_008: QaBody = async ({ page, qa }) => {
  const f = new CssdForm(page, 'requests');
  const batches = await stock(page, qa);
  const before = await stockByStore(page, ITEM.code);
  qa.note(1, `stores standing in (found blocker 26): requesting ${STORES.requesting.code}, sterilizing ${STORES.sterilizing.code}, transit ${STORES.transit.code}`);

  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Sterile Request' }).or(f.main.getByRole('link', { name: 'Sterile Request' })).first().click();
    await f.main.getByRole('link', { name: 'New' }).or(f.main.getByRole('button', { name: 'New' })).first().click();
    await expect(f.main.getByText(/^The sterilizing store and the transit store are required before sending\./)).toBeVisible();
  });
  await qa.step(2, async () => {
    await f.stores({ requesting: STORES.requesting.code, sterilizing: STORES.sterilizing.code, transit: STORES.transit.code });
    await f.addSet();
    // QA-PARA is kept in batches: its 3 are taken from BT-1 of this test.
    await f.addItem(ITEM.code, '3', undefined, batches[0]);
    qa.note(2, `${ITEM.code} is kept in batches: the 3 come from batch ${batches[0]} of this test`);
    expect(await f.act('Save')).toContain('Request saved.');
  });
  await qa.step(3, async () => {
    expect(await f.act('Send for Approval')).toContain('Sent for approval. Packing numbers were created.');
    qa.note(3, `packing numbers: ${(await f.packingNumbers()).join(', ') || 'none read'}`);
  });
  await qa.step(4, async () => {
    const labels = f.button('Print labels').or(f.main.getByRole('link', { name: 'Print labels' })).first();
    if (!(await labels.isVisible().catch(() => false))) {
      qa.deviation(4, 'A page of labels, one per packing number', `no "Print labels" button or link on the sent request (buttons: ${(await f.main.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean).join(', ')})`);
      return;
    }
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 8_000 }).catch(() => null), labels.click()]);
    const where = popup ?? page;
    await where.waitForLoadState().catch(() => {});
    qa.note(4, `"Print labels" opens ${popup ? 'a new page' : 'on the same page'}: ${new URL(where.url()).pathname}`);
    if (popup) await popup.close();
    else await page.goBack().catch(() => {});
  });
  await qa.step(5, async () => {
    expect(await f.act('Approve')).toContain('Approved. Items moved to the transit store and sets were booked there, unsterile.');
  });
  await qa.step(6, async () => {
    const after = await stockByStore(page, ITEM.code);
    const delta = (s: string) => (after.get(s) ?? 0) - (before.get(s) ?? 0);
    qa.note(6, `${ITEM.code}: requesting ${delta(STORES.requesting.code)}, transit ${delta(STORES.transit.code)}`);
    expect([delta(STORES.requesting.code), delta(STORES.transit.code)]).toEqual([-3, 3]);
  });
};

/** A new request of the test with the stores and lines given; returns the form. */
export async function newRequest(page: import('@playwright/test').Page, v: { stores?: Parameters<CssdForm['stores']>[0]; set?: boolean; item?: { quantity: string; batch?: string; twice?: boolean } }): Promise<CssdForm> {
  const f = new CssdForm(page, 'requests');
  await f.openNew();
  await f.stores(v.stores ?? { requesting: STORES.requesting.code, sterilizing: STORES.sterilizing.code, transit: STORES.transit.code });
  if (v.set) await f.addSet();
  if (v.item) {
    await f.addItem(ITEM.code, v.item.quantity, undefined, v.item.batch);
    if (v.item.twice) await f.addItem(ITEM.code, v.item.quantity, undefined, v.item.batch).catch(() => {});
  }
  return f;
}

export const TC_APP021_009: QaBody = async ({ page, qa }) => {
  const batches = await stock(page, qa);
  const check = async (step: number, f: CssdForm, action: string, message: string) => {
    const r = await refusedWith(f, action, message);
    if (!r.shown) qa.deviation(step, `The text "${message}"`, `"${r.texts.join(' / ') || 'nothing shown'}"`);
  };
  await qa.step(1, async () => {
    const f = await newRequest(page, { stores: { requesting: STORES.requesting.code }, set: true });
    if ((await f.act('Save')).includes('Request saved.') && (await f.button('Send for Approval').isVisible().catch(() => false))) await check(1, f, 'Send for Approval', 'The sterilizing store and the transit store are required before sending.');
    else qa.note(1, 'the request is not saved without the sterilizing and transit stores');
  });
  await qa.step(2, async () => {
    const f = await newRequest(page, { stores: { requesting: STORES.requesting.code, sterilizing: STORES.sterilizing.code, transit: STORES.requesting.code }, set: true });
    await check(2, f, 'Save', 'The transit store is not the requesting store.');
  });
  await qa.step(3, async () => {
    const f = await newRequest(page, {});
    await check(3, f, 'Save', 'Add at least one set or item.');
  });
  await qa.step(4, async () => {
    const f = await newRequest(page, {});
    await f.button('Add set').click();
    await f.pick(f.main.locator('select').filter({ has: page.locator('option', { hasText: 'SET-OK' }) }).last(), 'SET-OK');
    await check(4, f, 'Save', 'Each line needs an active packing type.');
  });
  await qa.step(5, async () => {
    const f = await newRequest(page, { item: { quantity: '1', batch: batches[0], twice: true } });
    await check(5, f, 'Save', 'That item is already on the request.');
  });
  await qa.step(6, async () => {
    const f = await newRequest(page, { item: { quantity: '999', batch: batches[0] } });
    const saved = await f.act('Save');
    if (saved.includes('Request saved.')) {
      await f.act('Send for Approval');
      await check(6, f, 'Approve', 'Not enough stock in the requesting store.');
    } else if (!saved.some((t) => /Not enough stock|Batch quantities/.test(t))) qa.deviation(6, 'The text "Not enough stock in the requesting store."', `"${saved.join(' / ')}"`);
  });
};

export const TC_APP021_010: QaBody = async ({ page, qa }) => {
  const batches = await stock(page, qa);
  qa.notRun(1, 'needs an item with serial numbers: the items of the run (QA-PARA of 05) are kept in batches');
  await qa.step(2, async () => {
    const f = await newRequest(page, {});
    const items = f.items();
    await items.getByRole('textbox', { name: 'Search an item…' }).fill(ITEM.code);
    await items.getByRole('button', { name: new RegExp(ITEM.code) }).first().click();
    await items.getByRole('spinbutton', { name: 'Quantity' }).first().fill('3');
    await f.pick(items.getByRole('combobox', { name: 'Packing Type' }).last(), 'QA-POUCH');
    await items.getByRole('button', { name: 'Add batch' }).click();
    const codes = items.getByRole('textbox', { name: 'Batch code' });
    await codes.nth(0).fill(batches[0]);
    await codes.nth(1).fill(batches[1]);
    const q = items.getByRole('spinbutton', { name: 'Quantity' });
    await q.nth(1).fill('1');
    await q.nth(2).fill('1');
    const r = await refusedWith(f, 'Save', 'Batch quantities must equal the line quantity.');
    const sent = r.shown ? r : await refusedWith(f, 'Send for Approval', 'Batch quantities must equal the line quantity.');
    if (!sent.shown) qa.deviation(2, 'The text "Batch quantities must equal the line quantity."', `"${sent.texts.join(' / ') || 'nothing shown'}"`);
  });
};

export const TC_APP021_011: QaBody = async ({ page, qa }) => {
  const batches = await stock(page, qa);
  await qa.step(1, async () => {
    const f = await newRequest(page, { set: true, item: { quantity: '1', batch: batches[0] } });
    expect(await f.act('Save')).toContain('Request saved.');
    expect(await f.act('Send for Approval')).toContain('Sent for approval. Packing numbers were created.');
    expect(await f.act('Reject')).toContain('Rejected. Stock did not move.');
  });
  await qa.step(2, async () => {
    const f = await newRequest(page, { set: true });
    expect(await f.act('Save')).toContain('Request saved.');
    expect(await f.act('Cancel')).toContain('Cancelled. Stock did not move.');
  });
  qa.notRun(3, 'TBD in the workbook: a request approved and partly received is cancelled (TC-APP021-014 records the cancel of the receipt side)');
};
