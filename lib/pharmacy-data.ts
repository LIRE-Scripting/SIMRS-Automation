import { expect, type Locator, type Page } from '@playwright/test';
import { ItemMasterPage } from '../pages/inventory/InventoryE2EPages';
import { toastMark, toastsSince } from './assertions';
import { addDays, todayWib } from './dates';
import { STAND_IN_STORE } from './inventory-data';
import { catalogueOf } from './qa-data';

/**
 * Shared data of 05 Pharmacy (00-test-data.xlsx | Catalogue, application
 * "05 Pharmacy"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('05').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 05 row "${shortName}"`);
  return r;
}

/** "Item named exactly Paracetamol 500mg Tablet, last cost 1,000" -> { code, name, lastCost } */
function item(code: string) {
  const m = row(code).what.match(/^Item named exactly (.+), last cost ([\d,]+)$/);
  if (!m) throw new Error(`00-test-data.xlsx | Catalogue "${code}" has another wording`);
  return { code, name: m[1], lastCost: m[2].replace(/,/g, '') };
}

const quoted = (shortName: string) => row(shortName).what.match(/"([^"]+)"/)![1];
const batches = row('Batches of QA-PARA in ST-OP').what.match(
  /BT-1 received \d+ days ago, quantity (\d+), expiry in (\d+) days\. BT-2 received \d+ days ago, quantity (\d+), expiry in (\d+) days/,
);
if (!batches) throw new Error('00-test-data.xlsx | Catalogue "Batches of QA-PARA in ST-OP" has another wording');
const amounts = row('Reference amounts').what.match(/unit ([\d,.]+), charges ([\d,.]+), tax ([\d,.]+), total ([\d,.]+)/);
if (!amounts) throw new Error('00-test-data.xlsx | Catalogue "Reference amounts" has another wording');

export const PHARMACY = {
  para: item('QA-PARA'),
  omep: item('QA-OMEP'),
  ibu: item('QA-IBU'),
  amlo: item('QA-AMLO'),
  pt1: { name: quoted('PT-1') },
  twins: { name: quoted('PT-2, PT-3') },
  pt4: { name: quoted('PT-4') },
  bt1: { quantity: batches[1], daysAhead: Number(batches[2]) },
  bt2: { quantity: batches[3], daysAhead: Number(batches[4]) },
  orOp: { quantity: row('OR-OP').what.match(/quantity (\d+)/)![1] },
  orIp: { quantity: row('OR-IP').what.match(/quantity (\d+)/)![1] },
  reference: { unit: amounts[1], charges: amounts[2], tax: amounts[3], total: amounts[4] },
} as const;

export type PharmacyItem = (typeof PHARMACY)['para'];

/**
 * ST-OP and ST-IP cannot be made (found blocker 26); the seed store standing
 * in for 07's ST-1 dispenses Outpatient and Inpatient, so it stands in for
 * both (open question Q23).
 */
export const PHARMACY_STORE = STAND_IN_STORE;

/**
 * Leaves the Item dialog open: the next step opens another page. Its Close
 * button never becomes stable once the item has many stock lines, and
 * Escape does not close it (seen 2026-10-15).
 */
export async function closeDialog(_page: Page, _d: Locator): Promise<void> {}

let itemsChecked = false;

/**
 * QA-PARA, QA-OMEP, QA-IBU and QA-AMLO with their exact names, made once and
 * reused: the names must equal the drug names of the orders written in
 * Patient Care. Stock is received per test (receive).
 */
export async function ensurePharmacyItems(page: Page): Promise<void> {
  if (itemsChecked) return;
  const items = new ItemMasterPage(page);
  for (const it of [PHARMACY.para, PHARMACY.omep, PHARMACY.ibu, PHARMACY.amlo]) {
    await items.open();
    await items.scan.fill(it.code);
    await items.scan.press('Enter');
    const edit = items.dialog('Edit Item');
    if (await edit.waitFor({ timeout: 5_000 }).then(() => true, () => false)) {
      await closeDialog(page, edit);
      continue;
    }
    await items.open();
    const d = await items.openAdd();
    await items.fill(d, { code: it.code, name: it.name, lastCost: it.lastCost, batchTracked: true });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    await expect.poll(() => toastsSince(page, mark)).toContain('Item added.');
  }
  itemsChecked = true;
}

/** Receives a batch into the stand-in store (expiry `daysAhead` days from today, WIB). */
export async function receive(page: Page, code: string, b: { batch: string; quantity: string; daysAhead: number }): Promise<void> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openEdit({ code });
  const mark = await toastMark(page);
  await items.addBatch(d, { store: PHARMACY_STORE.name, batch: b.batch, expiry: addDays(todayWib(), b.daysAhead), quantity: b.quantity });
  await expect.poll(() => toastsSince(page, mark)).toContain('Batch quantity added.');
  await closeDialog(page, d);
}

/**
 * Batch lines of the stand-in store in "Stock on hand" ("FI01-00-00 · BT-1-… 10 · 2027-11-19"):
 * batch -> quantity. The lines load after the dialog opens ("No batches for this
 * item yet." shows first), so the list is awaited.
 */
export async function stockOf(page: Page, code: string): Promise<Map<string, number>> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openEdit({ code });
  const lines = d.getByText('Stock on hand', { exact: true }).locator('xpath=..').getByRole('listitem');
  await lines.first().waitFor({ timeout: 10_000 }).catch(() => {});
  const out = new Map<string, number>();
  for (const line of await lines.allInnerTexts()) {
    const m = line.replace(/\s+/g, ' ').match(/^(\S+) · (\S+) (-?[\d.,]+) · \d{4}-\d{2}-\d{2}$/);
    if (m && m[1] === PHARMACY_STORE.code) out.set(m[2], Number(m[3].replace(/,/g, '')));
  }
  await closeDialog(page, d);
  return out;
}

/** Total of the stand-in store's lines for the batches of a test (all when `batches` is omitted). */
export function total(stock: Map<string, number>, batches?: string[]): number {
  let sum = 0;
  for (const [b, q] of stock) if (!batches || batches.includes(b)) sum += q;
  return sum;
}
