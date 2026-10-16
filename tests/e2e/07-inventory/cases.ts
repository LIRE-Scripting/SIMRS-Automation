import { toastsSince, toastMark, toastLocator } from '../../../lib/assertions';
import { test, expect } from '../../../fixtures/e2e';
import { STAND_IN_STORE_2, STAND_IN_STORE, INVENTORY } from '../../../lib/inventory-data';
import { todayWib, addDays } from '../../../lib/dates';
import { StoresPage, StoreFormsPage, ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 07-inventory that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP007_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  const d = items.dialog('Add Item');

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Inventory\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Item Master' }).first().click();
    await expect(items.heading).toBeVisible();
    await expect(items.main.getByText('Drugs, consumables, and supplies.', { exact: true })).toBeVisible();
    await expect(items.search).toBeVisible();
    await expect(items.status).toBeVisible();
    await expect(items.scan).toBeVisible();
    await expect(items.main.getByRole('button', { name: 'Add Item' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await items.openAdd();
    for (const f of ['Item code', 'Item name', 'Description']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    for (const f of ['Minimum stock', 'Maximum stock']) await expect(d.getByRole('spinbutton', { name: f })).toBeVisible();
    await expect(d.getByText('Advanced settings')).toBeVisible();
  });

  await qa.step(3, async () => {
    await items.fill(d, { ...it, min: '20', max: '500' });
    await d.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^Item added\.$/)).toBeVisible();
  });

  await qa.step(4, async () => {
    await items.open();
    const row = await items.findRow(it.code);
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('cell').nth(1)).toHaveText(it.name);
    await expect(row.getByRole('cell').nth(2)).toHaveText('—');
    await expect(row.getByRole('cell').nth(3)).toHaveText('—');
    await expect(row.getByRole('cell').nth(4)).toHaveText('Active');
    await expect(row.getByRole('button', { name: `Edit ${it.name}` })).toBeVisible();
  });
};

export const TC_APP007_042 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const f = new StoreFormsPage(page);
  const item = await newItem(page, qa);
  const batch = qa.code('X-B01');
  qa.note(2, `stores "X-ST1"/"X-ST2" cannot be made (found blocker 26); the seed store ${STAND_IN_STORE.code} stands in`);

  await qa.step(1, async () => {
    await f.open('documents', 'Store documents');
    for (const n of ['Store', 'To store', 'Item', 'Batch', 'Expiry', 'Quantity', 'Department', 'Other branch', 'Document']) await expect(f.input(n)).toBeVisible();
    for (const b of ['opening', 'indent', 'issue', 'receipt', 'return', 'transfer', 'inter_branch', 'departmental', 'convert']) await expect(f.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    await f.fill({ Store: STAND_IN_STORE.code, Item: item, Batch: batch, Expiry: addDays(todayWib(), 365), Quantity: '100' });
    expect(await click(f, 'opening')).toContain('Saved.');
    await expect(f.main).toContainText(new RegExp(`opening\\s+posted\\s+${item}`));
  });

  await qa.step(3, async () => {
    const items = new ItemMasterPage(page);
    await items.open();
    const shown = await (await items.openEdit({ code: item })).getByText(batch).count();
    qa.note(3, `the opening batch ${shown ? 'shows' : 'does not show'} under "Stock on hand" (TBD in the workbook)`);
  });
};

export const TC_APP007_045 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const { f, item, batch, toasts } = await opening(page, qa);
  expect(toasts).toContain('Saved.');
  const ids: Record<string, string> = {};
  ids.indent = await indentOrBlock(f, qa, item, [1, 2, 3, 4]);
  qa.note(1, 'the indent is saved before the steps run (step 1 is its check)');

  const doc = async (step: number, kind: string, values: Record<string, string>, line: RegExp) => {
    await qa.step(step, async () => {
      await f.fill(values);
      expect(await click(f, kind)).toContain('Saved.');
      await expect(f.main).toContainText(line);
      ids[kind] = await lastId(f, kind, item);
    });
  };
  await qa.step(1, () => expect(f.main).toContainText(new RegExp(`indent\\s+open\\s+${item}`)));
  await doc(2, 'issue', { Document: ids.indent ?? '', Batch: batch, Quantity: '10' }, new RegExp(`issue\\s+\\w+\\s+${item}`));
  await doc(3, 'receipt', { Document: ids.issue ?? '' }, new RegExp(`receipt\\s+\\w+\\s+${item}`));
  await doc(4, 'return', { Document: ids.receipt ?? '' }, new RegExp(`return\\s+\\w+\\s+${item}`));
  qa.notRun(5, 'the workbook leaves the stock per store TBD; no screen shows stock per store and batch besides Item Master');
};

