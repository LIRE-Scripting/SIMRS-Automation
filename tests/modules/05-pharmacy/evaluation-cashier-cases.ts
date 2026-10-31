import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { DispenseWizard, IssueLinesPage, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { saleSteps } from '../../e2e/chains/steps/pharmacy-billing-steps';
import { counterClosed, ensureSettings, holds, newRxInvoice, rxInvoices, select } from '../14-hospital-accounts/helpers';
import { clickFor } from '../19-finance/helpers';
import { userPage } from '../shared/access';
import { CONFIRMED, outpatientOrder, ownItem, patient, sell, stock, toConfirm, toastsAfter, type Patient } from './helpers';
/**
 * 05-pharmacy.xlsx, the "Needs Evaluation" journeys that need the U1 cashier
 * counter (Fast Cashier: the RX- invoice, "Dispense discounts"). They run
 * with the cashier test cases while the counter is open. A discount above
 * "Maximum line discount (%)" (10) waits there for approval; "Cashier 2"
 * is U4 (qa.admin3), who is not an approver of the chain.
 */



export const para = PHARMACY.para;
export const MAX = BILLING.counter['Maximum line discount (%)'];

/** A sale of an item of the test with a discount above the maximum, left on Confirm; returns the wizard, the item and the toasts. */
export async function heldSale(page: Page, qa: Qa, discount = '15') {
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '20', expiry: addDays(todayWib(), 400) }]);
  const pt = await patient(page, qa);
  const w = await toConfirm(page, pt, [{ item: it, requested: '10', issued: '10', discount }]);
  await w.pickStore(PHARMACY_STORE.code);
  const mark = await toastMark(page);
  await w.confirm.click();
  const toasts = await toastsAfter(page, mark, 20_000);
  return { w, it, pt, toasts };
}

export const HELD = 'Pharmacy discount sent for approval.';

/** The waiting row of the item in "Dispense discounts", or null. */
export async function holdOf(page: Page, name: string) {
  const h = await holds(page);
  const row = h.rows.filter({ hasText: name });
  return { ...h, row: (await row.count()) ? row.first() : null };
}

/** The line count of an item on Issue Lines. */
export async function lines(page: Page, name: string): Promise<number> {
  const il = new IssueLinesPage(page);
  const row = () => il.rows().filter({ has: page.getByRole('cell', { name, exact: true }) });
  await il.open();
  await il.showRow(row, name);
  return row().count();
}

/**
 * A dispense with a discount above the maximum that could not be held: HTTP 500 until 2026-10-30; since 2026-10-31
 * the refusal "this discount needs the approval chain: workflow: chain not found: "billingdiscount"" (found blocker 47).
 */
export const discountNotHeld = (toasts: string[]): boolean =>
  !toasts.includes(HELD) && toasts.some((t) => SERVER_FAILURE.test(t) || /Failed|error|chain not found/i.test(t));

/** Blocks the steps when the held sale could not be held (found blocker 47); returns true then. */
export function held500(qa: Qa, toasts: string[], steps: number[]): boolean {
  if (!discountNotHeld(toasts)) return false;
  for (const st of steps) qa.blocked(st, 47);
  qa.note(steps[0], `"Confirm dispense" with a discount above ${MAX}%: "${toasts.join(' / ')}" (found blocker 47)`);
  return true;
}

export const TC_APP005_014 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  await stock(page, qa);
  const pt: Patient = await patient(page, qa);
  const before = await rxInvoices(page);
  const toasts = await sell(page, pt, [{ item: para, requested: '10', issued: '10' }]);
  await saleSteps(page, qa, { before, toasts }, true);
};

