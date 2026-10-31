import type { Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage, type PurchaseOrder } from '../../../pages/procurement/ProcurementPages';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { newItem } from '../07-inventory/cases';
import { addDays, todayWib } from '../../../lib/dates';
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

/** Fills the order form of /procurement/requests. */
export async function fillOrder(desk: ProcurementDeskPage, qa: Qa, no: string, item: string, extra: Record<string, string> = {}): Promise<void> {
  await desk.open('requests', 'Purchase orders');
  const v: Record<string, string> = { Supplier: qa.name('X PT Pemasok Uji'), Number: no, Item: item, Quantity: '50', Rate: '1000', Tax: 'PPN', Terms: '30 hari', ...extra };
  for (const [k, val] of Object.entries(v)) await desk.input(k).or(desk.main.getByRole('spinbutton', { name: k, exact: true })).fill(val);
}

/**
 * "order" as the workbook says (no document). When the server refuses it
 * (HTTP 500, "React error #441"), the order is made again with the id of an
 * approved purchase request of this test in "Document" (TBD in the workbook:
 * "whether an order must come from an approved request"). Returns the toasts
 * of the order that counts and what it needed.
 */
export async function placeOrder(desk: ProcurementDeskPage, qa: Qa, no: string, item: string): Promise<{ toasts: string[]; note: string }> {
  /** The order counts when its number is listed afterwards (a save may show no toast). */
  const listed = async () => {
    await desk.open('requests', 'Purchase orders');
    return (await desk.main.innerText()).includes(no);
  };
  const tries: { extra: Record<string, string>; what: string }[] = [{ extra: {}, what: 'as in the workbook (no document)' }];
  const seen: string[] = [];
  for (let i = 0; ; i++) {
    const t = tries[i];
    await fillOrder(desk, qa, no, item, t.extra);
    const toasts = await press(desk, 'order');
    seen.push(`${t.what}: "${toasts.join(' / ').slice(0, 70) || 'no toast'}"`);
    if (toasts.includes(SAVED) || (await listed())) return { toasts: toasts.includes(SAVED) ? toasts : [...toasts, SAVED], note: seen.join('; ') };
    if (i === 0) {
      // TBD in the workbook: "whether an order must come from an approved request"; Preconditions: "A supplier exists".
      const request = await raise(desk, item);
      expect(await act(desk, 'suppliers', request, 'send_request')).toContain(SAVED);
      expect(await act(desk, 'suppliers', request, 'approve_request')).toContain(SAVED);
      tries.push({ extra: { Document: request }, what: `with the approved request ${request} in "Document"` });
      tries.push({ extra: { Document: request, Supplier: PROCUREMENT.vendor }, what: `with that request and the existing vendor "${PROCUREMENT.vendor}"` });
    }
    if (i === tries.length - 1) return { toasts, note: seen.join('; ') };
  }
}


/** TC-APP009-043: a purchase order made on /procurement/requests, sent, approved, amended and followed up. */
export const TC_APP009_043 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const desk = new ProcurementDeskPage(page);
  // The form's item must be a code of Inventory (TC-APP009-046 note): X-ITM1 of this test.
  const item = await newItem(page, qa);
  const no = qa.code('X-PO-0001');
  let id = '';

  await qa.step(1, async () => {
    await page.goto('/id/procurement');
    await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link', { name: 'Purchase requests' }).click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Purchase orders' })).toBeVisible();
    for (const f of ['Supplier', 'Number', 'Item', 'Quantity', 'Rate', 'Tax', 'Terms', 'Document', 'Follow-up date', 'Note']) await expect(desk.input(f).or(desk.main.getByRole('spinbutton', { name: f, exact: true }))).toBeVisible();
    for (const b of ['order', 'send_order', 'approve_order', 'amend', 'followup']) await expect(desk.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    const r = await placeOrder(desk, qa, no, item);
    qa.note(2, r.note);
    if (r.toasts.includes(SAVED)) {
      await desk.open('requests', 'Purchase orders');
      id = await desk.idOf(no);
    }
  });
  if (!id) {
    // No order can be made (found blocker 44): nothing to send, approve, amend or follow up.
    for (const st of [2, 3, 4, 5]) qa.blocked(st, 44);
    return;
  }

  await qa.step(3, async () => {
    expect(await act(desk, 'requests', id, 'send_order')).toContain(SAVED);
    expect(await act(desk, 'requests', id, 'approve_order')).toContain(SAVED);
  });

  await qa.step(4, async () => {
    const amended = qa.code('X-PO-0001A');
    await desk.open('requests', 'Purchase orders');
    await desk.input('Document').fill(id);
    await desk.input('Number').fill(amended);
    expect(await press(desk, 'amend')).toContain(SAVED);
    await desk.open('requests', 'Purchase orders');
    const text = await desk.main.innerText();
    qa.note(4, `after "amend": ${text.includes(amended) ? 'the new number is listed' : 'the new number is not listed'}; the earlier number ${text.includes(no) ? 'is kept' : 'is gone'} (TBD in the workbook)`);
  });

  await qa.step(5, async () => {
    await desk.open('requests', 'Purchase orders');
    await desk.input('Document').fill(id);
    await desk.input('Follow-up date').fill(addDays(todayWib(), 7));
    await desk.input('Note').fill(qa.prefix('X Konfirmasi pengiriman'));
    expect(await press(desk, 'followup')).toContain(SAVED);
  });
};
