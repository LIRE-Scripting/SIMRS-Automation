import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { INVENTORY, STAND_IN_STORE } from '../../../lib/inventory-data';
import { StockRequestsPage, StoresPage } from '../../../pages/inventory/InventoryE2EPages';
import { TC_APP007_010 } from './cases';

/**
 * 07-inventory.xlsx, features "Stores (/inventory/stores)" and "Stock
 * Requests (/inventory/stock-requests)". The request's department "QA
 * Bangsal Dalam" is the department made once for 06 (same name in both
 * catalogues). Document numbers "QA-SR-0001" get the run's token.
 */

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureBloodbankDepartment(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** Creates a stock request; returns the toasts. */
async function createRequest(sr: StockRequestsPage, v: { docNo: string; remarks?: string; code?: string; net?: string; currency?: string }): Promise<string[]> {
  const d = await sr.openNew();
  await d.getByRole('textbox', { name: 'Document number' }).fill(v.docNo);
  await sr.department(INVENTORY.request.department);
  if (v.code) {
    await d.getByRole('textbox', { name: 'Scan or type item code…' }).fill(v.code);
    await d.getByRole('textbox', { name: 'Scan or type item code…' }).press('Enter');
  }
  if (v.remarks !== undefined) await d.getByRole('textbox', { name: 'Remarks' }).fill(v.remarks);
  if (v.net !== undefined) await d.getByRole('spinbutton', { name: 'Net amount' }).fill(v.net);
  if (v.currency !== undefined) await d.getByRole('textbox', { name: 'Currency' }).fill(v.currency);
  const mark = await toastMark(sr.page);
  await d.getByRole('button', { name: 'Create' }).click();
  return toastsAfter(sr.page, mark);
}

qaTest('TC-APP007-010', TC_APP007_010);

qaTest('TC-APP007-011', async ({ page, qa }) => {
  const sr = new StockRequestsPage(page);
  const docNo = qa.code(INVENTORY.request.docNo);
  const d = sr.dialog;

  await qa.step(1, async () => {
    await page.goto('/en/inventory');
    await page.getByRole('main').getByRole('link', { name: 'Stock Requests', exact: true }).click();
    await sr.main.getByRole('button', { name: 'New Stock Request' }).click();
    await expect(d.getByText('Request stock for a department. List the items in remarks.')).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Document date' })).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(d.getByRole('combobox', { name: 'Request type' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Currency' })).toHaveValue('IDR');
    await expect(d.getByRole('spinbutton', { name: 'Net amount' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Remarks' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Document number' }).fill(docNo);
    await sr.department(INVENTORY.request.department);
    // The item of the catalogue's remark is QA-INV-PARA; codes are made per run elsewhere, so the seed code is typed as the workbook says.
    await d.getByRole('textbox', { name: 'Scan or type item code…' }).fill(INVENTORY.it1.code);
    await d.getByRole('textbox', { name: 'Scan or type item code…' }).press('Enter');
    const remarks = await d.getByRole('textbox', { name: 'Remarks' }).inputValue();
    qa.note(2, `Remarks after the scan: "${remarks}"`);
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Remarks' }).fill(INVENTORY.request.remarks);
    await d.getByRole('button', { name: 'Create' }).click();
    await expect(toastLocator(page, /^Stock request created\.$/)).toBeVisible();
  });

  await qa.step(4, async () => {
    const row = sr.row(docNo);
    await expect(row).toContainText(INVENTORY.request.department);
    await expect(row).toContainText('Routine');
    await expect(row).toContainText('Pending');
    await expect(row).toContainText('Open');
    await expect(row.getByRole('button', { name: 'Approve' })).toBeVisible();
  });
});

qaTest('TC-APP007-012', async ({ page, qa }) => {
  const sr = new StockRequestsPage(page);
  const docNo = qa.code(INVENTORY.request.docNo);
  await sr.open();
  expect(await createRequest(sr, { docNo, remarks: INVENTORY.request.remarks })).toContain('Stock request created.');

  await qa.step(1, async () => {
    await sr.row(docNo).getByRole('button', { name: 'Approve' }).click();
    await expect(toastLocator(page, /^Stock request approved\.$/)).toBeVisible();
    await expect(sr.row(docNo)).toContainText('Approved');
    await expect(sr.row(docNo).getByRole('button', { name: 'Fulfill' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await sr.row(docNo).getByRole('button', { name: 'Fulfill' }).click();
    await expect(toastLocator(page, /^Stock request fulfilled\.$/)).toBeVisible();
    await expect(sr.row(docNo)).toContainText('Fulfilled');
    await expect(sr.row(docNo).getByRole('button')).toHaveCount(0);
  });
});

qaTest('TC-APP007-025', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/en/inventory');
    const links = await page.getByRole('main').getByRole('link').allInnerTexts();
    if (!links.some((l) => /transfer|mutasi/i.test(l))) qa.deviation(1, 'A transfer with source, destination, batch and quantity', `no transfer on the Inventory hub (links: ${links.join(', ')}); Store documents has a "transfer" document (TC-APP007-045)`);
  });
  qa.notRun(2, 'needs stock per store to be read after a fulfilled request; Item Master shows stock per item only (TC-APP007-006)');
});

