import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Qa } from '../../../../fixtures/e2e';
import { toastLocator, toastMark } from '../../../../lib/assertions';
import { CLINICAL } from '../../../../lib/clinical-data';
import { SCREENSHOT_DIR } from '../../../../lib/config';
import { PHARMACY, PHARMACY_STORE } from '../../../../lib/pharmacy-data';
import { CashierPage } from '../../../../pages/billing/CashierPage';
import { ConsultationPage } from '../../../../pages/clinical/ConsultationPage';
import { compact, DispenseWizard, OrdersPage } from '../../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, stock, storeNote, toastsAfter } from '../../../modules/05-pharmacy/helpers';
import { newRxInvoice, pay, rxInvoices, select } from '../../../modules/14-hospital-accounts/helpers';
import { Vouchers } from '../../../modules/19-finance/helpers';
import type { Patient } from './outpatient-steps';

/**
 * The outpatient chain from the doctor's order to the paid bill and its
 * receipt (03 Patient Care, 05 Pharmacy, 14 Hospital Accounts, 19 Finance),
 * written as in the module specs but on the chain's patient.
 */

const drug = CLINICAL.standardOrder.Drug;
const quantity = PHARMACY.orOp.quantity;

/** TC-APP003-002: the doctor's medication order (the standard order of Patient Care) reaches the pharmacy. */
export async function orderSteps(page: Page, qa: Qa, pt: Patient): Promise<void> {
  const c = new ConsultationPage(page);
  // The consultation of TC-APP003-001 ended on "Change patient"; the patient is picked again.
  await c.openFor(pt);
  await qa.step(1, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    expect(await c.quantity()).toBe(CLINICAL.standardQuantity);
    await expect(c.submitOrder()).toBeEnabled();
  });
  await qa.step(2, async () => {
    const mark = await toastMark(page);
    await c.checkInteractions().click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.includes('No drug interactions detected.')) qa.deviation(2, 'Toast "No drug interactions detected."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
  });
  await qa.step(3, async () => {
    await c.submitOrder().click();
    await expect(toastLocator(page, /^Order placed\.$/)).toBeVisible();
    await expect(c.field('Drug')).toHaveValue('');
  });
  await qa.step(4, async () => {
    const o = new OrdersPage(page);
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Pharmacy\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Orders', exact: true }).first().click();
    await expect(o.heading).toBeVisible();
    const cells = await o.cells(o.row(pt.fullName));
    expect(cells.slice(0, 3)).toEqual([pt.fullName, drug, 'Outpatient']);
    if (cells[3] !== quantity) qa.deviation(4, `Remaining ${quantity}`, `Remaining reads "${cells[3]}" (left / ordered)`);
  });
}

/**
 * TC-APP005-001: the pharmacist dispenses the order in full. Returns the RX-
 * invoices the cashier offered before the sale (to find the sale's invoice)
 * and the toasts of "Confirm dispense".
 */
