import { NotOffered } from '../../../lib/not-offered';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PASSWORD } from '../../../lib/config';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { DispenseWizard, IssueLinesPage, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { WardSupply } from '../04-inpatient/helpers';
import { marginOnSite, saveItemPrice } from '../14-hospital-accounts/helpers';
import { BILLING } from '../../../lib/billing-data';
import { authorise, placeRestricted, remark } from '../03-patient-care/cases';
import { signedOutJourney, userPage } from '../shared/access';
import { CONFIRMED, expectRefused, ownItem, patient, sell, stock, storeNote, toConfirm, toastsAfter } from './helpers';
import { admittedWithOrder, dispensedGroup, fullyReturnedLine, dispenseGroup, drug, groupButton, groupOrders, pickGroup, wardGroups } from './ward';
/**
 * 05-pharmacy.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10) that need no cashier: the restricted order,
 * ward supply (group, dispense, receive, refuse, return request), batches,
 * the return rule, items that cannot be priced, returns and their vouchers,
 * and Pharmacy without a session. ST-IP cannot be made (found blocker 26):
 * the seed store PHARMACY_STORE stands in. The cases that need the cashier
 * counter are in evaluation-cashier.spec.ts.
 */



export const para = PHARMACY.para;
export const ORIP_QTY = PHARMACY.orIp.quantity;

/** Issue Lines rows of an item name (exact), shown on the page that holds them. */
export async function issueRows(page: Page, name: string) {
  const il = new IssueLinesPage(page);
  const row = () => il.rows().filter({ has: page.getByRole('cell', { name, exact: true }) });
  await il.open();
  await il.showRow(row, name);
  await page.waitForLoadState('networkidle').catch(() => {});
  return { il, row };
}

export const TC_APP005_003 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  await stock(page, qa);
  const pt = await patient(page, qa);
  const c = new ConsultationPage(page);
  await c.openFor(pt);
  await placeRestricted(c, pt, { drug: para.name });
  qa.note(1, `the restricted order is written for ${para.name} (in stock in ${PHARMACY_STORE.code}) instead of Meropenem 1g Injection, which no store holds`);
  const o = new OrdersPage(page);
  await qa.step(1, async () => {
    await o.open('outpatient');
    await expect(o.heading).toBeVisible();
    await expect(o.row(pt.fullName)).toHaveCount(0);
  });
  await qa.step(2, async () => {
    await c.openFor(pt);
    const row = c.restrictedList().getByRole('listitem').filter({ hasText: pt.fullName }).first();
    await remark(row).fill(qa.prefix('QA kultur positif'));
    const mark = await toastMark(page);
    await authorise(row).click();
    const toasts = await toastsAfter(page, mark);
    qa.note(2, `Authorise: "${toasts.join(' / ') || 'no toast'}"`);
    expect(toasts.join(' ')).not.toMatch(/fail|error/i);
  });
  await qa.step(3, async () => {
    await o.open('outpatient');
    await expect(o.row(pt.fullName)).toHaveCount(1);
  });
  await qa.step(4, async () => {
    await o.pickStore(PHARMACY_STORE.code);
    await o.row(pt.fullName).getByRole('link').first().click();
    const w = new DispenseWizard(page);
    await expect(w.marker('Select items')).toBeVisible();
    await w.goNext('Set quantities');
    await w.goNext('Drug order alerts');
    await w.goNext('Confirm');
    await w.pickStore(PHARMACY_STORE.code);
    const mark = await toastMark(page);
    await w.confirm.click();
    expect(await toastsAfter(page, mark, 20_000)).toContain(CONFIRMED);
  });
};