qaTest('TC-APP007-026', async ({ page, qa }) => {
  const sr = new StockRequestsPage(page);
  await sr.open();

  await qa.step(1, async () => {
    await sr.openNew();
    const qty = await sr.dialog.getByRole('spinbutton', { name: /Quantity/i }).count();
    if (!qty) qa.deviation(1, 'A line per item with a quantity field', 'no item lines: items are free text in Remarks');
    await sr.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(2, async () => {
    const toasts = await createRequest(sr, { docNo: qa.code(INVENTORY.request.docNo), remarks: '' });
    if (toasts.includes('Stock request created.')) qa.deviation(2, 'Refused: a request needs at least one item', 'created with empty Remarks');
  });

  await qa.step(3, async () => {
    const docNo = qa.code(INVENTORY.request.docNo);
    expect(await createRequest(sr, { docNo, remarks: `[${INVENTORY.it1.code}] ${INVENTORY.it1.name} x 5000` })).toContain('Stock request created.');
    await sr.row(docNo).getByRole('button', { name: 'Approve' }).click();
    await expect(toastLocator(page, /^Stock request approved\.$/)).toBeVisible();
    const mark = await toastMark(page);
    await sr.row(docNo).getByRole('button', { name: 'Fulfill' }).click();
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Stock request fulfilled.')) qa.deviation(3, 'Refused, or fulfilled in part: only 100 are in stock', 'fulfilled (toast "Stock request fulfilled."): nothing reads the remark');
  });
});

qaTest('TC-APP007-028', async ({ page, qa }) => {
  const sr = new StockRequestsPage(page);
  await sr.open();
  const existing = qa.code(INVENTORY.request.docNo);
  expect(await createRequest(sr, { docNo: existing, remarks: INVENTORY.request.remarks })).toContain('Stock request created.');
  const close = async () => {
    if (await sr.dialog.isVisible()) await sr.dialog.getByRole('button', { name: 'Cancel' }).click();
  };

  for (const [step, v, excel] of [
    [1, { docNo: existing }, 'Refused: the number is in use'],
    [2, { docNo: `QA-SR-${'9'.repeat(60)}`.slice(0, 60) }, 'Refused with a message that names the limit of 50'],
    [3, { docNo: qa.code(INVENTORY.request.docNo), net: '-100' }, 'Refused: the amount cannot be negative'],
  ] as const) {
    await qa.step(step, async () => {
      const toasts = await createRequest(sr, { remarks: INVENTORY.request.remarks, ...v });
      expect(toasts).not.toContain('Stock request created.');
      if (!toasts.some((t) => /use|exist|50|long|negative/i.test(t))) qa.deviation(step, excel, `toast "${toasts.join(' / ')}"`);
      await close();
    });
  }

  await qa.step(4, async () => {
    const toasts = await createRequest(sr, { docNo: qa.code(INVENTORY.request.docNo), remarks: INVENTORY.request.remarks, currency: 'XYZ123' });
    if (toasts.includes('Stock request created.')) qa.deviation(4, 'Refused, or picked from a list', 'saved: the currency is free text');
    await close();
  });
});

qaTest('TC-APP007-031', async ({ page, qa }) => {
  const stores = new StoresPage(page);
  await stores.open();
  const freeze = stores.main.getByRole('spinbutton', { name: 'Freeze days' });
  const save = async (v: string) => {
    await freeze.fill(v);
    const mark = await toastMark(page);
    await stores.main.getByRole('button', { name: 'Save freeze' }).click();
    return toastsAfter(page, mark);
  };

  await qa.step(1, async () => {
    const branch = (await stores.main.getByRole('combobox', { name: 'Branch' }).inputValue()) || (await stores.main.getByRole('combobox', { name: 'Branch' }).innerText());
    if (!/Podomoro/.test(branch)) qa.deviation(1, 'BR-A, the branch the user works on', `the field shows "${branch}"`);
  });

  await qa.step(2, async () => {
    for (const v of ['-1', '1.5']) {
      const toasts = await save(v);
      if (!toasts.includes('Could not save the store rule.')) qa.deviation(2, `Toast "Could not save the store rule." for ${v}`, `toast "${toasts.join(' / ')}"`);
    }
  });

  await qa.step(3, async () => {
    const toasts = await save('3651');
    expect(toasts).not.toContain('Freeze limit saved.');
    if (!toasts.some((t) => /3650/.test(t))) qa.deviation(3, 'Refused: at most 3650', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    expect(await save(INVENTORY.freezeDays)).toContain('Freeze limit saved.');
  });
});