export async function dispenseSteps(page: Page, qa: Qa, pt: Patient): Promise<{ before: Set<string>; toasts: string[] }> {
  const o = new OrdersPage(page);
  const w = new DispenseWizard(page);
  await stock(page, qa);
  const before = await rxInvoices(page);
  let toasts: string[] = [];

  await qa.step(1, async () => {
    await o.open();
    await expect(o.table.getByRole('columnheader')).toHaveText(['Patient', 'Drug', 'Visit', 'Remaining']);
    expect((await o.cells(o.row(pt.fullName))).slice(0, 3)).toEqual([pt.fullName, drug, 'Outpatient']);
  });
  await qa.step(2, async () => {
    await o.main.getByRole('link', { name: 'Outpatient', exact: true }).click();
    await expect(page).toHaveURL(/visit_class=outpatient/);
    await expect(o.store).toBeVisible();
  });
  await qa.step(3, async () => {
    storeNote(qa, 3);
    await o.pickStore(PHARMACY_STORE.code);
  });
  await qa.step(4, async () => {
    await o.row(pt.fullName).getByRole('link').click();
    await expect(w.marker('Select items')).toBeVisible();
    await expect(w.selected()).toHaveCount(1);
  });
  await qa.step(5, async () => {
    await w.goNext('Set quantities');
    await expect(w.requested(drug)).toHaveValue(quantity);
    await expect(w.issued(drug)).toHaveValue(quantity);
  });
  await qa.step(6, async () => {
    await w.goNext('Drug order alerts');
    await expect(w.main.getByText('No drug interactions detected for this order.', { exact: true })).toBeVisible();
  });
  await qa.step(7, async () => {
    await w.goNext('Confirm');
    await expect(w.store).toHaveValue(new RegExp(PHARMACY_STORE.code));
    expect(await w.summaryCompact()).toEqual([compact(`${drug} ${quantity}/${quantity}`)]);
    if (!(await w.main.getByText(/Podomoro/).count())) qa.deviation(7, 'Branch BR-A on Confirm', 'Confirm shows the store and the summary; no branch');
  });
  await qa.step(8, async () => {
    const mark = await toastMark(page);
    await w.confirm.click();
    toasts = await toastsAfter(page, mark, 20_000);
    expect(toasts).toContain(CONFIRMED);
    await expect(w.main.getByText(`Issued ${quantity} of ${quantity}`, { exact: true })).toBeVisible();
  });
  await qa.step(9, async () => {
    await w.done.click();
    await o.open('outpatient');
    await expect(o.row(pt.fullName)).toHaveCount(0);
  });
  return { before, toasts };
}

/**
 * TC-APP005-014: the sale is an open RX- invoice at the cashier and a sales
 * voucher (SV-) in Finance. The price lines differ from the reference while
 * the item price of the branch cannot be saved (found blocker 35): recorded
 * as a deviation, the chain goes on to the payment. Returns the RX number.
 */
export async function saleSteps(page: Page, qa: Qa, sale: { before: Set<string>; toasts: string[] }, recheck = false): Promise<string> {
  let rx = '';
  await qa.step(1, async () => {
    expect(sale.toasts).toContain(CONFIRMED);
    qa.note(1, `the sale is the dispense of the previous chain step ("${CONFIRMED}")`);
  });
  await qa.step(2, async () => {
    rx = await newRxInvoice(page, sale.before);
    const c = await select(page, rx);
    expect((await c.barState()).status).toBe('Draft');
    const lines = await c.lines();
    const ref = PHARMACY.reference;
    const want = { Gross: rupiahOf(ref.charges), Tax: rupiahOf(ref.tax), 'Patient net': rupiahOf(ref.total) };
    const got = { Gross: lines.Gross, Tax: lines.Tax, 'Patient net': lines['Patient net'] };
    qa.note(2, `the new RX- invoice of the sale: ${rx}`);
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      qa.deviation(2, `charges ${ref.charges}, tax ${ref.tax}, total ${ref.total.replace(/\.$/, '')}`, `${rx}: Gross ${got.Gross}, Tax ${got.Tax}, Patient net ${got['Patient net']}: priced at cost with no tax, because the item price of the branch cannot be saved (found blocker 35)`);
    }
  });
  await qa.step(3, async () => {
    const v = new Vouchers(page);
    await v.open();
    const sv = v.rows().filter({ hasText: /^SV-/ });
    await expect(sv.first()).toBeVisible();
    await sv.first().getByRole('button', { name: 'Open' }).click();
    const detail = (await v.detail.innerText()).replace(/\s+/g, ' ');
    if (detail.includes(rx)) qa.note(3, `the newest sales voucher refers to ${rx}: "${detail.slice(0, 160)}"`);
    else qa.deviation(3, `One sales voucher referring to the invoice ${rx}`, `the newest SV- voucher does not name ${rx}: "${detail.slice(0, 160)}"`);
  });
  if (!recheck) {
    qa.note(4, 'not repeated in the chain: the reload a minute later is TC-APP005-014 step 4 of the module run');
    return rx;
  }
  await qa.step(4, async () => {
    await page.waitForTimeout(60_000);
    const v = new Vouchers(page);
    await v.open();
    const sv = v.rows().filter({ hasText: /^SV-/ });
    let n = 0;
    for (const r of (await sv.all()).slice(0, 10)) {
      await r.getByRole('button', { name: 'Open' }).press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      if ((await v.detail.innerText()).includes(rx)) n++;
    }
    qa.note(4, `a minute later: ${n} of the 10 newest SV- vouchers refer to ${rx}`);
    expect(n, `vouchers of ${rx}`).toBeLessThanOrEqual(1);
  });
  return rx;
}