export const TC_APP005_016 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const s = await heldSale(page, qa);
  qa.note(1, `an item of this test (${s.it.code}) stands in for QA-PARA, so that its lines and stock are its own; stock 20; maximum ${MAX}%`);
  if (held500(qa, s.toasts, [1, 2, 3, 4, 5, 6])) return;
  await qa.step(1, async () => {
    expect(s.toasts).toContain(HELD);
    await expect(s.w.confirm).toBeVisible();
    await expect(s.w.main.getByText(/^Issued \d+ of \d+$/)).toHaveCount(0);
  });
  const tab = await page.context().newPage();
  await qa.step(2, async () => {
    expect(await lines(tab, s.it.name)).toBe(0);
    expect(total(await stockOf(tab, s.it.code))).toBe(20);
  });
  await qa.step(3, async () => {
    const mark = await toastMark(page);
    await s.w.confirm.click();
    const toasts = await toastsAfter(page, mark, 20_000);
    qa.note(3, `again: "${toasts.join(' / ')}"`);
    expect(toasts).not.toContain(CONFIRMED);
    expect(toasts.join(' ')).toContain('Pharmacy discount approval task is pending, hence dispense cannot be done');
  });
  await qa.step(4, async () => {
    const h = await holdOf(tab, s.pt.fullName);
    const any = h.row ?? (await holdOf(tab, s.it.name)).row;
    expect(any, 'the held sale in "Dispense discounts"').not.toBeNull();
    const text = (await any!.innerText()).replace(/\s+/g, ' ');
    qa.note(4, `the row: "${text}"`);
    expect(text).toContain('10');
    expect(text).toMatch(/15\s*%/);
  });
  await qa.step(5, async () => {
    const h = (await holdOf(tab, s.pt.fullName)).row ? await holdOf(tab, s.pt.fullName) : await holdOf(tab, s.it.name);
    const toasts = await clickFor(tab, h.row!.getByRole('button', { name: 'Approve', exact: true }));
    qa.note(5, `Approve: "${toasts.join(' / ')}"`);
    const after = await holdOf(tab, s.it.name);
    expect(after.row).toBeNull();
  });
  await qa.step(6, async () => {
    const n = await lines(tab, s.it.name);
    qa.note(6, `${n} line(s) of ${s.it.name} after the approval`);
    if (n === 0) {
      // The approval may only free the sale: the pharmacist confirms again.
      const mark = await toastMark(page);
      await s.w.confirm.click();
      const toasts = await toastsAfter(page, mark, 20_000);
      qa.note(6, `no line yet; "Confirm dispense" again: "${toasts.join(' / ')}"`);
      qa.deviation(6, 'New line: Issued 10 (after the approval)', 'no line until the pharmacist confirms the dispense again');
    }
  });
  await tab.close();
};

export const TC_APP005_036 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const s = await heldSale(page, qa);
  if (held500(qa, s.toasts, [1, 2, 3, 4])) return;
  expect(s.toasts).toContain(HELD);
  const tab = await page.context().newPage();
  await qa.step(1, async () => {
    const h = (await holdOf(tab, s.pt.fullName)).row ? await holdOf(tab, s.pt.fullName) : await holdOf(tab, s.it.name);
    expect(h.row, 'the held sale').not.toBeNull();
    const toasts = await clickFor(tab, h.row!.getByRole('button', { name: 'Reject', exact: true }));
    qa.note(1, `Reject: "${toasts.join(' / ')}"`);
    expect((await holdOf(tab, s.it.name)).row).toBeNull();
  });
  await qa.step(2, async () => {
    expect(await lines(tab, s.it.name)).toBe(0);
  });
  await qa.step(3, async () => {
    const mark = await toastMark(page);
    await s.w.confirm.click();
    const toasts = await toastsAfter(page, mark, 20_000);
    qa.note(3, `"Confirm dispense": "${toasts.join(' / ')}"`);
    if (toasts.includes(CONFIRMED)) qa.deviation(3, 'Toast "The discount was rejected. The lines stay unissued."', 'confirmed at once');
    else expect(toasts).toContain('The discount was rejected. The lines stay unissued.');
  });
  await qa.step(4, async () => {
    if (await s.w.main.getByText(/^Issued \d+ of \d+$/).count()) return qa.note(4, 'already confirmed in step 3');
    const mark = await toastMark(page);
    await s.w.confirm.click();
    expect(await toastsAfter(page, mark, 20_000)).toContain(CONFIRMED);
  });
  await tab.close();
};

