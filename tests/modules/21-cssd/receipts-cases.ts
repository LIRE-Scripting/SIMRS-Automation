import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import type { Page } from '@playwright/test';
import { stock } from '../05-pharmacy/helpers';
import { approvedRequest, conversionLines, convertFrom, CssdForm, openSaved, refusedWith, STORES } from './docs';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of receipts.spec.ts, shared with the end-to-end chains (chain.run). */

export const ITEM = PHARMACY.para;

/** An approved request of the test (the set and 3 of QA-PARA) and a new receipt form converting it. */
export async function receiptOf(page: Page, qa: Qa): Promise<{ f: CssdForm; request: string }> {
  const batches = await stock(page, qa);
  const r = await approvedRequest(page, ITEM.code, batches[0]);
  const f = new CssdForm(page, 'receipts');
  await f.openNew();
  return { f, request: r.no };
}

/** Types the received quantity of each line ([set, item] in the order of the request). */
export async function receive(f: CssdForm, quantities: string[]): Promise<string[]> {
  const lines = await conversionLines(f);
  expect(lines.length, 'the lines of the request').toBeGreaterThanOrEqual(quantities.length);
  for (const [i, q] of quantities.entries()) await lines[i].received.fill(q);
  return lines.map((l) => l.text);
}

export const TC_APP021_012: QaBody = async ({ page, qa }) => {
  const { f, request } = await receiptOf(page, qa);
  let opened = false;
  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Unsterile Receipt' }).or(f.main.getByRole('link', { name: 'Unsterile Receipt' })).first().click();
    await f.main.getByRole('link', { name: 'New' }).or(f.main.getByRole('button', { name: 'New' })).first().click();
    await expect(f.main.getByText(/^Convert from an approved sterile request\./)).toBeVisible();
  });
  await qa.step(2, async () => {
    await convertFrom(f, request);
    const lines = await conversionLines(f);
    qa.note(2, `lines of ${request}: ${lines.map((l) => l.text).join(' ; ')}`);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
  await qa.step(3, async () => {
    await f.pickStore('CSSD Store', STORES.sterilizing.code);
    await receive(f, ['1', '2']);
    expect(await f.act('Save')).toContain('Receipt saved.');
    opened = await openSaved(f, request);
    if (!opened) qa.note(3, `the receipt of ${request} is saved, but it does not open from the list: its page does not load and nginx answers "504 Gateway Time-out" (found blocker 48)`);
  });
  if (!opened) {
    for (const st of [4, 5, 6]) qa.blocked(st, 48);
    return;
  }
  await qa.step(4, async () => {
    expect(await f.act('Send for Approval')).toContain('Sent for approval. Stock has not moved.');
  });
  await qa.step(5, async () => {
    expect(await f.act('Approve')).toContain('Approved. Items and sets moved to the CSSD store, still unsterile.');
  });
  await qa.step(6, async () => {
    await f.openNew();
    await convertFrom(f, request).catch(() => qa.note(6, `${request} is not offered again under "Convert from"`));
    const lines = await conversionLines(f).catch(() => []);
    qa.note(6, `second receipt of ${request}: ${lines.map((l) => l.text).join(' ; ') || 'no line'}`);
  });
};

export const TC_APP021_013: QaBody = async ({ page, qa }) => {
  const { f, request } = await receiptOf(page, qa);
  const check = async (step: number, action: string, message: string) => {
    const r = await refusedWith(f, action, message);
    if (!r.shown) qa.deviation(step, `The text "${message}"`, `"${r.texts.join(' / ') || 'nothing shown'}"`);
  };
  await qa.step(1, () => check(1, 'Save', 'please select the document to convert.'));
  await convertFrom(f, request);
  await f.pickStore('CSSD Store', STORES.sterilizing.code);
  await qa.step(2, async () => {
    await receive(f, ['1', '4']);
    await check(2, 'Save', 'Received quantity is above the quantity still open.');
  });
  await qa.step(3, async () => {
    await receive(f, ['1', '-1']);
    await check(3, 'Save', 'Received quantity cannot be negative.');
  });
  await qa.step(4, async () => {
    await receive(f, ['0', '0']);
    await check(4, 'Save', 'Receive at least one set or item.');
  });
  await qa.step(5, async () => {
    await receive(f, ['1', '3']);
    await f.pickStore('CSSD Store', STORES.transit.code);
    await check(5, 'Save', 'The CSSD store is not the transit store.');
  });
  qa.notRun(6, 'needs the stock in transit moved away in Inventory before the approval: no Inventory move of the transit store is part of this run');
};

export const TC_APP021_014: QaBody = async ({ page, qa }) => {
  const { f, request } = await receiptOf(page, qa);
  await convertFrom(f, request);
  await f.pickStore('CSSD Store', STORES.sterilizing.code);
  await receive(f, ['1', '3']);
  expect(await f.act('Save')).toContain('Receipt saved.');
  if (!(await openSaved(f, request))) {
    // The saved receipt does not open, so it cannot be sent, approved or cancelled (found blocker 48).
    qa.note(1, `the receipt of ${request} is saved, but it does not open from the list (nginx "504 Gateway Time-out")`);
    qa.blocked(1, 48);
    qa.notRun(2, 'TBD in the workbook: needs packs of the receipt sterilized by a cycle first (TC-APP021-017)');
    return;
  }
  expect(await f.act('Send for Approval')).toContain('Sent for approval. Stock has not moved.');
  expect(await f.act('Approve')).toContain('Approved. Items and sets moved to the CSSD store, still unsterile.');
  await qa.step(1, async () => {
    const toasts = await f.act('Cancel');
    expect(toasts).toContain('Cancelled. An approved receipt puts the request back open for receipt.');
    await f.openNew();
    await convertFrom(f, request);
    qa.note(1, `after the cancel, ${request} is open again: ${(await conversionLines(f)).map((l) => l.text).join(' ; ')} (TBD in the workbook: the stock back in transit)`);
  });
  qa.notRun(2, 'TBD in the workbook: needs packs of the receipt sterilized by a cycle first (TC-APP021-017)');
};
