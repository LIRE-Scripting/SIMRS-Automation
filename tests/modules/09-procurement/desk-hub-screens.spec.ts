import { asOnSite } from '../../../lib/i18n';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { PurchaseOrdersPage, ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { sourceOnSite } from '../../../lib/i18n';
import { SEED_SUPPLIER } from './cases';

/**
 * 09-procurement.xlsx: hub and language (011, 013), Suppliers and requests
 * (037, 038), Receipts and returns (046 … 052) and the screen check of every
 * route (054 … 059). Refusals seen on 2026-10-15 are the toast "Minified
 * React error #441"; the steps check that nothing was saved and record it.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

async function press(desk: ProcurementDeskPage, name: string): Promise<string[]> {
  const mark = await toastMark(desk.page);
  await desk.button(name).click();
  return toastsAfter(desk.page, mark);
}

qaTest('TC-APP009-011', async ({ page, qa }) => {
  const po = new PurchaseOrdersPage(page);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Procurement\b/ }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Procurement' })).toBeVisible();
    await expect(page.getByText('Procure-to-pay', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Purchase orders Open purchase orders$/ })).toBeVisible();
  });

  await qa.step(2, async () => {
    await page.getByRole('link', { name: /^Purchase orders Open purchase orders$/ }).click();
    await expect(po.heading).toBeVisible();
    await expect(page.getByRole('navigation').filter({ hasText: /^Procurement\s*\/\s*Purchase orders$/ })).toBeVisible();
    await page.goto('/id/procurement');
    await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link', { name: 'Purchase orders' }).click();
    await expect(po.heading).toBeVisible();
    const side = (await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link').allInnerTexts()).map((t) => t.trim());
    qa.note(2, `sidebar: ${side.join(', ')}`);
  });

  await qa.step(3, () => asOnSite(async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/procurement/purchase-orders');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const button = (await page.getByRole('button').filter({ hasText: /^(PO baru|New PO)$/ }).allInnerTexts()).join('');
    const cols = (await page.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
    qa.note(3, `heading "${h1}", button "${button}", columns ${cols.join(', ')}`);
    if (button === 'New PO' || cols.includes('Balance')) qa.deviation(3, 'Indonesian headings, column names and buttons ("PO baru", …)', `English: ${[button === 'New PO' && '"New PO"', cols.includes('Balance') && 'columns'].filter(Boolean).join(', ')}`);
  }));
});

qaTest('TC-APP009-013', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await expect(page.getByRole('link', { name: /^Procurement\b/ }).first()).toContainText('PR, PO, tender');
  });

  await qa.step(2, async () => {
    await page.goto('/id/procurement');
    const nav = page.getByRole('navigation', { name: 'Procurement' }).getByRole('link');
    const side = (await nav.allInnerTexts()).map((t) => t.trim());
    qa.note(2, `sidebar: ${side.join(', ')}. "Suppliers" has the buttons request, send_request, approve_request and reject_request`);
    // "Pemasok" reads back as "Supplier": the link is looked for by its text on the site.
    await expect(nav.filter({ hasText: new RegExp(`^${sourceOnSite('Suppliers')}$`) })).toHaveCount(1);
  });

  await qa.step(3, async () => {
    const side = (await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link').allInnerTexts()).join(' ');
    if (!/tender|quotation|offer/i.test(side)) qa.deviation(3, 'A screen to record and compare offers', `no tender or quotation screen (sidebar: ${side})`);
  });

  await qa.step(4, async () => {
    const desk = new ProcurementDeskPage(page);
    await desk.open('requests', 'Purchase orders');
    const fields = await desk.main.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? ''));
    qa.note(4, `"Purchase requests" (/procurement/requests) is titled "Purchase orders" with ${fields.join(', ')}`);
    if (!fields.some((f) => /request/i.test(f))) qa.deviation(4, 'The order is created from the request', 'an order does not refer to a request');
  });
});

qaTest('TC-APP009-037', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const supplier = qa.name('X PT Pemasok Uji');

  await qa.step(1, async () => {
    await page.goto('/id/procurement');
    await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link', { name: 'Suppliers' }).click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Suppliers and requests' })).toBeVisible();
    for (const f of ['Supplier', 'Item', 'Quantity', 'Document']) await expect(desk.input(f)).toBeVisible();
    for (const b of ['Save', 'request', 'send_request', 'approve_request', 'reject_request']) await expect(desk.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    await desk.input('Supplier').fill(supplier);
    expect(await press(desk, 'Save')).toContain('Saved.');
    await expect(desk.main.getByText(supplier)).toBeVisible();
  });
});

qaTest('TC-APP009-038', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('suppliers', 'Suppliers and requests');
    const before = await desk.main.innerText();
    await desk.input('Supplier').fill('');
    const toasts = await press(desk, 'Save');
    expect(toasts).not.toContain('Saved.');
    await desk.open('suppliers', 'Suppliers and requests');
    expect(await desk.main.innerText()).toBe(before);
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "supplier name is required")`);
  });
});

/**
 * "An approved order of the new Purchase orders screen": made on
 * /procurement/requests with the item QA-PARA (the form's prefilled item code
 * does not exist and the save answers HTTP 500), sent and approved. Returns its id.
 */
async function approvedOrder(page: Page, qa: Qa): Promise<string> {
  const desk = new ProcurementDeskPage(page);
  const no = qa.code('X-PO');
  await desk.open('requests', 'Purchase orders');
  await desk.input('Supplier').fill(SEED_SUPPLIER);
  await desk.input('Number').fill(no);
  await desk.input('Item').fill('QA-PARA');
  expect(await press(desk, 'order')).toContain('Saved.');
  await desk.open('requests', 'Purchase orders');
  const id = await desk.idOf(no);
  await desk.input('Document').fill(id);
  expect(await press(desk, 'send_order')).toContain('Saved.');
  expect(await press(desk, 'approve_order')).toContain('Saved.');
  await desk.open('requests', 'Purchase orders');
  expect(await desk.statusOf(no)).toBe('approved');
  qa.note(1, `approved order ${no} (${id}) made on /procurement/requests with the item QA-PARA and the seed supplier PT Enseval`);
  return id;
}

const storeNote = (qa: Qa, step: number) => qa.note(step, `store "X-ST1" cannot be made (found blocker 26); the seed store code ${PHARMACY_STORE.code} is typed`);

qaTest('TC-APP009-046', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);

  await qa.step(1, async () => {
    await page.goto('/id/procurement');
    await page.getByRole('navigation', { name: 'Procurement' }).getByRole('link', { name: 'Receipts' }).click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Receipts and returns' })).toBeVisible();
    for (const f of ['Document', 'Store', 'Batch', 'Expiry', 'Quantity', 'Amount', 'Supplier', 'Note']) await expect(desk.input(f)).toBeVisible();
    for (const b of ['gate', 'grn', 'invoice', 'vendor_return', 'expiry_return']) await expect(desk.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    await desk.input('Document').fill(id);
    await desk.input('Quantity').fill('50');
    expect(await press(desk, 'gate')).toContain('Saved.');
  });

  await qa.step(3, async () => {
    storeNote(qa, 3);
    await desk.input('Store').fill(PHARMACY_STORE.code);
    await desk.input('Batch').fill(qa.code('X-B02'));
    await desk.input('Expiry').fill(addDays(todayWib(), 365));
    const toasts = await press(desk, 'grn');
    qa.note(3, `toast "${toasts.join(' / ')}"`);
    expect(toasts).not.toContain('Saved.');
  });
  qa.blocked(3, 31);
  qa.blocked(4, 31);
});

