import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY, STAND_IN_STORE } from '../../../lib/inventory-data';
import { ItemMasterPage, optionWith, StockRequestsPage, StoresPage } from '../../../pages/inventory/InventoryE2EPages';
import { appsCardRefused, asUser, BR_A, BR_B, columnTexts, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { newItem } from './cases';

/**
 * 07-inventory.xlsx, the access test cases of Item Master, Stores and Stock
 * Requests: U2 on "All branches", U3 without any right, and U1 next to a
 * branch of U6 (Kemayoran). IT-1 is an item of each test ("X-ITM1-<token>");
 * the department of a BR-B request is "Anak", a department of Kemayoran.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const BR_B_DEPARTMENT = 'Anak';

/** The codes of the stores of a branch on the Stores list (column Branch). */
async function storesOf(page: Page, branch: string): Promise<string[]> {
  const stores = new StoresPage(page);
  await stores.open();
  await expect(stores.table.getByRole('row').nth(1)).toBeVisible();
  const codes = await columnTexts(page, 0);
  const branches = await columnTexts(page, 2);
  return codes.filter((_, i) => branches[i] === branch);
}

/** The store list of "Add batch" in the Edit Item dialog. */
function batchStore(page: Page, d: Locator): Locator {
  return d.getByRole('combobox').filter({ hasNot: page.getByRole('option', { name: 'All statuses' }) }).last();
}

/** Lines of "Stock on hand" ("STORE · BATCH qty · expiry"). */
async function stockLines(items: ItemMasterPage, d: Locator): Promise<string[]> {
  const lines = d.getByText('Stock on hand', { exact: true }).locator('xpath=..').getByRole('listitem');
  await lines.first().waitFor({ timeout: 5_000 }).catch(() => {});
  return (await lines.allInnerTexts()).map((l) => l.replace(/\s+/g, ' ').trim());
}

/** Creates a stock request; the department is picked from the branch's list. */
async function newRequest(sr: StockRequestsPage, docNo: string, department: string, branch?: string): Promise<string[]> {
  const d = await sr.openNew();
  if (branch) await d.getByRole('combobox', { name: 'Branch' }).selectOption({ label: branch });
  await d.getByRole('textbox', { name: 'Document number' }).fill(docNo);
  await sr.department(department);
  await d.getByRole('textbox', { name: 'Remarks' }).fill(INVENTORY.request.remarks);
  return toastsOf(sr.page, () => d.getByRole('button', { name: 'Create' }).click());
}

qaTest('TC-APP007-013', async ({ page, qa, browser }) => {
  const item = await asUser(browser, 'U1', (u1) => newItem(u1, qa));
  const items = new ItemMasterPage(page);
  const sr = new StockRequestsPage(page);
  let storeB = '';

  await qa.step(1, async () => {
    const stores = new StoresPage(page);
    await stores.open();
    const branches = new Set(await columnTexts(page, 2));
    expect([...branches]).toEqual(expect.arrayContaining([BR_A, BR_B]));
    storeB = (await storesOf(page, BR_B))[0];
    expect(storeB, `a store of ${BR_B}`).toBeTruthy();
    qa.note(1, `the Stores list shows the stores of ${[...branches].join(', ')}; ST-B is ${storeB}`);
  });

  await qa.step(2, async () => {
    const batch = qa.code('X-B01');
    await items.open();
    const d = await items.openEdit({ code: item });
    await items.addBatch(d, { store: storeB, batch, expiry: addDays(todayWib(), 365), quantity: '10' });
    await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();
    await items.open();
    const lines = await stockLines(items, await items.openEdit({ code: item }));
    expect(lines.filter((l) => l.startsWith(`${storeB} · ${batch}`))).toHaveLength(1);
  });

  await qa.step(3, async () => {
    await sr.open();
    const d = await sr.openNew();
    const branch = d.getByRole('combobox', { name: 'Branch' });
    await expect(branch).toBeVisible();
    await branch.selectOption({ label: BR_B });
    await sr.department(BR_B_DEPARTMENT);
    qa.note(3, `with ${BR_B} chosen, the Department list offers "${BR_B_DEPARTMENT}" of ${BR_B}`);
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(4, async () => {
    await sr.open();
    const d = await sr.openNew();
    await d.getByRole('textbox', { name: 'Document number' }).fill(qa.code(INVENTORY.request.docNo));
    await d.getByRole('textbox', { name: 'Remarks' }).fill(INVENTORY.request.remarks);
    const toasts = await toastsOf(page, () => d.getByRole('button', { name: 'Create' }).click());
    expect(toasts).not.toContain('Stock request created.');
    const message = toasts.join(' / ') || (await d.getByRole('combobox', { name: 'Branch' }).evaluate((e: HTMLSelectElement) => e.validationMessage));
    if (!message.includes('Choose a branch before creating a stock request.')) qa.deviation(4, 'Toast "Choose a branch before creating a stock request."', message ? `"${message}"` : 'no message');
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(5, async () => {
    const docNo = qa.code(INVENTORY.request.docNo);
    await sr.open();
    expect(await newRequest(sr, docNo, BR_B_DEPARTMENT, BR_B)).toContain('Stock request created.');
    await asUser(browser, 'U6', async (u6) => {
      const b = new StockRequestsPage(u6);
      await b.open();
      await expect(b.row(docNo)).toHaveCount(1);
    });
  });
});

qaTest('TC-APP007-032', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): IT-1 and a pending stock request.
  const item = await newItem(page, qa);
  const docNo = qa.code(INVENTORY.request.docNo);
  const mine = new StockRequestsPage(page);
  await mine.open();
  expect(await newRequest(mine, docNo, INVENTORY.request.department)).toContain('Stock request created.');

  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const items = new ItemMasterPage(staff);
      const code = qa.code('QA-INV-NOHAK');
      await items.open();
      const d = await items.openAdd();
      await items.fill(d, { code, name: qa.name('QA-INV-NOHAK') });
      const toasts = await tryRefused(qa, 1, staff, 'Add Item', /^Item added\.$/, () => d.getByRole('button', { name: 'Save' }).click());
      if (!toasts.includes('Failed to save item.')) qa.deviation(1, 'Toast "Failed to save item."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
      const check = new ItemMasterPage(page);
      await check.open();
      await check.scan.fill(code);
      await check.scan.press('Enter');
      await expect(check.dialog('Edit Item')).toHaveCount(0);
    });

    await qa.step(2, async () => {
      const items = new ItemMasterPage(staff);
      await items.open();
      let d = await items.openEdit({ code: item });
      const batch = { store: STAND_IN_STORE.code, batch: qa.code('X-B01'), expiry: addDays(todayWib(), 365), quantity: '10' };
      await tryRefused(qa, 2, staff, 'Add batch', /^Batch quantity added\.$/, () => items.addBatch(d, batch));
      await items.open();
      d = await items.openEdit({ code: item });
      const kit = d.getByRole('button', { name: 'Save kit' });
      await tryRefused(qa, 2, staff, 'Save kit', /^Kit saved\.?$/i, () => kit.click());
      const check = new ItemMasterPage(page);
      await check.open();
      expect(await stockLines(check, await check.openEdit({ code: item }))).toEqual([]);
    });

    await qa.step(3, async () => {
      const stores = new StoresPage(staff);
      await stores.open();
      await stores.row(STAND_IN_STORE.code).getByRole('cell').nth(4).getByRole('button').click();
      const d = staff.getByRole('dialog').filter({ hasText: 'Visit types' });
      await tryRefused(qa, 3, staff, 'Save visit types (unchanged)', /^Visit types saved\.$/, () => d.getByRole('button', { name: 'Save' }).click());
      await stores.open();
      const freeze = stores.main.getByRole('spinbutton', { name: 'Freeze days' });
      await freeze.fill(await freeze.inputValue());
      await tryRefused(qa, 3, staff, 'Save freeze (unchanged)', /^Freeze limit saved\.$/, () => stores.main.getByRole('button', { name: 'Save freeze' }).click());
    });

    await qa.step(4, async () => {
      const sr = new StockRequestsPage(staff);
      const other = qa.code(INVENTORY.request.docNo);
      await sr.open();
      const toasts = await newRequest(sr, other, INVENTORY.request.department);
      expect(toasts).not.toContain('Stock request created.');
      qa.note(4, `New Stock Request: "${toasts.join(' / ') || 'no toast'}"`);
      await sr.open();
      await tryRefused(qa, 4, staff, 'Approve', /^Stock request approved\.$/, () => sr.row(docNo).getByRole('button', { name: 'Approve' }).click());
      await mine.open();
      await expect(mine.row(docNo)).toContainText('Pending');
      await expect(mine.row(other)).toHaveCount(0);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP007-033', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Inventory\b/));
    await qa.step(2, () =>
      routesRefused(staff, qa, 2, ['/inventory/items'], async () => {
        const items = new ItemMasterPage(staff);
        const first = items.rows().first();
        if (!(await first.count())) return;
        const code = (await first.getByRole('cell').first().innerText()).trim();
        const d = await items.openEdit({ code }).catch(() => null);
        if (!d) return;
        const cost = await d.getByRole('spinbutton', { name: 'Last cost' }).inputValue().catch(() => '');
        return `IT-1 (${code}) opens with its stock lines${cost ? ` and Last cost ${cost}` : ''}`;
      }),
    );
  });
});

qaTest('TC-APP007-034', async ({ page, qa, browser }) => {
  // Preconditions: IT-1 (U1), a batch of it in ST-B and a stock request of BR-B (both by U6).
  const item = await newItem(page, qa);
  const docB = qa.code(INVENTORY.request.docNo);
  const batchB = qa.code('X-B01');
  const storesB = await asUser(browser, 'U6', async (u6) => {
    const codes = await storesOf(u6, BR_B);
    const items = new ItemMasterPage(u6);
    await items.open();
    const d = await items.openEdit({ code: item });
    await items.addBatch(d, { store: codes[0], batch: batchB, expiry: addDays(todayWib(), 365), quantity: '10' });
    await expect(toastLocator(u6, /^Batch quantity added\.$/)).toBeVisible();
    const sr = new StockRequestsPage(u6);
    await sr.open();
    expect(await newRequest(sr, docB, BR_B_DEPARTMENT)).toContain('Stock request created.');
    return codes;
  });

  await qa.step(1, async () => {
    const stores = new StoresPage(page);
    await stores.open();
    const branches = new Set(await columnTexts(page, 2));
    expect([...branches]).toEqual([BR_A]);
  });

  await qa.step(2, async () => {
    const items = new ItemMasterPage(page);
    await items.open();
    const d = await items.openEdit({ code: item });
    const lines = await stockLines(items, d);
    expect(lines.filter((l) => l.includes(batchB))).toEqual([]);
    const offered = (await batchStore(page, d).locator('option').allInnerTexts()).map((o) => o.trim());
    const ofB = storesB.filter((code) => offered.some((o) => o.startsWith(code)));
    expect(ofB, `stores of ${BR_B} offered under "Add batch"`).toEqual([]);
    expect(await optionWith(batchStore(page, d), STAND_IN_STORE.code)).toBeTruthy();
  });

  await qa.step(3, async () => {
    const sr = new StockRequestsPage(page);
    await sr.open();
    await expect(sr.row(docB)).toHaveCount(0);
  });

  await qa.step(4, async () => {
    const items = new ItemMasterPage(page);
    await items.open();
    await expect((await items.openEdit({ code: item })).getByRole('textbox', { name: 'Item code' })).toHaveValue(item);
    qa.note(4, `${item} opens for U1 and for U6 (the catalogue is shared)`);
  });

  await qa.step(5, () => headerOneBranch(page, qa, 5));
});
