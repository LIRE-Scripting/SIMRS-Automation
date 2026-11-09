import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince, SERVER_FAILURE } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY, STAND_IN_STORE } from '../../../lib/inventory-data';
import { ItemMasterPage, type Item } from '../../../pages/inventory/InventoryE2EPages';
import { TC_APP007_001, unique } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of items.spec.ts, shared with the end-to-end chains (chain.run). */

export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export async function addItem(page: Page, it: Item): Promise<void> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, it);
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(toastLocator(page, /^Item added\.$/)).toBeVisible();
  await expect(d).toBeHidden();
}

export const storeNote = (qa: Qa, step: number) =>
  qa.note(step, `ST-1 "${INVENTORY.st1.name}" cannot be made (found blocker 26); the seed store ${STAND_IN_STORE.code} "${STAND_IN_STORE.name}" stands in`);

export const TC_APP007_002: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, { ...it, min: '20', max: '500' });
  await items.open();
  let d = items.dialog('Edit Item');

  await qa.step(1, async () => {
    d = await items.openEdit(it);
    await expect(d.getByRole('textbox', { name: 'Item code' })).toHaveValue(it.code);
    await expect(d.getByRole('textbox', { name: 'Item name' })).toHaveValue(it.name);
    await expect(d.getByText('Stock on hand', { exact: true })).toBeVisible();
    await expect(d.getByText('Kit components', { exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await items.fill(d, { description: qa.name('QA Deskripsi baru'), lastCost: '150' });
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toastLocator(page, /^Item updated\.$/)).toBeVisible();
  });

  await qa.step(3, async () => {
    await items.open();
    d = await items.openEdit(it);
    await items.fill(d, { active: false });
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toastLocator(page, /^Item updated\.$/)).toBeVisible();
    await items.open();
    await expect((await items.findRow(it.code)).getByRole('cell').nth(4)).toHaveText('Inactive');
  });
};

export const TC_APP007_003: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const active = unique(qa, INVENTORY.it1);
  const inactive = unique(qa, INVENTORY.it1);
  await addItem(page, active);
  await addItem(page, { ...inactive, active: false });

  await qa.step(1, async () => {
    await items.open();
    await expect(items.table.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Batch', 'Serialized', 'Status', 'Actions']);
    const names = await items.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => r.querySelectorAll('td')[1]?.textContent?.trim() ?? ''));
    const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const byCode = [...names].sort();
    if (sorted.join() !== names.join() && byCode.join() !== names.join()) qa.deviation(1, 'The items in name order', `the order starts ${names.slice(0, 3).join(' | ')}`);
    const total = await items.rows().count();
    if (total >= 50) qa.note(1, `precondition "fewer than 50 items" not met: the first page shows ${total} rows`);
  });

  await qa.step(2, async () => {
    await items.search.fill('para');
    const texts = await items.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => `${r.querySelectorAll('td')[0]?.textContent} ${r.querySelectorAll('td')[1]?.textContent}`.toLowerCase()));
    expect(texts.length).toBeGreaterThan(0);
    for (const x of texts) expect(x).toContain('para');
  });

  await qa.step(3, async () => {
    await items.status.selectOption({ label: 'Inactive' });
    const statuses = await items.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).map((r) => r.querySelectorAll('td')[4]?.textContent?.trim() ?? ''));
    for (const x of statuses) expect(x).toBe('Inactive');
    if (!(await items.row(inactive.code).count())) qa.note(3, 'the new inactive item is not among the rows: the filters narrow only the 50 rows of the page on screen (TC-APP007-019)');
  });

  await qa.step(4, async () => {
    await items.search.fill('');
    await items.status.selectOption({ label: 'All statuses' });
    await items.scan.fill(active.code);
    await items.scan.press('Enter');
    await expect(items.dialog('Edit Item').getByRole('textbox', { name: 'Item code' })).toHaveValue(active.code);
  });
};

/** An item with Batch 1 (and Batch 2) received into the stand-in store. */
export async function itemWithBatches(page: Page, qa: Qa, batches: (typeof INVENTORY)['batch1'][]) {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, { ...it, min: '20', max: '500' });
  await items.open();
  const d = await items.openEdit(it);
  const codes: string[] = [];
  for (const b of batches) {
    const code = `${b.batch}-${qa.token()}`;
    const mark = await toastMark(page);
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch: code, expiry: addDays(todayWib(), b.daysAhead), quantity: b.quantity });
    expect(await toastsAfter(page, mark)).toContain('Batch quantity added.');
    codes.push(code);
  }
  // "Stock on hand" is read after the dialog is opened again.
  await d.getByRole('button', { name: 'Close' }).click();
  await items.open();
  return { it, d: await items.openEdit(it), codes };
}