export const TC_APP005_005 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const pt = await admittedWithOrder(page, qa);
  const ws = new WardSupply(page);
  let group = '';
  await qa.step(1, async () => {
    await ws.open();
    for (const h of ['Store', 'Ward supply', 'Stay']) await expect(ws.main.getByRole('heading', { level: 2, name: h })).toBeVisible();
    await expect(ws.main.getByText('Choose a store, then tick the orders to group.')).toBeVisible();
  });
  await qa.step(2, async () => {
    storeNote(qa, 2);
    const g = await groupOrders(page, pt);
    group = g.group;
    qa.note(2, `"Group for this store": "${g.toasts.join(' / ')}"; new "Ward group" option "${group}"`);
    expect(g.toasts).toContain('Orders grouped for the pharmacy queue.');
  });
  const o = new OrdersPage(page);
  await qa.step(3, async () => {
    await o.open('inpatient');
    await expect(o.main.getByRole('combobox', { name: 'Ward group' })).toBeVisible();
    for (const r of await o.rows().all()) expect((await o.cells(r))[2]).toBe('Inpatient');
  });
  let w: DispenseWizard | undefined;
  await qa.step(4, async () => {
    const options = await wardGroups(page);
    qa.note(4, `"Ward group" offers: ${options.join(', ')}`);
    if (!group) {
      qa.deviation(4, 'Picks the group in "Ward group": only the grouped orders are listed', `the options name no group (${[...new Set(options)].join(', ')}), so the group of this test cannot be told apart; the order is opened from its row`);
      return;
    }
    await pickGroup(o, group);
    const names = [...new Set((await o.rows().allInnerTexts()).map((t) => t.split('\t')[0].trim()))];
    qa.note(4, `rows of the group: ${names.join(', ')}; Store "${await o.store.inputValue()}"`);
    expect(names).toEqual([pt.fullName]);
    if (!(await o.store.inputValue()).includes(PHARMACY_STORE.code)) qa.deviation(4, 'Store switches to ST-IP (the store of the group)', `Store reads "${await o.store.inputValue()}"`);
  });
  await qa.step(5, async () => {
    const d = await dispenseGroup(page, pt, group);
    w = d.w;
    expect(d.toasts).toContain(CONFIRMED);
    await expect(w.main.getByText(`Issued ${ORIP_QTY} of ${ORIP_QTY}`, { exact: true })).toBeVisible();
  });
  await qa.step(6, async () => {
    await ws.open();
    const b = await groupButton(ws, group, 'Receive');
    const toasts = await ws.decide(b, 'Receive');
    qa.note(6, `Receive: "${toasts.join(' / ')}"`);
    expect(toasts.some((t) => t.startsWith('Ward receipt recorded.'))).toBe(true);
  });
  await qa.step(7, async () => {
    const options = await wardGroups(page);
    qa.note(7, `"Ward group" after the receipt: ${options.join(', ')}`);
    if (group) expect(options).not.toContain(group);
  });
};

export const TC_APP005_006 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const { pt, group } = await dispensedGroup(page, qa);
  storeNote(qa, 1);
  const ws = new WardSupply(page);
  await qa.step(1, async () => {
    await ws.open();
    const toasts = await ws.decide(await groupButton(ws, group, 'Refuse'), 'Refuse');
    qa.note(1, `Refuse: "${toasts.join(' / ')}"`);
    expect(toasts.some((t) => t.startsWith('Delivery refused.'))).toBe(true);
    if (!toasts.includes('Delivery refused. The pharmacy return is posted.')) qa.note(1, 'the toast names the BPJS task instead of the pharmacy return');
  });
  await qa.step(2, async () => {
    void pt;
    const found = await fullyReturnedLine(page, ORIP_QTY);
    qa.note(2, `Issue Lines names the item, not the patient: a line of ${drug} with Issued and Returned both ${ORIP_QTY} and no Return control is looked for`);
    if (!found) qa.deviation(2, 'The line for OR-IP shows Returned equal to Issued; the Return control shows "—"', `no line of ${drug} on Issue Lines shows Issued and Returned ${ORIP_QTY}`);
  });
};