qaTest('TC-APP009-047', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await desk.open('receipts', 'Receipts and returns');

  await qa.step(1, async () => {
    await desk.input('Document').fill('');
    await desk.input('Quantity').fill('50');
    const toasts = await press(desk, 'gate');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "document is missing")`);
  });

  await qa.step(2, async () => {
    await desk.input('Document').fill(id);
    await desk.input('Quantity').fill('0');
    const toasts = await press(desk, 'gate');
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "quantity must be positive")`);
  });
});

qaTest('TC-APP009-048', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await qa.step(1, async () => {
    await desk.open('receipts', 'Receipts and returns');
    await desk.input('Document').fill(id);
    await desk.input('Store').fill(PHARMACY_STORE.code);
    await desk.input('Batch').fill('');
    const toasts = await press(desk, 'grn');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "store, batch and expiry are required"); grn answers HTTP 500 with a batch too (found blocker 31)`);
  });
});

qaTest('TC-APP009-049', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await qa.step(1, async () => {
    await desk.open('receipts', 'Receipts and returns');
    await desk.input('Document').fill(id);
    await desk.input('Amount').fill('50000');
    const toasts = await press(desk, 'invoice');
    qa.note(1, `toast "${toasts.join(' / ')}"`);
    expect(toasts).not.toContain('Saved.');
  });
  qa.blocked(1, 31);
  qa.blocked(2, 31);
});

qaTest('TC-APP009-050', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await desk.open('receipts', 'Receipts and returns');

  await qa.step(1, async () => {
    await desk.input('Document').fill(id);
    await desk.input('Amount').fill('0');
    const toasts = await press(desk, 'invoice');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "amount must be positive")`);
  });

  await qa.step(2, async () => {
    await desk.input('Document').fill('');
    await desk.input('Amount').fill('50000');
    const toasts = await press(desk, 'invoice');
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "document is missing")`);
  });
});

qaTest('TC-APP009-051', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await qa.step(1, async () => {
    await desk.open('receipts', 'Receipts and returns');
    await desk.input('Document').fill(id);
    await desk.input('Quantity').fill('5');
    await desk.input('Note').fill(qa.prefix('X kemasan rusak'));
    const toasts = await press(desk, 'vendor_return');
    qa.note(1, `toast "${toasts.join(' / ')}" (no goods can be received first, found blocker 31)`);
    expect(toasts).not.toContain('Saved.');
  });
  for (const s of [1, 2, 3]) qa.blocked(s, 31);
});

qaTest('TC-APP009-052', async ({ page, qa }) => {
  const desk = new ProcurementDeskPage(page);
  const id = await approvedOrder(page, qa);
  await desk.open('receipts', 'Receipts and returns');

  await qa.step(1, async () => {
    await desk.input('Document').fill(id);
    await desk.input('Quantity').fill('5');
    await desk.input('Note').fill('');
    const toasts = await press(desk, 'vendor_return');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "reason is required")`);
  });

  await qa.step(2, async () => {
    await desk.input('Quantity').fill('0');
    await desk.input('Note').fill(qa.prefix('X kemasan rusak'));
    const toasts = await press(desk, 'vendor_return');
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "quantity must be positive")`);
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP009-054', '/procurement', 'Procurement'],
  ['TC-APP009-055', '/procurement/purchase-orders', 'Purchase orders'],
  ['TC-APP009-056', '/procurement/receipts', 'Receipts and returns'],
  ['TC-APP009-057', '/procurement/reorder', 'Reorder'],
  ['TC-APP009-058', '/procurement/requests', 'Purchase orders'],
  ['TC-APP009-059', '/procurement/suppliers', 'Suppliers and requests'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