export const TC_APP007_004: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, it);
  await items.open();
  const d = await items.openEdit(it);
  const b = INVENTORY.batch1;
  const batch = `${b.batch}-${qa.token()}`;
  const expiry = addDays(todayWib(), b.daysAhead);
  storeNote(qa, 2);

  await qa.step(1, async () => {
    await expect(d.getByText('No batches for this item yet.')).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Batch' })).toBeVisible();
    await expect(d.getByRole('spinbutton', { name: 'Quantity' })).toBeVisible();
    await expect(d.locator('input[type="date"]').last()).toBeVisible();
    await expect(d.getByRole('button', { name: 'Add batch' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry, quantity: b.quantity });
    await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Batch' })).toHaveValue('');
    await expect(d.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('');
  });

  await qa.step(3, async () => {
    const line = d.getByText(batch).locator('xpath=ancestor::*[self::li or self::tr or self::div][1]');
    await expect(line).toContainText(b.quantity);
    await expect(line).toContainText(STAND_IN_STORE.code);
    qa.note(3, `line: ${(await line.innerText()).replace(/\s+/g, ' ')} (expiry ${expiry})`);
  });
};

export const TC_APP007_005: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, it);
  await items.open();
  const d = await items.openEdit(it);
  const b = INVENTORY.batch1;
  const batch = `${b.batch}-${qa.token()}`;
  const expiry = addDays(todayWib(), b.daysAhead);
  await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry, quantity: b.quantity });
  await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();

  await qa.step(1, async () => {
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry, quantity: '40' });
    await expect(toastLocator(page, /^Batch quantity added\.$/).last()).toBeVisible();
  });

  await qa.step(2, async () => {
    await expect(d.getByText(batch)).toHaveCount(1);
    await expect(d.getByText(batch).locator('xpath=ancestor::*[self::li or self::tr or self::div][1]')).toContainText(String(Number(b.quantity) + 40));
  });
};

export const TC_APP007_006: QaBody = async ({ page, qa }) => {
  const { d, codes } = await itemWithBatches(page, qa, [INVENTORY.batch1, INVENTORY.batch2]);

  await qa.step(1, async () => {
    const text = (await d.innerText()).replace(/\s+/g, ' ');
    const first = text.indexOf(codes[1]);
    const second = text.indexOf(codes[0]);
    const block = (await d.getByText('Stock on hand', { exact: true }).locator('xpath=..').innerText()).replace(/\s+/g, ' ');
    if (first < 0 || second < 0) {
      qa.deviation(1, 'Two lines, each with store code, batch code, quantity and expiry date', `"Stock on hand" reads: ${block.slice(0, 200)}`);
      return;
    }
    if (first > second) qa.deviation(1, 'Within a store the batch that expires first comes first', 'the batch received first comes first');
  });
};

export const TC_APP007_007: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const kit = unique(qa, INVENTORY.kit);
  const a = unique(qa, INVENTORY.itA);
  const b = unique(qa, INVENTORY.itB);
  for (const it of [kit, a, b]) await addItem(page, it);
  await items.open();
  let d = await items.openEdit(kit);

  await qa.step(1, async () => {
    await expect(d.getByText('Issuing this item consumes each component together. Leave the list empty if it is not a kit.')).toBeVisible();
    await expect(d.getByRole('button', { name: 'Add component' })).toBeVisible();
  });

  const addComponent = async (it: { code: string; name: string }, qty: string) => {
    await d.getByRole('button', { name: 'Add component' }).click();
    const field = d.getByRole('combobox', { name: 'Component code' }).last();
    await field.fill(it.name);
    const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
    await list.getByRole('option').filter({ hasText: it.name }).first().getByRole('button').click();
    await d.getByRole('spinbutton').last().fill(qty);
  };

  let saved: string[] = [];
  await qa.step(2, () => addComponent(a, '1'));

  await qa.step(3, async () => {
    await addComponent(b, '2');
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save kit' }).click();
    saved = await toastsAfter(page, mark);
    if (!saved.some((t) => SERVER_FAILURE.test(t))) expect(saved).toContain('Kit saved.');
  });
  if (saved.some((t) => SERVER_FAILURE.test(t))) {
    qa.blocked(3, 27);
    qa.blocked(4, 27);
    return;
  }

  await qa.step(4, async () => {
    await d.getByRole('button', { name: 'Close' }).click();
    await items.open();
    d = await items.openEdit(kit);
    await expect(d.getByText('Kit components', { exact: true }).locator('xpath=..')).toContainText(a.name);
    await expect(d.getByText('Kit components', { exact: true }).locator('xpath=..')).toContainText(b.name);
  });
};