export const TC_APP005_013 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const today = todayWib();
  const it = await ownItem(page, qa, para.code, para.name, [
    { quantity: PHARMACY.bt1.quantity, expiry: addDays(today, PHARMACY.bt1.daysAhead) },
    { quantity: PHARMACY.bt2.quantity, expiry: addDays(today, PHARMACY.bt2.daysAhead) },
  ]);
  const [bt1, bt2] = it.batches;
  qa.note(1, `an item of this test (${it.code}) stands in for QA-PARA, so that no older batch of other tests is drawn first: ${bt1} (10, ${PHARMACY.bt1.daysAhead} days) received before ${bt2} (10, ${PHARMACY.bt2.daysAhead} days)`);
  const pt = await patient(page, qa);
  const show = (s: Map<string, number>) => `${bt1} ${s.get(bt1)}, ${bt2} ${s.get(bt2)}`;
  await qa.step(1, async () => {
    const s = await stockOf(page, it.code);
    expect([s.get(bt1), s.get(bt2)]).toEqual([10, 10]);
  });
  await qa.step(2, async () => {
    const w = await toConfirm(page, pt, [{ item: it, requested: '5', issued: '3' }]);
    await w.pickStore(PHARMACY_STORE.code);
    const mark = await toastMark(page);
    await w.confirm.click();
    expect(await toastsAfter(page, mark, 20_000)).toContain(CONFIRMED);
    await expect(w.main.getByText('Issued 3 of 5', { exact: true })).toBeVisible();
  });
  await qa.step(3, async () => {
    const s = await stockOf(page, it.code);
    qa.note(3, show(s));
    expect(total(s, it.batches)).toBe(17);
    if (s.get(bt1) !== 7) qa.deviation(3, `${bt1} 7, ${bt2} 10 (the batch received first)`, show(s));
  });
  await qa.step(4, async () => {
    expect(await sell(page, pt, [{ item: it, requested: '12', issued: '12' }])).toContain(CONFIRMED);
  });
  await qa.step(5, async () => {
    const s = await stockOf(page, it.code);
    qa.note(5, show(s));
    expect(total(s, it.batches)).toBe(5);
    if (s.get(bt1) !== 0 || s.get(bt2) !== 5) qa.deviation(5, `${bt1} 0, ${bt2} 5`, show(s));
  });
};

export const TC_APP005_018 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const { pt, group } = await dispensedGroup(page, qa);
  const ws = new WardSupply(page);
  await ws.open();
  await ws.decide(await groupButton(ws, group, 'Receive'), 'Receive');
  const stayCard = () => ws.card('Stay');
  const line = () => stayCard().locator('li, tr').filter({ hasText: drug }).first();
  await qa.step(1, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    await expect(line()).toBeVisible();
    qa.note(1, `the line: "${(await line().innerText()).replace(/\s+/g, ' ')}"`);
  });
  const request = async (qty: string) => {
    await line().getByRole('spinbutton').first().fill(qty);
    const mark = await toastMark(page);
    await line().getByRole('button', { name: 'Request return' }).click();
    return toastsAfter(page, mark);
  };
  await qa.step(2, async () => {
    expect(await request('2')).toContain('Return request raised. The pharmacist posts it from issue lines.');
  });
  const il = new IssueLinesPage(page);
  const reqRow = () => il.rows().filter({ hasText: 'Request 2' }).filter({ has: page.getByRole('cell', { name: drug, exact: true }) });
  await qa.step(3, async () => {
    await il.open();
    await il.showRow(reqRow, drug);
    await expect(reqRow().first()).toBeVisible();
    await expect(reqRow().first().getByRole('spinbutton').first()).toHaveValue('2');
  });
  await qa.step(4, async () => {
    const r = reqRow().first();
    const mark = await toastMark(page);
    await r.getByRole('button', { name: 'Return' }).click();
    expect(await toastsAfter(page, mark)).toContain('Returned.');
  });
  await qa.step(5, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    const toasts = await request('5');
    expect(toasts).toContain('Quantity must be a whole number greater than zero, and already returned plus this request cannot exceed issued.');
  });
};