export const TC_APP005_037 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const s = await heldSale(page, qa);
  if (held500(qa, s.toasts, [1, 2, 3, 4])) return;
  expect(s.toasts).toContain(HELD);
  await qa.step(1, async () => {
    const p3 = await userPage(browser, 'U3');
    try {
      await p3.goto('/id/billing/cashier');
      await p3.waitForLoadState('networkidle').catch(() => {});
      const approve = p3.getByRole('heading', { name: 'Dispense discounts' }).locator('xpath=..').getByRole('button', { name: 'Approve', exact: true });
      const n = await approve.count();
      qa.note(1, `U3 (qa.staff, no cashier rights) stands for the pharmacist: ${new URL(p3.url()).pathname}, ${n} Approve button(s)`);
      if (n) {
        await installToastRecorder(p3);
        const toasts = await clickFor(p3, approve.first());
        qa.note(1, `Approve: "${toasts.join(' / ')}"`);
        expect(toasts.join(' ')).not.toContain('Discount decision saved.');
      }
    } finally {
      await p3.context().close();
    }
  });
  const p4 = await userPage(browser, 'U4');
  try {
    await installToastRecorder(p4);
    for (const [st, action] of [[2, 'Approve'], [3, 'Reject']] as const) {
      await qa.step(st, async () => {
        const h = await holdOf(p4, s.it.name).then(async (x) => (x.row ? x : holdOf(p4, s.pt.fullName)));
        if (!h.row) return qa.note(st, 'Cashier 2 (U4) does not see the held sale');
        const toasts = await clickFor(p4, h.row.getByRole('button', { name: action, exact: true }));
        qa.note(st, `Cashier 2 (U4), ${action}: "${toasts.join(' / ')}"`);
        if (toasts.includes('Discount decision saved.')) qa.deviation(st, 'Refusal containing "you cannot approve this discount"', `U4, who is not the approver, decided: ${action}`);
        else expect(toasts.join(' ').toLowerCase()).toContain('you cannot approve this discount');
      });
    }
  } finally {
    await p4.context().close();
  }
  await qa.step(4, async () => {
    const h = await holdOf(page, s.it.name);
    if (!h.row) return qa.note(4, 'the held sale was decided in an earlier step');
    expect(await clickFor(page, h.row.getByRole('button', { name: 'Approve', exact: true }))).toContain('Discount decision saved.');
    expect((await holdOf(page, s.it.name)).row).toBeNull();
  });
};

export const TC_APP005_041 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  await stock(page, qa);
  const pt = await patient(page, qa);
  await outpatientOrder(page, pt);
  const before = await rxInvoices(page);
  const o = new OrdersPage(page);
  await o.open('outpatient');
  await o.pickStore(PHARMACY_STORE.code);
  await o.row(pt.fullName).getByRole('link').first().click();
  const w = new DispenseWizard(page);
  await w.goNext('Set quantities');
  await w.goNext('Drug order alerts');
  await w.goNext('Confirm');
  await w.pickStore(PHARMACY_STORE.code);
  const mark = await toastMark(page);
  await w.confirm.click();
  expect(await toastsAfter(page, mark, 20_000)).toContain(CONFIRMED);
  const rx = await newRxInvoice(page, before);
  const c0 = await select(page, rx);
  const due0 = await c0.barValue('Amount due');
  qa.note(1, `OR-OP dispensed in full; invoice ${rx}, Amount due ${due0}`);
  await qa.step(1, async () => {
    // Issue Lines names the item only: the newest line of the drug with Issued 10 and Returned 0.
    const il = new IssueLinesPage(page);
    await il.open();
    await il.search.fill(para.name);
    await page.waitForLoadState('networkidle').catch(() => {});
    const r = il.rows().filter({ has: page.getByRole('cell', { name: para.name, exact: true }) }).filter({ has: page.getByRole('button', { name: 'Return' }) });
    let done = false;
    for (const row of await r.all()) {
      const cells = await il.cells(row);
      if (cells[2] === '10' && cells[5] === '0') {
        await row.getByRole('spinbutton').first().fill('10');
        const m = await toastMark(page);
        await row.getByRole('button', { name: 'Return' }).click();
        expect(await toastsAfter(page, m)).toContain('Returned.');
        done = true;
        break;
      }
    }
    expect(done, 'a line of 10 to return').toBe(true);
    qa.note(1, 'Issue Lines does not name the patient: the first line of Paracetamol with Issued 10 and Returned 0 on the list is returned');
  });
  await qa.step(2, async () => {
    await o.open('outpatient');
    const n = await o.row(pt.fullName).count();
    qa.note(2, `${n} row(s) of ${pt.fullName} on Orders`);
    if (n) qa.note(2, 'the order is back in the queue');
  });
  await qa.step(3, async () => {
    const c = await select(page, rx);
    const st = await c.barState();
    const due = await c.barValue('Amount due');
    qa.note(3, `${rx}: ${st.status}, Amount due ${due} (before the return ${due0})`);
  });
};