/** "13,875.00" (also "13,875.00." at the end of a sentence) -> "Rp 13.875" (the cashier's form of an amount of the reference). */
function rupiahOf(amount: string): string {
  const n = Math.round(Number(amount.match(/\d[\d,]*(?:\.\d+)?/)?.[0].replace(/,/g, '') ?? NaN));
  return `Rp ${n.toLocaleString('id-ID')}`;
}

/** TC-APP014-002 steps 1-3: the cashier finds the pharmacy bill by its number and takes the payment in cash. */
export async function paySteps(page: Page, qa: Qa, rx: string): Promise<void> {
  let c = new CashierPage(page);
  let due = '';
  await qa.step(1, async () => {
    c = await select(page, rx);
    const state = await c.barState();
    expect(state).toEqual({ status: 'Draft', invoice: rx });
    due = await c.barValue('Amount due');
    if (due !== rupiahOf(PHARMACY.reference.total)) qa.deviation(1, `Amount due ${rupiahOf(PHARMACY.reference.total)}`, `Amount due ${due} (found blocker 35: priced at cost with no tax)`);
  });
  await qa.step(2, async () => {
    qa.note(2, `lines under "2. Payment": ${JSON.stringify(await c.lines())}`);
  });
  await qa.step(3, async () => {
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.receiptValue('Paid')).toBe(due);
  });
}

/**
 * TC-APP014-040: the receipt of the payment, its printout and the paid sale
 * found again. The site has no print control on the receipt (deviation of
 * step 2): the printout is the browser's print of the cashier screen (PDF),
 * attached to the chain with a picture of the receipt.
 */
export async function receiptSteps(page: Page, qa: Qa, rx: string, chainId: string): Promise<void> {
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    expect(await c.receiptValue('Invoice')).toBe(rx);
    for (const t of ['Tender', 'Paid', 'Remaining due', 'Status'] as const) expect(await c.receiptValue(t)).not.toBe('');
    qa.note(1, `receipt: Invoice ${rx}, Tender ${await c.receiptValue('Tender')}, Paid ${await c.receiptValue('Paid')}, Remaining due ${await c.receiptValue('Remaining due')}, Status ${await c.receiptValue('Status')}`);
  });
  await qa.step(2, async () => {
    if (!(await c.receipt().getByRole('button', { name: /print|download|cetak|unduh/i }).count())) qa.deviation(2, 'A Print button or a printable page', 'no print or download control on the receipt; the printout is the browser print of the screen');
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const picture = path.join(SCREENSHOT_DIR, `${chainId}-receipt.png`);
    await c.receipt().screenshot({ path: picture });
    await page.emulateMedia({ media: 'print' });
    const printout = path.join(SCREENSHOT_DIR, `${chainId}-receipt-printout.pdf`);
    await page.pdf({ path: printout, format: 'A4', printBackground: true });
    await page.emulateMedia({ media: null });
    await test.info().attach('receipt', { path: picture, contentType: 'image/png' });
    await test.info().attach('receipt printout (browser print)', { path: printout, contentType: 'application/pdf' });
    qa.note(2, `receipt picture ${picture}; printout ${printout}`);
  });
  await qa.step(3, async () => {
    await c.button('New sale').click();
    await select(page, rx);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.barValue('Amount due')).toBe('Rp 0');
    if (!(await c.receipt().getByRole('term').count())) qa.deviation(3, 'The receipt can be shown again', 'the receipt is not shown when the paid sale is found again');
  });
}
