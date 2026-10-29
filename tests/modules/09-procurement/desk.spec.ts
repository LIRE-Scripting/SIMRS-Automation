import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { newItem } from '../07-inventory/cases';
import { act, press, raise, SAVED, statusOfId, TC_APP009_039 } from './cases';

/**
 * 09-procurement.xlsx, Suppliers and requests (/procurement/suppliers:
 * request, send_request, approve_request, reject_request) and Purchase
 * requests (/procurement/requests, titled "Purchase orders": order,
 * send_order, approve_order, amend, followup). Every action is a button
 * under the inputs; a saved line reads "<status> <number or item> <id>".
 * X-ITM1 is an item of each test made in Inventory; the supplier is free
 * text, so the workbook's "X PT Pemasok Uji" is typed (with a token).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP009-039', TC_APP009_039);

qaTest('TC-APP009-040', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('suppliers', 'Suppliers and requests');
    await desk.input('Item').fill('');
    await desk.input('Quantity').fill('50');
    const toasts = await press(desk, 'request');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Item" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "item and quantity are required")`);
  });
});

qaTest('TC-APP009-041', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  await qa.step(1, async () => {
    const toasts = await act(desk, 'suppliers', '', 'send_request');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Document" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "document is missing")`);
  });
});

qaTest('TC-APP009-042', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await raise(desk, await newItem(page, qa));
  expect(await act(desk, 'suppliers', id, 'send_request')).toContain(SAVED);
  await qa.step(1, async () => {
    expect(await act(desk, 'suppliers', id, 'reject_request')).toContain(SAVED);
    qa.note(1, `the line reads "${await statusOfId(desk, 'suppliers', id)}"; no reason is asked (TBD in the workbook)`);
  });
});

/** Fills the order form of /procurement/requests. */
async function fillOrder(desk: ProcurementDeskPage, qa: Qa, no: string, item: string, extra: Record<string, string> = {}): Promise<void> {
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
async function placeOrder(desk: ProcurementDeskPage, qa: Qa, no: string, item: string): Promise<{ toasts: string[]; note: string }> {
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

qaTest('TC-APP009-043', async ({ page, qa }) => {
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
});

qaTest('TC-APP009-044', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  await qa.step(1, async () => {
    await fillOrder(desk, qa, qa.code('X-PO-0001'), await newItem(page, qa), { Terms: '' });
    const toasts = await press(desk, 'order');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Terms" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "supplier, tax, terms, item, quantity and rate are required")`);
  });
});

qaTest('TC-APP009-045', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const no = qa.code('X-PO-0001');
  const placed = await placeOrder(desk, qa, no, await newItem(page, qa));
  qa.note(1, `the order of the test: ${placed.note}`);
  if (!placed.toasts.includes(SAVED)) {
    // No order can be made (found blocker 44): the refusals of its amendment and follow-up cannot be tried.
    for (const st of [1, 2]) qa.blocked(st, 44);
    return;
  }
  await desk.open('requests', 'Purchase orders');
  const id = await desk.idOf(no);

  await qa.step(1, async () => {
    await desk.open('requests', 'Purchase orders');
    await desk.input('Document').fill(id);
    await desk.input('Number').fill('');
    const toasts = await press(desk, 'amend');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Number" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "a new number is required")`);
  });

  await qa.step(2, async () => {
    await desk.open('requests', 'Purchase orders');
    await desk.input('Document').fill(id);
    await desk.input('Follow-up date').fill('');
    await desk.input('Note').fill(qa.prefix('X Konfirmasi pengiriman'));
    const toasts = await press(desk, 'followup');
    expect(toasts).not.toContain(SAVED);
    qa.note(2, `"Follow-up date" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "follow-up date and note are required")`);
  });
});
