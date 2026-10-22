import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { toastsOf } from '../shared/access';
import { newItem } from '../07-inventory/cases';

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

const SAVED = 'Saved.';

async function press(desk: ProcurementDeskPage, name: string): Promise<string[]> {
  return toastsOf(desk.page, () => desk.button(name).click());
}

/** The ids of the lines that name a text (a request names its item), newest last. */
async function idsOf(desk: ProcurementDeskPage, text: string): Promise<string[]> {
  const all = await desk.main.innerText();
  const re = new RegExp(`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\\n]*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`, 'g');
  return [...all.matchAll(re)].map((m) => m[1]);
}

/** A request of this test for its item, saved on Suppliers and requests; returns its id. */
async function raise(desk: ProcurementDeskPage, item: string): Promise<string> {
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

async function act(desk: ProcurementDeskPage, route: 'suppliers' | 'requests', id: string, button: string): Promise<string[]> {
  await desk.open(route, route === 'suppliers' ? 'Suppliers and requests' : 'Purchase orders');
  await desk.input('Document').fill(id);
  return press(desk, button);
}

/** The status word before the line of an id. */
async function statusOfId(desk: ProcurementDeskPage, route: 'suppliers' | 'requests', id: string): Promise<string> {
  await desk.open(route, route === 'suppliers' ? 'Suppliers and requests' : 'Purchase orders');
  await expect(desk.main).toContainText(id).catch(() => {});
  const line = (await desk.main.innerText()).split('\n').find((l) => l.includes(id)) ?? '';
  return line.trim().split(/\s+/)[0] ?? '';
}

qaTest('TC-APP009-039', async ({ page, qa }) => {
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
});

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

qaTest('TC-APP009-043', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  // The form's item must be a code of Inventory (TC-APP009-046 note): X-ITM1 of this test.
  const item = await newItem(page, qa);
  const no = qa.code('X-PO-0001');
  let id = '';

  await qa.step(1, async () => {
    await page.goto('/en/procurement');
    await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link', { name: 'Purchase requests' }).click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Purchase orders' })).toBeVisible();
    for (const f of ['Supplier', 'Number', 'Item', 'Quantity', 'Rate', 'Tax', 'Terms', 'Document', 'Follow-up date', 'Note']) await expect(desk.input(f).or(desk.main.getByRole('spinbutton', { name: f, exact: true }))).toBeVisible();
    for (const b of ['order', 'send_order', 'approve_order', 'amend', 'followup']) await expect(desk.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    await fillOrder(desk, qa, no, item);
    expect(await press(desk, 'order')).toContain(SAVED);
    await desk.open('requests', 'Purchase orders');
    id = await desk.idOf(no);
  });

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
  await fillOrder(desk, qa, no, await newItem(page, qa));
  expect(await press(desk, 'order')).toContain(SAVED);
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