export const TC_APP005_019 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const il = new IssueLinesPage(page);
  const rule = (p: Page) =>
    p.getByRole('main').locator('section, div').filter({ has: p.getByRole('heading', { name: 'Which lines may be returned' }) }).filter({ has: p.getByRole('radio') }).last();
  const save = async (p: Page) => {
    const mark = await toastMark(p);
    await rule(p).getByRole('button', { name: 'Save' }).click();
    return toastsAfter(p, mark);
  };
  await il.open();
  const original = (await rule(page).getByRole('radio', { name: 'Verified lines only' }).isChecked()) ? 'Verified lines only' : 'Every issued line';
  try {
    await qa.step(1, async () => {
      if (original !== 'Every issued line') qa.note(1, `the rule of BR-A was "${original}" before the test (a rule was saved earlier)`);
      await expect(rule(page).getByText('This branch only. Issued lines, or only lines that were verified.')).toBeVisible();
      if (original !== 'Every issued line') qa.deviation(1, '"Every issued line" is selected (no rule saved)', `"${original}" is selected: a rule of BR-A is already saved`);
    });
    await qa.step(2, async () => {
      await rule(page).getByRole('radio', { name: 'Verified lines only' }).check();
      expect(await save(page)).toContain('Return rule saved.');
    });
    await qa.step(3, async () => {
      await page.reload({ timeout: 30_000 }).catch(() => {});
      await expect(rule(page).getByRole('radio', { name: 'Verified lines only' })).toBeChecked();
      const unverified = il.rows().filter({ has: page.getByRole('cell', { name: 'No', exact: true }) });
      qa.note(3, `${await unverified.count()} row(s) with Verified "No" on the first page`);
      for (const r of await unverified.all()) expect((await il.cells(r))[6]).toBe('—');
    });
    await qa.step(4, async () => {
      const p6 = await userPage(browser, 'U6');
      try {
        await p6.goto('/id/pharmacy/issue-lines');
        await expect(rule(p6).getByRole('radio', { name: 'Every issued line' })).toBeChecked();
        qa.note(4, 'U6 (qa.kemayoran, branch Kemayoran) stands for the BR-B pharmacist');
      } finally {
        await p6.context().close();
      }
    });
    await qa.step(5, async () => {
      const p2 = await userPage(browser, 'U2');
      try {
        await installToastRecorder(p2);
        await p2.goto('/id/pharmacy/issue-lines');
        await expect(rule(p2)).toBeVisible();
        const toasts = await save(p2);
        qa.note(5, `U2 on "All branches", Save: "${toasts.join(' / ') || 'no toast'}"`);
        expect(toasts).toContain('Choose a branch before saving the return rule.');
      } finally {
        await p2.context().close();
      }
    });
  } finally {
    await il.open();
    if (!(await rule(page).getByRole('radio', { name: original }).isChecked())) {
      await rule(page).getByRole('radio', { name: original }).check();
      await save(page);
    }
  }
};

export const TC_APP005_035 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownItem(page, qa, 'QA-NOCOST', 'QA Obat Tanpa Harga', [{ quantity: '5', expiry: addDays(todayWib(), 300) }], '');
  qa.note(1, `QA-NOCOST of this test: ${it.code} "${it.name}", last cost left empty, 5 in ${PHARMACY_STORE.code}`);
  const pt = await patient(page, qa);
  const before = await stockOf(page, it.code);
  await qa.step(1, async () => {
    const toasts = await sell(page, pt, [{ item: it, requested: '1', issued: '1' }]);
    qa.note(1, `sale: "${toasts.join(' / ')}"`);
    if (toasts.includes(CONFIRMED)) qa.deviation(1, 'Refusal containing "cashier refused the charge" and "no price for this item"', 'the sale is confirmed');
    else expectRefused(qa, 1, toasts, 'no price for this item');
  });
  await qa.step(2, async () => {
    const { row } = await issueRows(page, it.name);
    const after = await stockOf(page, it.code);
    qa.note(2, `${await row().count()} line(s); stock ${total(before)} → ${total(after)}`);
    expect(await row().count()).toBe(0);
    expect(total(after)).toBe(total(before));
  });
  // The item price of the branch saves since 2026-10-31 (was found blocker 35). The sales price of 900 is set for an
  // item of this test with the last cost of QA-PARA (1,000), so that the shared QA-PARA keeps its price.
  const below = await ownItem(page, qa, para.code, para.name, [{ quantity: '5', expiry: addDays(todayWib(), 300) }]);
  qa.note(3, `an item of this test (${below.code}, last cost ${below.lastCost}) stands in for QA-PARA`);
  await qa.step(3, async () => {
    const saved = await saveItemPrice(page, { salesPrices: [{ item: below.code, price: '900' }] });
    qa.note(3, `after "Save price": sales prices ${saved.salesPrices.join(', ') || 'none'}`);
    expect(saved.salesPrices).toContain(below.code);
  });
  await qa.step(4, async () => {
    const toasts = await sell(page, pt, [{ item: below, requested: '1', issued: '1' }]);
    qa.note(4, `sale: "${toasts.join(' / ')}"`);
    if (toasts.includes(CONFIRMED)) qa.deviation(4, 'Refusal containing "dispensing item with lesser rate than cost is not allowed"', 'the sale is confirmed');
    else expectRefused(qa, 4, toasts, 'lesser rate than cost');
  });
};