export const TC_APP007_016: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const existing = unique(qa, INVENTORY.it1);
  await addItem(page, existing);
  await items.open();
  const d = await items.openAdd();
  const save = async () => {
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(page, mark);
  };

  await qa.step(1, async () => {
    await d.getByRole('button', { name: 'Save' }).click();
    expect(await d.getByRole('textbox', { name: 'Item code' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
  });

  for (const [step, values, excel] of [
    [2, { code: existing.code, name: qa.name('QA Nama lain') }, 'Refused: the code is already in use'],
    [3, { code: `${existing.code}-B`, name: qa.name('QA Nama lain'), min: '500', max: '20' }, 'Refused: the minimum is above the maximum'],
    [4, { code: `${existing.code}-C`, name: qa.name('QA Nama lain'), min: '-1' }, 'Refused: the value cannot be negative'],
  ] as const) {
    await qa.step(step, async () => {
      await items.fill(d, { min: '', max: '', ...values });
      const toasts = await save();
      expect(toasts).not.toContain('Item added.');
      if (!toasts.some((t) => /use|exist|minimum|maximum|negative/i.test(t))) qa.deviation(step, excel, `toast "${toasts.join(' / ')}"`);
    });
  }
};

export const TC_APP007_018: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const serialized = unique(qa, INVENTORY.it1);
  const plain = unique(qa, INVENTORY.it1);
  await addItem(page, { ...serialized, serialized: true });
  await addItem(page, { ...plain, batchTracked: false });

  await qa.step(1, async () => {
    await items.open();
    const d = await items.openEdit(serialized);
    const serial = await d.getByRole('textbox', { name: /serial/i }).count();
    if (!serial) qa.deviation(1, 'A serial number is asked for each piece', 'the same batch, expiry and quantity fields as for any item');
    await d.getByRole('button', { name: 'Close' }).click();
  });

  await qa.step(2, async () => {
    await items.open();
    const d = await items.openEdit(plain);
    const required = await d.getByRole('textbox', { name: 'Batch' }).evaluate((e) => (e as HTMLInputElement).required);
    qa.note(2, `"Batch" ${required ? 'is' : 'is not'} marked required for an item that is not batch tracked`);
    await d.getByRole('button', { name: 'Close' }).click();
  });
};

export const TC_APP007_019: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const zinc = { code: qa.code('QA-INV-ZINC'), name: qa.name('QA Zinc 20 mg') };
  await addItem(page, zinc);

  await qa.step(1, async () => {
    await items.open();
    await items.search.fill('zinc');
    if (!(await items.row(zinc.code).count())) qa.deviation(1, 'The item is listed', 'not listed: the search narrows only the rows of the page on screen');
  });

  await qa.step(2, async () => {
    await items.search.fill('');
    await items.status.selectOption({ label: 'Inactive' });
    qa.note(2, `rows shown: ${await items.rows().count()} (the workbook expects every inactive item of the catalogue)`);
  });
};

export const TC_APP007_020: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, it);
  await items.open();
  const d = await items.openEdit(it);
  const tryBatch = async (b: { batch: string; expiry: string; quantity: string }) => {
    const mark = await toastMark(page);
    await items.addBatch(d, { store: STAND_IN_STORE.name, ...b });
    return toastsAfter(page, mark);
  };

  await qa.step(1, async () => {
    expect(await tryBatch({ batch: `QA-B-${qa.token()}`, expiry: '', quantity: '10' })).toContain('Could not update stock.');
  });

  await qa.step(2, async () => {
    for (const q of ['0', '-5']) expect(await tryBatch({ batch: `QA-B-${qa.token()}`, expiry: addDays(todayWib(), 100), quantity: q })).toContain('Could not update stock.');
  });

  await qa.step(3, async () => {
    const toasts = await tryBatch({ batch: `QA-B-${'X'.repeat(70)}`.slice(0, 70), expiry: addDays(todayWib(), 100), quantity: '10' });
    expect(toasts).not.toContain('Batch quantity added.');
    if (!toasts.some((t) => /64|long|limit/i.test(t))) qa.deviation(3, 'Refused with a message that names the limit of 64', `toast "${toasts.join(' / ')}"`);
  });

  qa.blocked(4, 26);
};

export const TC_APP007_021: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, it);
  await items.open();
  const d = await items.openEdit(it);
  const batch = `QA-EXP1-${qa.token()}`;

  await qa.step(1, async () => {
    const mark = await toastMark(page);
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry: todayWib(-1), quantity: '30' });
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Batch quantity added.')) qa.deviation(1, 'Refused: the batch is expired', 'saved (toast "Batch quantity added.")');
  });

  await qa.step(2, async () => {
    if (await d.getByText(batch).count()) qa.deviation(2, 'The batch is not listed', 'the expired batch is listed under "Stock on hand"');
  });
};

