import { NotOffered } from '../../../lib/not-offered';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY } from '../../../lib/inventory-data';
import { PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { ItemMasterPage, StockRequestsPage } from '../../../pages/inventory/InventoryE2EPages';
import { DispenseWizard, IssueLinesPage, typeAhead } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, ownItem, patient, sell, toastsAfter } from '../05-pharmacy/helpers';
import { signedOutJourney, userPage } from '../shared/access';
/**
 * 07-inventory.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10). IT-1 is an item made for each test (code
 * QA-INV-PARA + token) with its own batches, so its stock is the test's own;
 * ST-1 cannot be made (found blocker 26) and the seed store PHARMACY_STORE
 * stands in. "Warehouse 2" and "Pharmacist 2" are U4 (qa.admin3).
 */




export const it1 = INVENTORY.it1;
export const inDays = (n: number) => addDays(todayWib(), n);

/** IT-1 of this test with its batches in the stand-in store. */
export const ownIt1 = (page: Page, qa: Parameters<typeof ownItem>[1], batches: { quantity: string; expiry: string }[]) => ownItem(page, qa, it1.code, it1.name, batches);

/** Returns `qty` of the item's only Issue Lines row; returns the toasts. */
export async function giveBack(page: Page, name: string, qty: string): Promise<string[]> {
  const il = new IssueLinesPage(page);
  const row = () => il.rows().filter({ has: page.getByRole('cell', { name, exact: true }) });
  await il.open();
  await il.showRow(row, name);
  // The new line may take a moment to be listed; when it is on no page, the list does not offer it (found blocker 40).
  for (let i = 0; i < 3 && !(await row().count()); i++) {
    await page.waitForTimeout(10_000);
    await il.open();
    await il.showRow(row, name);
  }
  if (!(await row().count())) throw new NotOffered(`the line of ${name} is on no page of Issue Lines (found blocker 40)`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await row().first().getByRole('spinbutton').first().fill(qty);
  const mark = await toastMark(page);
  await row().first().getByRole('button', { name: 'Return' }).click();
  return toastsAfter(page, mark);
}

/** Freeze days of BR-A (Podomoro) on Stores: the Branch type-ahead opens on another branch. */
export async function freeze(page: Page, days?: string): Promise<{ value: string; toasts: string[] }> {
  await page.goto('/id/inventory/stores');
  await typeAhead(page, page.getByRole('main').getByRole('combobox', { name: 'Branch' }), 'Podomoro');
  const field = page.getByRole('main').getByRole('spinbutton', { name: 'Freeze days' });
  const value = await field.inputValue();
  if (days === undefined) return { value, toasts: [] };
  await field.fill(days);
  const mark = await toastMark(page);
  await page.getByRole('main').getByRole('button', { name: 'Save freeze' }).click();
  return { value, toasts: await toastsAfter(page, mark) };
}

export const serverError = (toasts: string[]) => toasts.some((t) => /React error #441/.test(t));

export const TC_APP007_008 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownIt1(page, qa, [{ quantity: '100', expiry: inDays(400) }]);
  const [b1] = it.batches;
  qa.note(1, `IT-1 of this test: ${it.code}, batch ${b1} (100) standing in for QA-B001; ${PHARMACY_STORE.code} stands in for ST-1 (found blocker 26)`);
  const pt = await patient(page, qa);
  await qa.step(1, async () => {
    expect(await sell(page, pt, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  });
  await qa.step(2, async () => {
    expect((await stockOf(page, it.code)).get(b1)).toBe(90);
  });
  await qa.step(3, async () => {
    expect(await giveBack(page, it.name, '4')).toContain('Returned.');
  });
  await qa.step(4, async () => {
    expect((await stockOf(page, it.code)).get(b1)).toBe(94);
  });
};

export const TC_APP007_009 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownIt1(page, qa, [
    { quantity: '50', expiry: inDays(20) },
    { quantity: '50', expiry: inDays(180) },
  ]);
  const [b2, b1] = it.batches;
  qa.note(1, `IT-1 of this test: ${it.code}; Batch 2 ${b2} (20 days) received before Batch 1 ${b1} (180 days)`);
  const before = await freeze(page);
  qa.note(2, `Freeze days of Podomoro before the test: ${before.value}; set back afterwards`);
  try {
    await qa.step(1, async () => {
      await page.goto('/id/inventory/stores');
      await expect(page.getByRole('main').getByText('A batch is skipped when the days left until expiry are within this limit.')).toBeVisible();
      await expect(page.getByRole('main').getByRole('combobox', { name: 'Branch' })).toBeVisible();
      await expect(page.getByRole('main').getByRole('spinbutton', { name: 'Freeze days' })).toBeVisible();
    });
    await qa.step(2, async () => {
      expect((await freeze(page, INVENTORY.freezeDays)).toasts).toContain('Freeze limit saved.');
    });
    const pt = await patient(page, qa);
    let sold = false;
    await qa.step(3, async () => {
      const toasts = await sell(page, pt, [{ item: it, requested: '5', issued: '5' }]);
      if (serverError(toasts)) {
        qa.note(3, `"Confirm dispense" with Freeze days ${INVENTORY.freezeDays}: HTTP 500 (found blocker 52)`);
        return qa.blocked(3, 52);
      }
      expect(toasts).toContain(CONFIRMED);
      sold = true;
    });
    await qa.step(4, async () => {
      if (!sold) return qa.blocked(4, 52);
      const s = await stockOf(page, it.code);
      qa.note(4, `${b1} ${s.get(b1)}, ${b2} ${s.get(b2)}`);
      if (s.get(b1) !== 45 || s.get(b2) !== 50) qa.deviation(4, `${b1} 45 and ${b2} untouched (50)`, `${b1} ${s.get(b1)}, ${b2} ${s.get(b2)}`);
    });
  } finally {
    if ((await freeze(page)).value !== before.value) await freeze(page, before.value);
  }
};

export const TC_APP007_017 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownIt1(page, qa, [{ quantity: '100', expiry: inDays(400) }]);
  const items = new ItemMasterPage(page);
  const saveEdit = async (d: Locator) => {
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(page, mark);
  };
  let code = it.code;
  await qa.step(1, async () => {
    await items.open();
    const d = await items.openEdit({ code });
    const changed = `${INVENTORY.it1.code}-X-${qa.token()}`;
    await items.fill(d, { code: changed });
    const toasts = await saveEdit(d);
    qa.note(1, `new code ${changed}: "${toasts.join(' / ')}"`);
    if (toasts.some((t) => /updated|saved/i.test(t)) && !toasts.some((t) => /stock|warn/i.test(t))) {
      qa.deviation(1, 'Refused, or a warning that the item is in stock', 'the code is changed with no warning');
      code = changed;
    }
  });
  await qa.step(2, async () => {
    await items.open();
    const d = await items.openEdit({ code });
    await items.fill(d, { active: false });
    const toasts = await saveEdit(d);
    qa.note(2, `Active unticked: "${toasts.join(' / ')}"`);
    if (!toasts.some((t) => /100|stock/i.test(t))) qa.deviation(2, 'A warning that 100 are still in stock', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const pt = await patient(page, qa);
    const w = new DispenseWizard(page);
    await w.open();
    await w.pickPatient(pt);
    const offered = await w.addItem(code).then(() => true, () => false);
    if (offered) qa.deviation(3, 'The inactive item is not offered', `${code} is added to the sale`);
  });
};

export const TC_APP007_024 = async ({ qa }: { qa: Qa }): Promise<void> => {
  qa.notRun(1, 'needs a purchase order for 200 of IT-1 approved in 09 Procurement (TC-APP009-046 makes one); goods are received on /procurement/receipts');
  qa.blocked(2, 31);
  qa.blocked(3, 31);
  qa.note(2, 'the goods receipt ("grn") answers HTTP 500 (found blocker 31)');
};

/** Creates a stock request; returns the toasts. */
export async function createRequest(sr: StockRequestsPage, docNo: string): Promise<string[]> {
  const d = await sr.openNew();
  await d.getByRole('textbox', { name: 'Document number' }).fill(docNo);
  await sr.department(INVENTORY.request.department);
  await d.getByRole('textbox', { name: 'Remarks' }).fill(INVENTORY.request.remarks);
  const mark = await toastMark(sr.page);
  await d.getByRole('button', { name: 'Create' }).click();
  return toastsAfter(sr.page, mark);
}

export const TC_APP007_027 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const sr = new StockRequestsPage(page);
  await sr.open();
  const [own, both] = [qa.code(INVENTORY.request.docNo), qa.code(INVENTORY.request.docNo)];
  expect(await createRequest(sr, own)).toContain('Stock request created.');
  expect(await createRequest(sr, both)).toContain('Stock request created.');
  const approve = async (p: Page, docNo: string) => {
    const s = new StockRequestsPage(p);
    const mark = await toastMark(p);
    await s.row(docNo).getByRole('button', { name: 'Approve' }).click();
    return toastsAfter(p, mark);
  };
  await qa.step(1, async () => {
    await sr.open();
    const toasts = await approve(page, own);
    qa.note(1, `the author approves ${own}: "${toasts.join(' / ')}"`);
    if (toasts.includes('Stock request approved.')) qa.deviation(1, 'Refused: a different user must approve', 'the author approves her own request');
  });
  const w2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const s2 = new StockRequestsPage(w2);
      await Promise.all([sr.open(), s2.open()]);
      const t2 = await approve(w2, both);
      const t1 = await approve(page, both);
      qa.note(2, `Warehouse 2 (U4): "${t2.join(' / ')}"; Warehouse, without reloading: "${t1.join(' / ')}"`);
      expect(t2).toContain('Stock request approved.');
      if (t1.includes('Stock request approved.')) qa.deviation(2, 'Warehouse is told that it is already approved', 'approved a second time');
    });
  } finally {
    await w2.context().close();
  }
  await qa.step(3, async () => {
    const pending = qa.code(INVENTORY.request.docNo);
    expect(await createRequest(sr, pending)).toContain('Stock request created.');
    await sr.open();
    const pendingButtons = (await sr.row(pending).getByRole('button').allInnerTexts()).map((b) => b.trim());
    const openButtons = (await sr.row(both).getByRole('button').allInnerTexts()).map((b) => b.trim());
    qa.note(3, `pending ${pending}: ${pendingButtons.join(', ')}; approved ${both}: ${openButtons.join(', ')}`);
    const missing = [!pendingButtons.includes('Reject') && '"Reject" on the pending request', !openButtons.includes('Cancel') && '"Cancel" on the open one'].filter(Boolean);
    if (missing.length) qa.deviation(3, 'Both are offered', `not offered: ${missing.join(' and ')}`);
  });
};