export const TC_APP005_038 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '10', expiry: addDays(todayWib(), 400) }]);
  const pt = await patient(page, qa);
  expect(await sell(page, pt, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  const { il, row } = await issueRows(page, it.name);
  const tabB = await page.context().newPage();
  await installToastRecorder(tabB);
  const ilB = new IssueLinesPage(tabB);
  const rowB = () => ilB.rows().filter({ has: tabB.getByRole('cell', { name: it.name, exact: true }) });
  await ilB.open();
  await ilB.showRow(rowB, it.name);
  await tabB.waitForLoadState('networkidle').catch(() => {});
  const qty = () => row().getByRole('spinbutton').first();
  const shown = async (p: Page, ilx: IssueLinesPage, r: () => ReturnType<typeof row>) => {
    if (await r().first().waitFor({ timeout: 8_000 }).then(() => true, () => false)) return;
    await ilx.open();
    await ilx.showRow(r, it.name);
    await p.waitForLoadState('networkidle').catch(() => {});
    // The new line may take a moment to be listed; when it is on no page, the list does not offer it (found blocker 40).
    for (let i = 0; i < 3 && !(await r().count()); i++) {
      await p.waitForTimeout(10_000);
      await ilx.open();
      await ilx.showRow(r, it.name);
    }
    if (!(await r().count())) throw new NotOffered(`the line of ${it.name} is on no page of Issue Lines (found blocker 40)`);
  };
  const tryReturn = async (p: Page, r: () => ReturnType<typeof row>, v: string) => {
    await shown(p, p === page ? il : ilB, r);
    await r().getByRole('spinbutton').first().fill(v);
    const mark = await toastMark(p);
    await r().getByRole('button', { name: 'Return' }).click();
    return toastsAfter(p, mark, 5_000);
  };
  const returned = async () => (await il.cells(row()))[5];
  await qa.step(1, async () => {
    await shown(page, il, row);
    const [min, max] = [await qty().getAttribute('min'), await qty().getAttribute('max')];
    qa.note(1, `Qty: min=${min} max=${max}`);
    const toasts = await tryReturn(page, row, '0');
    expect(toasts).not.toContain('Returned.');
    expect(await returned()).toBe('0');
  });
  await qa.step(2, async () => {
    for (const v of ['1.5', '11']) {
      const toasts = await tryReturn(page, row, v);
      qa.note(2, `${v}: "${toasts.join(' / ') || 'refused by the field'}"`);
      expect(toasts).not.toContain('Returned.');
    }
    expect(await returned()).toBe('0');
  });
  await qa.step(3, async () => {
    expect(await tryReturn(page, row, '7')).toContain('Returned.');
    await il.open();
    await il.showRow(row, it.name);
    expect(await returned()).toBe('7');
  });
  await qa.step(4, async () => {
    const toasts = await tryReturn(tabB, rowB, '6');
    qa.note(4, `tab B, 6: "${toasts.join(' / ')}"`);
    if (toasts.includes('Returned.')) qa.deviation(4, 'Toast "That quantity cannot be returned."', '6 more are returned: 13 of 10');
    else expect(toasts).toContain('That quantity cannot be returned.');
  });
  await qa.step(5, async () => {
    await ilB.open();
    await ilB.showRow(rowB, it.name);
    expect((await ilB.cells(rowB()))[5]).toBe('7');
    const f = rowB().getByRole('spinbutton').first();
    const [min, max] = [await f.getAttribute('min'), await f.getAttribute('max')];
    qa.note(5, `Qty now: min=${min} max=${max}`);
    if (min !== '1' || max !== '3') qa.deviation(5, 'The field allows 1 to 3', `min=${min} max=${max}`);
  });
  await tabB.close();
};

export const TC_APP005_039 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  qa.blocked(2, 13);
  qa.blocked(3, 13);
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '10', expiry: addDays(todayWib(), 400) }]);
  const pt = await patient(page, qa);
  expect(await sell(page, pt, [{ item: it, requested: '10', issued: '10', discount: '10' }])).toContain(CONFIRMED);
  await qa.step(1, async () => {
    const { row } = await issueRows(page, it.name);
    await row().getByRole('spinbutton').first().fill('10');
    const mark = await toastMark(page);
    await row().getByRole('button', { name: 'Return' }).click();
    expect(await toastsAfter(page, mark)).toContain('Returned.');
  });
  qa.note(2, 'the sales and reversal vouchers of the pharmacy are not posted to Finance on the branch (found blocker 13)');
};