export const TC_APP007_010 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const stores = new StoresPage(page);
  // The dialog has no accessible name; it is found by its title text.
  const d = page.getByRole('dialog').filter({ hasText: 'Visit types' });
  qa.note(1, `ST-1 cannot be made (found blocker 26); the seed store ${STAND_IN_STORE.code} stands in and is set back to both visit types afterwards`);

  try {
    await qa.step(1, async () => {
      await page.goto('/en/inventory');
      await page.getByRole('main').getByRole('link', { name: 'Stores', exact: true }).click();
      await expect(stores.heading).toBeVisible();
      await expect(stores.main.getByText('Warehouses on this branch.')).toBeVisible();
      await expect(stores.table.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Branch', 'Description', 'Dispense for', 'Status']);
    });

    await qa.step(2, async () => {
      // The button reads the store's visit types ("Outpatient, Inpatient", in either order).
      const button = stores.row(STAND_IN_STORE.code).getByRole('cell').nth(4).getByRole('button');
      await expect(button).toHaveText(/^(Outpatient, Inpatient|Inpatient, Outpatient)$/);
      await button.click();
      await expect(d).toBeVisible();
      await expect(d).toContainText(STAND_IN_STORE.code);
      for (const v of ['Outpatient', 'Inpatient']) await expect(d.getByRole('checkbox', { name: v })).toBeChecked();
    });

    await qa.step(3, async () => {
      await d.getByRole('checkbox', { name: 'Outpatient' }).uncheck();
      await d.getByRole('button', { name: 'Save' }).click();
      await expect(toastLocator(page, /^Visit types saved\.$/)).toBeVisible();
      await expect(stores.row(STAND_IN_STORE.code).getByRole('cell').nth(4).getByRole('button')).toHaveText('Inpatient');
    });

    qa.notRun(4, 'checked in 05 Pharmacy (outpatient dispense store list)');
  } finally {
    // Back to both visit types, whatever the steps left.
    await stores.open();
    await stores.row(STAND_IN_STORE.code).getByRole('cell').nth(4).getByRole('button').click();
    const both = (await d.getByRole('checkbox', { name: 'Outpatient' }).isChecked()) && (await d.getByRole('checkbox', { name: 'Inpatient' }).isChecked());
    if (both) await d.getByRole('button', { name: 'Cancel' }).click();
    else {
      await d.getByRole('checkbox', { name: 'Outpatient' }).check();
      await d.getByRole('checkbox', { name: 'Inpatient' }).check();
      await d.getByRole('button', { name: 'Save' }).click();
      await expect(toastLocator(page, /^Visit types saved\.$/)).toBeVisible();
    }
  }
};

export async function click(f: StoreFormsPage, name: string): Promise<string[]> {
  const mark = await toastMark(f.page);
  await f.button(name).click();
  return toastsAfter(f.page, mark);
}

/** Item "X-ITM1" of this test, made on Item Master. */
export async function newItem(page: Page, qa: Qa): Promise<string> {
  const items = new ItemMasterPage(page);
  const code = qa.code('X-ITM1');
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, { code, name: qa.name('X Barang uji') });
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(d).toBeHidden();
  return code;
}

/** Saves an indent between the two stand-in stores; on HTTP 500 the given steps are blocked (blocker 26) and the test is skipped. */
export async function indentOrBlock(f: StoreFormsPage, qa: Qa, item: string, steps: number[]): Promise<string> {
  await f.fill({ Store: STAND_IN_STORE_2.code, 'To store': STAND_IN_STORE.code, Item: item, Quantity: '10', Document: '' });
  const toasts = await click(f, 'indent');
  if (isServerError(toasts)) {
    for (const s of steps) qa.blocked(s, 26);
    test.skip(true, 'Blocker 26 (found by automation, docs/qa/blockers-found.md): an indent between two stores answers HTTP 500');
  }
  expect(toasts).toContain('Saved.');
  return lastId(f, 'indent', item);
}

// ------------------------------------------------------------ store documents

/** Opening stock of a new item's batch in the first stand-in store; returns item and batch. */
export async function opening(page: Page, qa: Qa) {
  const item = await newItem(page, qa);
  const batch = qa.code('X-B01');
  const f = new StoreFormsPage(page);
  await f.open('documents', 'Store documents');
  await f.fill({ Store: STAND_IN_STORE.code, 'To store': '', Item: item, Batch: batch, Expiry: addDays(todayWib(), 365), Quantity: '100', Department: '', 'Other branch': '', Document: '' });
  const toasts = await click(f, 'opening');
  return { f, item, batch, toasts };
}

/** The id shown on the newest line of a kind ("indent open <item> <id>"). */
export async function lastId(f: StoreFormsPage, kind: string, item: string): Promise<string> {
  const text = await f.main.innerText();
  const m = [...text.matchAll(new RegExp(`${kind}\\s+\\w+\\s+${item}\\s+([0-9a-f-]{36})`, 'g'))].pop();
  if (!m) throw new Error(`No "${kind}" line for ${item}`);
  return m[1];
}

/** An item of the catalogue made unique for this test. */
export function unique(qa: Qa, base: { code: string; name: string }): { code: string; name: string } {
  const t = qa.token();
  return { code: `${base.code}-${t}`, name: `${base.name} ${t}` };
}

export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export const isServerError = (toasts: string[]) => toasts.some((t) => /React error #441/.test(t));
