import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { newItem } from '../07-inventory/cases';
import { act, fillOrder, placeOrder, press, raise, SAVED, statusOfId, TC_APP009_039, TC_APP009_043 } from './cases';

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

qaTest('TC-APP009-043', TC_APP009_043);

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
