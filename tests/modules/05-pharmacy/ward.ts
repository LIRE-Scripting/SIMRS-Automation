import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { ConsultationPage, type DrugOrder } from '../../../pages/clinical/ConsultationPage';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';
import { DispenseWizard, IssueLinesPage, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { newBed } from '../../e2e/chains/steps/inpatient-steps';
import { WardSupply } from '../04-inpatient/helpers';
import { CONFIRMED, patient, stock, toastsAfter, type Patient } from './helpers';

/**
 * Ward supply between Inpatient and Pharmacy (04 and 05): an admitted
 * patient's inpatient order is grouped for a store on Admissions, "Ward
 * supply", dispensed from Pharmacy, Orders, Inpatient with its "Ward group",
 * then received or refused by the ward. ST-IP cannot be made (found blocker
 * 26): the seed store PHARMACY_STORE stands in (open question Q23).
 */

/** OR-IP of the catalogue: the standard order with Visit "Inpatient", for 6 tablets (BID for 3 days). */
export const OR_IP: DrugOrder = { ...CLINICAL.standardOrder, Days: '3' };
export const drug = CLINICAL.standardOrder.Drug;

/** A new admitted patient (own bed) with an inpatient order (OR-IP unless given); stock of QA-PARA is received for the test. */
export async function admittedWithOrder(
  page: Page,
  qa: Qa,
  o: { name?: string; order?: DrugOrder; admitAs?: string; admissionNo?: string; withStock?: boolean } = {},
): Promise<Patient & { bed: string; admissionNo: string }> {
  if (o.withStock !== false) await stock(page, qa);
  const pt = await patient(page, qa, o.name ?? 'QA-INP Pasien Satu');
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(o.admitAs ?? pt.fullName, bed, o.admissionNo);
  await adm.open();
  const admissionNo = await adm.admissionNo(await adm.stay(o.admitAs ?? pt.fullName));
  await inpatientOrderFor(page, pt, o.order ?? OR_IP);
  return { ...pt, bed, admissionNo };
}

/** Writes an inpatient order (Consultation, Visit "Inpatient") for a patient. */
export async function inpatientOrderFor(page: Page, pt: Patient, order: DrugOrder = OR_IP): Promise<void> {
  const c = new ConsultationPage(page);
  await c.openFor(pt);
  await c.fillOrder(order);
  await c.panel.getByRole('combobox', { name: 'Visit' }).selectOption({ label: 'Inpatient' });
  const mark = await toastMark(page);
  await c.submitOrder().click();
  expect(await toastsAfter(page, mark)).toContain('Order placed.');
}

/** The "Ward group" type-ahead of Pharmacy, Orders, Inpatient. */
const groupField = (o: OrdersPage) => o.main.getByRole('combobox', { name: 'Ward group' });

/** The options "Ward group" offers. */
export async function wardGroups(page: Page): Promise<string[]> {
  const o = new OrdersPage(page);
  await o.open('inpatient');
  const f = groupField(o);
  await f.click();
  // The options show once something is typed ("<orders> · Ward group").
  await f.pressSequentially('a', { delay: 30 });
  const list = page.locator(`#${await f.getAttribute('aria-controls')}`);
  await list.getByRole('option').first().waitFor({ timeout: 5_000 }).catch(() => {});
  const texts = (await list.getByRole('option').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  await page.keyboard.press('Escape');
  return texts;
}

/** Ticks the patients' pending orders for the stand-in store and groups them; returns the toasts and the new "Ward group" option. */
export async function groupOrders(page: Page, pt: Patient | Patient[]): Promise<{ toasts: string[]; group: string }> {
  const pts = Array.isArray(pt) ? pt : [pt];
  const before = new Set(await wardGroups(page));
  const ws = new WardSupply(page);
  await ws.open();
  await ws.pickStore(PHARMACY_STORE.code);
  for (const p of pts) await expect(ws.pending(p.fullName).first()).toBeVisible();
  for (const p of pts.slice(1)) for (const b of await ws.pending(p.fullName).all()) await b.check();
  const toasts = await ws.group(pts[0].fullName);
  const added = (await wardGroups(page)).filter((g) => !before.has(g));
  const group = added[0] ?? '';
  groupPatients.set(group, pts.map((p) => p.fullName));
  return { toasts, group };
}

/** Picks a group in "Ward group" of Orders, Inpatient. */
export async function pickGroup(o: OrdersPage, group: string): Promise<void> {
  const f = groupField(o);
  await f.click();
  const list = o.page.locator(`#${await f.getAttribute('aria-controls')}`);
  const option = list.getByRole('option').filter({ hasText: group }).first();
  const button = option.getByRole('button');
  await ((await button.count()) ? button.first() : option).click();
  await o.page.waitForLoadState('networkidle').catch(() => {});
}

/** Opens the patient's inpatient order from the group and confirms the dispense; returns the toasts. */
export async function dispenseGroup(page: Page, pt: Patient, group: string, issued?: string): Promise<{ toasts: string[]; w: DispenseWizard; issued: string }> {
  const o = new OrdersPage(page);
  await o.open('inpatient');
  if (group) await pickGroup(o, group);
  await o.pickStore(PHARMACY_STORE.code);
  await o.row(pt.fullName).getByRole('link').first().click();
  const w = new DispenseWizard(page);
  await expect(w.marker('Select items')).toBeVisible();
  await w.goNext('Set quantities');
  if (issued) await w.issued(drug).fill(issued);
  const got = await w.issued(drug).inputValue();
  await w.goNext('Drug order alerts');
  await w.goNext('Confirm');
  await w.pickStore(PHARMACY_STORE.code);
  const mark = await toastMark(page);
  await w.confirm.click();
  return { toasts: await toastsAfter(page, mark, 20_000), w, issued: got };
}

/** The patients of each group made by groupOrders (a group's row on Ward supply lists "patient — drug"). */
const groupPatients = new Map<string, string[]>();

/** The Receive (or Refuse) button of a group on Ward supply: the one whose row names its patients (or the group), else the last one. */
export async function groupButton(ws: WardSupply, group: string, action: 'Receive' | 'Refuse'): Promise<Locator> {
  const buttons = ws.groupButtons(action);
  await buttons.first().waitFor({ timeout: 10_000 }).catch(() => {});
  const names = groupPatients.get(group) ?? [];
  const key = group.split(/\s+[·—-]\s+|\s+/)[0];
  for (const b of await buttons.all()) {
    const row = await ws.rowOf(b).innerText().catch(() => '');
    if (names.length ? names.every((n) => row.includes(n)) : key && row.includes(key)) return b;
  }
  return buttons.last();
}

/** Admitted patient, an inpatient order (OR-IP unless given) grouped and dispensed in full; returns the patient and the group. */
export async function dispensedGroup(page: Page, qa: Qa, order?: DrugOrder): Promise<{ pt: Patient & { bed: string; admissionNo: string }; group: string }> {
  const pt = await admittedWithOrder(page, qa, { order });
  const { toasts, group } = await groupOrders(page, pt);
  expect(toasts).toContain('Orders grouped for the pharmacy queue.');
  const d = await dispenseGroup(page, pt, group);
  expect(d.toasts).toContain(CONFIRMED);
  return { pt, group };
}

/** The issued line of a drug in the "Stay" card after picking the stay. */
export function stayLine(ws: WardSupply, name = drug): Locator {
  return ws.card('Stay').locator('li, tr').filter({ hasText: name }).first();
}

/** Types a quantity on the stay line and clicks "Request return"; returns the toasts. */
export async function requestReturn(ws: WardSupply, qty: string, name = drug): Promise<string[]> {
  const line = stayLine(ws, name);
  await line.getByRole('spinbutton').first().fill(qty);
  const mark = await toastMark(ws.page);
  await line.getByRole('button', { name: 'Request return' }).click();
  return toastsAfter(ws.page, mark);
}

/** Posts a pending return request ("Request n") on Issue Lines; returns the toasts. */
export async function postRequest(page: Page, qty: string): Promise<string[]> {
  const il = new IssueLinesPage(page);
  const row = () => il.rows().filter({ hasText: `Request ${qty}` }).filter({ has: page.getByRole('cell', { name: drug, exact: true }) });
  await il.open();
  await il.showRow(row, drug);
  await expect(row().first()).toBeVisible();
  const mark = await toastMark(page);
  await row().first().getByRole('button', { name: 'Return' }).click();
  return toastsAfter(page, mark);
}

/**
 * Whether Issue Lines holds a line of the drug with Issued = Returned = qty
 * and no Return control. The rows name the item, not the patient, and the
 * search narrows only the page on screen (found blocker 40), so the list is
 * paged until such a line shows.
 */
export async function fullyReturnedLine(page: Page, qty: string): Promise<boolean> {
  const il = new IssueLinesPage(page);
  const esc = drug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = () => il.rows().filter({ hasText: new RegExp(`^\\s*${esc}\\s+${qty}\\s+${qty}\\s+\\S+\\s+\\S+\\s+${qty}\\s+—`) });
  await il.open();
  await il.showRow(row, '');
  return (await row().count()) > 0;
}
