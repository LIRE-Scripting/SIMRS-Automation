import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { closeDialog, ensurePharmacyItems, PHARMACY, PHARMACY_STORE, receive, stockOf, type PharmacyItem } from '../../../lib/pharmacy-data';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { DispenseWizard } from '../../../pages/pharmacy/PharmacyE2EPages';
import { ensureSettings } from '../14-hospital-accounts/helpers';

/**
 * Shared steps of 05-pharmacy.xlsx. Patients are registered per test (name +
 * token). The four items are made once (ensurePharmacyItems); each test
 * receives its own batches into the stand-in store, which stands in for
 * ST-OP and ST-IP (found blocker 26, Q23). Tests run one at a time
 * (workers: 1), so a drop of the item's total stock is the test's own.
 */

export const para = PHARMACY.para;

export type Patient = { mrn: string; fullName: string };

export async function toastsAfter(page: Page, mark: number, timeout = 10_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export async function patient(page: Page, qa: Qa, excelName: string = PHARMACY.pt1.name, token = qa.token()): Promise<Patient> {
  return registerPatient(page, excelName, token);
}

/**
 * "Rules for BR-A" of the 05 catalogue are set on the Fast Cashier screen
 * (outpatient price margin 25% and tax 11%, "Maximum line discount (%)" 10):
 * without the maximum line discount, a sale with a discount answers HTTP 500.
 */
export { ensureSettings as ensureBranchRules } from '../14-hospital-accounts/helpers';

/** The items exist and the test's batches are in the stand-in store (BT-1 and BT-2 for QA-PARA, one batch of 20 for the others). */
export async function stock(page: Page, qa: Qa, items: PharmacyItem[] = [PHARMACY.para]): Promise<string[]> {
  await ensurePharmacyItems(page);
  await ensureSettings(page);
  const batches: string[] = [];
  for (const it of items) {
    if (it.code === PHARMACY.para.code) {
      for (const [name, b] of [['BT-1', PHARMACY.bt1], ['BT-2', PHARMACY.bt2]] as const) {
        const batch = `${name}-${qa.token()}`;
        await receive(page, it.code, { batch, quantity: b.quantity, daysAhead: b.daysAhead });
        batches.push(batch);
      }
    } else {
      const batch = `B-${qa.token()}`;
      await receive(page, it.code, { batch, quantity: '20', daysAhead: 300 });
      batches.push(batch);
    }
  }
  return batches;
}

export const storeNote = (qa: Qa, step: number) =>
  qa.note(step, `ST-OP/ST-IP cannot be made (found blocker 26); the seed store ${PHARMACY_STORE.code} "${PHARMACY_STORE.name}" (Outpatient and Inpatient) stands in`);

/** OR-OP: the standard order of Patient Care (Paracetamol 500mg Tablet, quantity 10) for the patient. */
export async function outpatientOrder(page: Page, p: Patient): Promise<void> {
  const c = new ConsultationPage(page);
  await c.openFor(p);
  await c.placeOrder(CLINICAL.standardOrder);
}

export type Line = { item: PharmacyItem; requested?: string; issued?: string; discount?: string; generic?: boolean };

/** A counter sale up to Confirm: patient, items, quantities, alerts. */
export async function toConfirm(page: Page, p: Patient | null, lines: Line[], lang: 'en' | 'id' = 'id'): Promise<DispenseWizard> {
  const w = new DispenseWizard(page, lang);
  await w.open();
  if (p) await w.pickPatient(p);
  for (const l of lines) await w.addItem(l.item.code);
  await w.goNext('Set quantities');
  for (const l of lines) {
    await w.setQuantities(l.item.name, { requested: l.requested, issued: l.issued, discount: l.discount });
    if (l.generic) await w.generic(l.item.name).check();
  }
  await w.goNext('Drug order alerts');
  await w.goNext('Confirm');
  return w;
}

/** Picks the stand-in store, clicks "Confirm dispense" and returns the toasts. */
export async function confirm(page: Page, w: DispenseWizard): Promise<string[]> {
  await w.pickStore(PHARMACY_STORE.code);
  const mark = await toastMark(page);
  await w.confirm.click();
  return toastsAfter(page, mark, 20_000);
}

export const CONFIRMED = 'Dispense confirmed — issue lines saved.';

/** A whole counter sale; returns the toasts. */
export async function sell(page: Page, p: Patient | null, lines: Line[], lang: 'en' | 'id' = 'id'): Promise<string[]> {
  const w = await toConfirm(page, p, lines, lang);
  return confirm(page, w);
}

/**
 * A refused sale: no confirmation and some message. The site shows a server
 * error toast ("Minified React error #441") instead of its refusal text for
 * every refused dispense seen on 2026-10-15, so the expected text is a
 * deviation when it is missing.
 */
export function expectRefused(qa: Qa, step: number, toasts: string[], expected: string): void {
  expect(toasts).not.toContain(CONFIRMED);
  expect(toasts.length, 'a message after "Confirm dispense"').toBeGreaterThan(0);
  const text = toasts.join(' / ');
  if (!text.toLowerCase().includes(expected.toLowerCase())) qa.deviation(step, `Refusal containing "${expected}"`, `toast "${text}"`);
}


export { backToIndonesian } from '../shared/language';

/** An item made for this test only (code + token), with its batches in the stand-in store; `lastCost` '' leaves the cost empty. */
export async function ownItem(page: Page, qa: Qa, base: string, name: string, batches: { quantity: string; expiry: string }[], lastCost: string = para.lastCost): Promise<PharmacyItem & { batches: string[] }> {
  const items = new ItemMasterPage(page);
  const t = qa.token();
  const it = { code: `${base}-${t}`, name: `${name} ${t}`, lastCost };
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, { ...it, batchTracked: true });
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => toastsSince(page, mark)).toContain('Item added.');
  const names: string[] = [];
  if (batches.length) {
    await items.open();
    let e = await items.openEdit(it);
    for (const [i, b] of batches.entries()) {
      const batch = `B${i + 1}-${t}`;
      const m = await toastMark(page);
      await items.addBatch(e, { store: PHARMACY_STORE.name, batch, expiry: b.expiry, quantity: b.quantity });
      const added = await expect.poll(() => toastsSince(page, m), { timeout: 20_000 }).toContain('Batch quantity added.').then(() => true, () => false);
      names.push(batch);
      if (!added) {
        // No toast seen: the stock of the item tells whether the batch was received.
        await closeDialog(page, e);
        expect((await stockOf(page, it.code)).get(batch), `batch ${batch} received`).toBe(Number(b.quantity));
        await items.open();
        e = await items.openEdit(it);
      }
    }
    await closeDialog(page, e);
  }
  return { ...it, batches: names };
}