export const TC_APP007_030 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownIt1(page, qa, [
    { quantity: '50', expiry: inDays(730) },
    { quantity: '50', expiry: inDays(60) },
  ]);
  const [old, young] = it.batches;
  qa.note(1, `IT-1 of this test: ${it.code}; QA-OLD = ${old} (received first, 2 years) and QA-NEW = ${young} (received after it, 60 days); a receipt cannot be dated last month. Freeze days stay as they are: with Freeze days set "Confirm dispense" answers HTTP 500 (found blocker 52), and 60 days is beyond the 30 of the journey anyway`);
  const pt = await patient(page, qa);
  await qa.step(1, async () => {
    expect(await sell(page, pt, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  });
  await qa.step(2, async () => {
    const s = await stockOf(page, it.code);
    qa.note(2, `${old} ${s.get(old)}, ${young} ${s.get(young)}`);
    expect(total(s, it.batches)).toBe(90);
    if (s.get(young) !== 40) qa.deviation(2, `QA-NEW (${young}), which expires first, went down by 10`, `${old} ${s.get(old)}, ${young} ${s.get(young)}: the batch received first is issued first`);
  });
};

export const TC_APP007_036 = ({ qa, browser }: { qa: Qa; browser: Browser }) => signedOutJourney(browser, qa, '/inventory/items', /\/(id|en)\/inventory\/items/);

export const TC_APP007_038 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const it = await ownIt1(page, qa, [{ quantity: '1', expiry: inDays(400) }]);
  const [b1] = it.batches;
  const items = new ItemMasterPage(page);
  const add = async (p: Page, d: Locator, batch: string, qty: string, dbl = false) => {
    const store = d.getByRole('combobox').last();
    const option = store.locator('option').filter({ hasText: PHARMACY_STORE.name }).first();
    await store.selectOption({ label: (await option.innerText()).trim() });
    await d.getByRole('textbox', { name: 'Batch' }).fill(batch);
    await d.locator('input[type="date"]').last().fill(inDays(400));
    await d.getByRole('spinbutton', { name: 'Quantity' }).fill(qty);
    const button = d.getByRole('button', { name: 'Add batch' });
    if (dbl) await button.dblclick();
    else await button.click();
    await p.waitForTimeout(2000);
  };
  const b10 = `B10-${qa.token()}`;
  await qa.step(1, async () => {
    await items.open();
    const d = await items.openEdit(it);
    await add(page, d, b10, '10', true);
    const s = await stockOf(page, it.code);
    qa.note(1, `double-click on "Add batch" with 10: ${b10} holds ${s.get(b10)}`);
    if (s.get(b10) !== 10) qa.deviation(1, '10 are added once', `${b10} holds ${s.get(b10)}`);
  });
  const w2 = await userPage(browser, 'U4');
  try {
    let stale = '';
    await qa.step(2, async () => {
      const i2 = new ItemMasterPage(w2);
      await Promise.all([items.open(), i2.open()]);
      const [d1, d2] = [await items.openEdit(it), await i2.openEdit(it)];
      stale = (await i2.stock(d2).innerText().catch(() => '')).replace(/\s+/g, ' ');
      const before = (await stockOf(w2, it.code)).get(b10) ?? 0;
      await Promise.all([add(page, d1, b10, '10'), add(w2, d2, b10, '10')]);
      const after = (await stockOf(page, it.code)).get(b10) ?? 0;
      qa.note(2, `${b10}: ${before} → ${after}`);
      if (after - before !== 20) qa.deviation(2, 'The batch goes up by 20', `it went up by ${after - before}`);
    });
    await qa.step(3, async () => {
      const last = await ownItem(page, qa, `${it1.code}-L`, `${it1.name} L`, [{ quantity: '1', expiry: inDays(400) }]);
      qa.note(3, `"another batch" with its last unit: ${last.batches[0]} of a second item of the test (${last.code}), so no other batch can serve the second sale`);
      const [pa, pb] = [await patient(page, qa), await patient(page, qa)];
      const [wa, wb] = [new DispenseWizard(page), new DispenseWizard(w2)];
      const prep = async (p: Page, w: DispenseWizard, pt: typeof pa) => {
        await w.open();
        await w.pickPatient(pt);
        await w.addItem(last.code);
        await w.goNext('Set quantities');
        await w.setQuantities(last.name, { requested: '1', issued: '1' });
        await w.goNext('Drug order alerts');
        await w.goNext('Confirm');
        await w.pickStore(PHARMACY_STORE.code);
        return toastMark(p);
      };
      const [ma, mb] = [await prep(page, wa, pa), await prep(w2, wb, pb)];
      await Promise.all([wa.confirm.click(), wb.confirm.click()]);
      const [ta, tb] = [await toastsAfter(page, ma, 20_000), await toastsAfter(w2, mb, 20_000)];
      qa.note(3, `the last unit at the same moment: "${ta.join(' / ')}" and "${tb.join(' / ')}"`);
      const ok = [ta, tb].filter((t) => t.includes(CONFIRMED)).length;
      const s = await stockOf(page, last.code);
      qa.note(3, `${last.batches[0]} now ${s.get(last.batches[0])}`);
      expect(ok, 'at least one sale').toBeGreaterThan(0);
      if (ok === 2) qa.deviation(3, 'One dispense is confirmed; the other is refused with "not enough stock"', `both are confirmed; the batch reads ${s.get(last.batches[0])}`);
      else if (![ta, tb].some((t) => t.join(' ').toLowerCase().includes('not enough stock'))) qa.deviation(3, 'The other is refused with "not enough stock"', `the other reads "${(ta.includes(CONFIRMED) ? tb : ta).join(' / ')}"`);
    });
    await qa.step(4, async () => {
      qa.note(4, `Warehouse 2's dialog, opened before steps 2-3, reads "${stale.slice(0, 160)}"`);
    });
  } finally {
    await w2.context().close();
  }
  await qa.step(5, async () => {
    await items.open();
    const d = await items.openAdd();
    await items.fill(d, { code: `QA-INV-HALF-${qa.token()}`, name: 'QA Item Setengah' });
    let warned = false;
    page.once('dialog', (x) => {
      warned = true;
      void x.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await items.open();
    const kept = await items.dialog('Add Item').isVisible().catch(() => false);
    if (!warned && !kept) qa.deviation(5, 'The entries are kept, or the user is warned', 'the half-filled item is lost with no warning');
  });
};