export const TC_APP005_040 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  // The item price of the branch saves since 2026-10-31 (was found blocker 35); it is set back to the catalogue's
  // price (cost plus margin 25 %, tax 11 %) at the end. Items of this test stand in for QA-PARA and QA-IBU.
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '10', expiry: addDays(todayWib(), 400) }]);
  const ibu = await ownItem(page, qa, PHARMACY.ibu.code, PHARMACY.ibu.name, [{ quantity: '5', expiry: addDays(todayWib(), 400) }]);
  const pt = await patient(page, qa);
  expect(await sell(page, pt, [{ item: it, requested: '10', issued: '10' }])).toContain(CONFIRMED);
  expect(await sell(page, pt, [{ item: ibu, requested: '1', issued: '1' }])).toContain(CONFIRMED);
  /** Returns a line; null when Issue Lines does not list it (it leaves new lines out for a while, found blocker 51). */
  const giveBack = async (name: string, quantity: string): Promise<string[] | null> => {
    const { row } = await issueRows(page, name);
    if (!(await row().count())) return null;
    await row().getByRole('spinbutton').first().fill(quantity);
    const mark = await toastMark(page);
    await row().getByRole('button', { name: 'Return' }).click();
    return toastsAfter(page, mark);
  };
  try {
    await qa.step(1, async () => {
      const saved = await saveItemPrice(page, { margin: '50' });
      qa.note(1, `Site margin after "Save price": ${saved.margin} (50 % is typed ${marginOnSite('50')})`);
      expect(saved.margin).toBe(marginOnSite('50'));
    });
    let listed = true;
    await qa.step(2, async () => {
      const toasts = await giveBack(it.name, '10');
      if (!toasts) {
        listed = false;
        return qa.note(2, `Issue Lines does not list the sale of ${it.code} (found blocker 51)`);
      }
      expect(toasts).toContain('Returned.');
    });
    if (!listed) qa.blocked(2, 51);
    let ibuListed = true;
    qa.blocked(3, 13);
    await qa.step(4, async () => {
      const saved = await saveItemPrice(page, { method: 'Sales price list' });
      qa.note(4, `method after "Save price": ${saved.method}; no sales price for ${ibu.code}`);
      expect(saved.method).toBe('list');
    });
    await qa.step(5, async () => {
      const toasts = await giveBack(ibu.name, '1');
      if (!toasts) {
        ibuListed = false;
        return qa.note(5, `Issue Lines does not list the sale of ${ibu.code} (found blocker 51)`);
      }
      qa.note(5, `return of 1 ${ibu.code}: "${toasts.join(' / ')}"`);
      if (!toasts.includes('That quantity cannot be returned.')) qa.deviation(5, 'Current behaviour: toast "That quantity cannot be returned."', `toast "${toasts.join(' / ')}"`);
    });
    if (!ibuListed) qa.blocked(5, 51);
  } finally {
    await saveItemPrice(page, { method: 'Cost plus margin', margin: BILLING.itemPrice.margin, tax: BILLING.itemPrice.tax });
  }
};

export const TC_APP005_043 = ({ qa, browser }: { qa: Qa; browser: Browser }) => signedOutJourney(browser, qa, '/pharmacy/orders', /\/(id|en)\/pharmacy\/orders/);