export const TC_APP007_022: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const it = unique(qa, INVENTORY.it1);
  await addItem(page, it);
  await items.open();
  const d = await items.openEdit(it);
  const b = INVENTORY.batch2;
  const batch = `${b.batch}-${qa.token()}`;
  await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry: addDays(todayWib(), b.daysAhead), quantity: b.quantity });
  await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();

  await qa.step(1, async () => {
    const mark = await toastMark(page);
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry: addDays(todayWib(), 730), quantity: '1' });
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Batch quantity added.')) qa.deviation(1, 'Refused: this batch is in stock with another expiry date', 'accepted (toast "Batch quantity added.")');
  });

  await qa.step(2, async () => {
    const line = (await d.getByText(batch).locator('xpath=ancestor::*[self::li or self::tr or self::div][1]').innerText()).replace(/\s+/g, ' ');
    if (!line.includes(b.quantity) || line.includes(String(Number(b.quantity) + 1))) {
      qa.deviation(2, `${INVENTORY.batch2.batch}: ${b.quantity}, expiry in ${b.daysAhead} days`, `the line reads "${line}"`);
    }
  });
};

export const TC_APP007_023: QaBody = async ({ page, qa }) => {
  const { d } = await itemWithBatches(page, qa, [INVENTORY.batch1]);
  const controls = async () => (await d.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);

  await qa.step(1, async () => {
    const buttons = await controls();
    if (!buttons.some((b) => /adjust|remove|reduce/i.test(b))) qa.deviation(1, 'An adjustment with quantity and reason', `the dialog offers only: ${buttons.join(', ')}`);
  });
  await qa.step(2, async () => {
    if (!(await controls()).some((b) => /revers|edit receipt|undo/i.test(b))) qa.deviation(2, 'A reversal or an edit of the receipt', 'none on the item');
  });
  await qa.step(3, async () => {
    if (!(await controls()).some((b) => /write|dispos/i.test(b))) qa.deviation(3, 'A disposal with a reason', 'none on the item');
    qa.note(3, 'Stock desk (/inventory/stock-desk) offers "adjustment" and "count" (TC-APP007-052)');
  });
  await qa.step(4, async () => {
    qa.note(4, 'no count sheet per store on Item Master; Stock desk has a "count" document (TC-APP007-052)');
  });
};

export const TC_APP007_029: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const { it, d } = await itemWithBatches(page, qa, [INVENTORY.batch1]);
  qa.notRun(1, 'needs pharmacy dispenses that bring the stock to 15 (05 Pharmacy)');

  await qa.step(2, async () => {
    await d.getByRole('button', { name: 'Close' }).click();
    const links = await page.getByRole('link').allInnerTexts();
    if (!links.some((l) => /reorder|below minimum/i.test(l))) qa.deviation(2, 'A list of items below minimum, with the quantity to order', 'no reorder list in Inventory');
  });

  await qa.step(3, async () => {
    await items.open();
    const e = await items.openEdit(it);
    const mark = await toastMark(page);
    await items.addBatch(e, { store: STAND_IN_STORE.name, batch: `QA-B-${qa.token()}`, expiry: addDays(todayWib(), 300), quantity: '500' });
    const toasts = await toastsAfter(page, mark);
    if (!toasts.some((t) => /maximum/i.test(t))) qa.deviation(3, 'A warning that the maximum is passed', `toast "${toasts.join(' / ')}"`);
  });
};

export const TC_APP007_037: QaBody = async ({ page, qa }) => {
  const items = new ItemMasterPage(page);
  const scripts: string[] = [];
  page.on('dialog', async (d) => {
    scripts.push(d.message());
    await d.dismiss();
  });
  const t = qa.token();
  const it = { code: `QA-INV-XSS-${t}`, name: `<script>alert(1)</script> ${t}` };
  const batch = `<img src=x onerror=alert(1)>${t}`;

  await qa.step(1, async () => {
    await addItem(page, it);
    await items.open();
    const d = await items.openEdit(it);
    await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry: addDays(todayWib(), 100), quantity: '1' });
    await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();
    qa.note(1, 'the stock request with remark "<b>1</b>" is covered in the Stock Requests spec (same text check)');
  });

  await qa.step(2, async () => {
    await items.open();
    await expect((await items.findRow(it.code)).getByRole('cell').nth(1)).toHaveText(it.name);
    const d = await items.openEdit(it);
    await expect(d.getByText(batch)).toBeVisible();
    expect(scripts).toEqual([]);
  });
};
