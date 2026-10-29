import type { Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage, type PurchaseOrder } from '../../../pages/procurement/ProcurementPages';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { newItem } from '../07-inventory/cases';
import { toastsOf } from '../shared/access';

/**
 * Steps of 09-procurement.xlsx shared by the module specs and the end-to-end
 * chains (tests/e2e/chains/): each test case is declared by its module spec
 * with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const SAVED = 'Saved.';

export async function press(desk: ProcurementDeskPage, name: string): Promise<string[]> {
  return toastsOf(desk.page, () => desk.button(name).click());
}

/** The ids of the lines that name a text (a request names its item), newest last. */
export async function idsOf(desk: ProcurementDeskPage, text: string): Promise<string[]> {
  const all = await desk.main.innerText();
  const re = new RegExp(`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\\n]*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`, 'g');
  return [...all.matchAll(re)].map((m) => m[1]);
}

/** A request of this test for its item, saved on Suppliers and requests; returns its id. */
export async function raise(desk: ProcurementDeskPage, item: string): Promise<string> {
  await desk.open('suppliers', 'Suppliers and requests');
  await desk.input('Item').fill(item);
  await desk.input('Quantity').fill('50');
  expect(await press(desk, 'request')).toContain(SAVED);
  await desk.open('suppliers', 'Suppliers and requests');
  await expect(desk.main).toContainText(item);
  const id = (await idsOf(desk, item)).at(-1);
  expect(id, `the id of the request for ${item}`).toBeTruthy();
  return id!;
}

export async function act(desk: ProcurementDeskPage, route: 'suppliers' | 'requests', id: string, button: string): Promise<string[]> {
  await desk.open(route, route === 'suppliers' ? 'Suppliers and requests' : 'Purchase orders');
  await desk.input('Document').fill(id);
  return press(desk, button);
}

/** The status word before the line of an id. */
export async function statusOfId(desk: ProcurementDeskPage, route: 'suppliers' | 'requests', id: string): Promise<string> {
  await desk.open(route, route === 'suppliers' ? 'Suppliers and requests' : 'Purchase orders');
  await expect(desk.main).toContainText(id).catch(() => {});
  const line = (await desk.main.innerText()).split('\n').find((l) => l.includes(id)) ?? '';
  return line.trim().split(/\s+/)[0] ?? '';
}

/** TC-APP009-039: a purchase request raised, sent and approved on Suppliers and requests; returns its id (E2E-009 step 1). */
export const TC_APP009_039 = async ({ page, qa }: CaseArgs): Promise<string> => {
  const desk = new ProcurementDeskPage(page);
  const item = await newItem(page, qa);
  let id = '';

  await qa.step(1, async () => {
    id = await raise(desk, item);
  });

  await qa.step(2, async () => {
    expect(await act(desk, 'suppliers', id, 'send_request')).toContain(SAVED);
  });

  await qa.step(3, async () => {
    expect(await act(desk, 'suppliers', id, 'approve_request')).toContain(SAVED);
    qa.note(3, `the line reads "${await statusOfId(desk, 'suppliers', id)}" (TBD in the workbook: the status text)`);
  });
  return id;
};

// ------------------------------------------------------------ purchase orders (/procurement/purchase-orders)

export async function poToastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** "5000000" -> "IDR 5.000.000,00"; "1500000.50" -> "IDR 1.500.000,50" (Indonesian separators, as on the site). */
export function idr(amount: string, currency = 'IDR'): string {
  const [whole, frac = ''] = amount.split('.');
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${(frac + '00').slice(0, 2)}`;
}

export const docNo = (qa: Qa) => `QA-PO-001-${qa.token()}`;

/** Creates an order through "New PO" and returns the toasts (the opened order stays on screen). */
export async function createOrder(page: Page, po: PurchaseOrder): Promise<string[]> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  await p.openNew();
  await p.fill(po);
  const mark = await toastMark(page);
  await p.save().click();
  return poToastsAfter(page, mark);
}

export async function openOrder(page: Page, doc: string): Promise<PurchaseOrdersPage> {
  const p = new PurchaseOrdersPage(page);
  await p.open();
  await (await p.find(doc)).getByRole('button', { name: 'Open' }).click();
  await expect(p.view).toBeVisible();
  return p;
}

/** TC-APP009-004: an order of the test (PO-S1) on its first approval step, advanced once; the approval chain of the site stops it (found blocker 30). */
export const TC_APP009_004 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const doc = docNo(qa);
  expect(await createOrder(page, { docNumber: doc, vendor: PROCUREMENT.vendor, advance: PROCUREMENT.advance })).toContain('Purchase order created');
  qa.note(1, 'PO-S1 is an order of this test');
  let p: PurchaseOrdersPage;

  await qa.step(1, async () => {
    p = await openOrder(page, doc);
    const steps = await p.steps();
    expect(steps[0]).toContain('Current');
    if (!steps[0].includes('Pengajuan Departemen')) qa.deviation(1, 'Step 1 "Pengajuan Departemen" marked "Current"', `step 1 "${steps[0].join(' ')}" (found blocker 30)`);
  });

  await qa.step(2, async () => {
    const mark = await toastMark(page);
    await p.advance().click();
    expect(await poToastsAfter(page, mark)).toContain('Approval advanced');
  });

  await qa.step(3, async () => {
    qa.note(3, `steps after the advance: ${(await p.steps()).map((s) => s.join(' ')).join(' / ')}`);
  });
  qa.blocked(3, 30);
  qa.blocked(4, 30);
};
