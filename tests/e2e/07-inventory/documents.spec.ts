import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { STAND_IN_STORE, STAND_IN_STORE_2 } from '../../../lib/inventory-data';
import { ItemMasterPage, StoreFormsPage } from '../../../pages/inventory/InventoryE2EPages';

/**
 * 07-inventory.xlsx, features "Branch and stores (/inventory/setup)", "Store
 * documents (/inventory/documents)", "Stock desk (/inventory/stock-desk)" and
 * "Stock book (/inventory/ledger)". The workbook's stores "X-ST1"/"X-ST2"
 * would be made on Branch and stores, which answers HTTP 500 (found blocker
 * 26): two seed stores of BR-A stand in (Q22). Item "X-ITM1" is made per run
 * as "QA-ITM1-<token>" on Item Master.
 */

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

async function click(f: StoreFormsPage, name: string): Promise<string[]> {
  const mark = await toastMark(f.page);
  await f.button(name).click();
  return toastsAfter(f.page, mark);
}

/** Item "X-ITM1" of this test, made on Item Master. */
async function newItem(page: Page, qa: Qa): Promise<string> {
  const items = new ItemMasterPage(page);
  const code = qa.code('X-ITM1');
  await items.open();
  const d = await items.openAdd();
  await items.fill(d, { code, name: qa.name('X Barang uji') });
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(d).toBeHidden();
  return code;
}

const isServerError = (toasts: string[]) => toasts.some((t) => /React error #441/.test(t));

/** Saves an indent between the two stand-in stores; on HTTP 500 the given steps are blocked (blocker 26) and the test is skipped. */
async function indentOrBlock(f: StoreFormsPage, qa: Qa, item: string, steps: number[]): Promise<string> {
  await f.fill({ Store: STAND_IN_STORE_2.code, 'To store': STAND_IN_STORE.code, Item: item, Quantity: '10', Document: '' });
  const toasts = await click(f, 'indent');
  if (isServerError(toasts)) {
    for (const s of steps) qa.blocked(s, 26);
    test.skip(true, 'Blocker 26 (found by automation, docs/qa/blockers-found.md): an indent between two stores answers HTTP 500');
  }
  expect(toasts).toContain('Saved.');
  return lastId(f, 'indent', item);
}

// --------------------------------------------------------- branch and stores

qaTest('TC-APP007-039', async ({ page, qa }) => {
  const f = new StoreFormsPage(page);

  await qa.step(1, async () => {
    await page.goto('/en/inventory');
    await page.goto('/en/inventory/setup');
    await expect(f.main.getByRole('heading', { level: 1, name: 'Branch and stores' })).toBeVisible();
    for (const n of ['Code', 'Name', 'Parent category', 'Store', 'From store', 'To store']) await expect(f.input(n)).toBeVisible();
    await expect(f.main.getByRole('button', { name: 'Save' })).toHaveCount(3);
    qa.note(1, 'the hub has no link "Branch and stores"; the screen is opened by its address');
  });

  const saveForm = async (step: number, values: Record<string, string>, index: number) => {
    await f.fill(values);
    const mark = await toastMark(page);
    await f.main.getByRole('button', { name: 'Save' }).nth(index).click();
    const toasts = await toastsAfter(page, mark);
    if (isServerError(toasts)) return qa.blocked(step, 26);
    await qa.step(step, async () => {
      expect(toasts).toContain('Saved.');
    });
  };
  await saveForm(2, { Code: qa.code('X-CAT1'), Name: qa.name('X Obat uji') }, 0);
  await saveForm(3, { Store: qa.code('X-ST1') }, 1);
  await saveForm(4, { 'From store': qa.code('X-ST1'), 'To store': qa.code('X-ST2') }, 2);
});

qaTest('TC-APP007-040', async ({ page, qa }) => {
  const f = new StoreFormsPage(page);
  await f.open('setup', 'Branch and stores');
  for (const [step, values] of [
    [1, { Code: '', Name: qa.name('X Obat uji') }],
    [2, { Code: 'QA-SELF', Name: qa.name('X Obat uji'), 'Parent category': 'QA-SELF' }],
  ] as const) {
    await f.fill(values);
    const mark = await toastMark(page);
    await f.main.getByRole('button', { name: 'Save' }).first().click();
    const toasts = await toastsAfter(page, mark);
    if (isServerError(toasts)) qa.blocked(step, 26);
    else
      await qa.step(step, async () => {
        expect(toasts).not.toContain('Saved.');
      });
  }
});

qaTest('TC-APP007-041', async ({ page, qa }) => {
  const f = new StoreFormsPage(page);
  await f.open('setup', 'Branch and stores');
  await f.fill({ 'From store': STAND_IN_STORE.code, 'To store': STAND_IN_STORE.code });
  const mark = await toastMark(page);
  await f.main.getByRole('button', { name: 'Save' }).nth(2).click();
  const toasts = await toastsAfter(page, mark);
  if (isServerError(toasts)) qa.blocked(1, 26);
  else
    await qa.step(1, async () => {
      expect(toasts).not.toContain('Saved.');
    });
});

// ------------------------------------------------------------ store documents

/** Opening stock of a new item's batch in the first stand-in store; returns item and batch. */
async function opening(page: Page, qa: Qa) {
  const item = await newItem(page, qa);
  const batch = qa.code('X-B01');
  const f = new StoreFormsPage(page);
  await f.open('documents', 'Store documents');
  await f.fill({ Store: STAND_IN_STORE.code, 'To store': '', Item: item, Batch: batch, Expiry: addDays(todayWib(), 365), Quantity: '100', Department: '', 'Other branch': '', Document: '' });
  const toasts = await click(f, 'opening');
  return { f, item, batch, toasts };
}

/** The id shown on the newest line of a kind ("indent open <item> <id>"). */
async function lastId(f: StoreFormsPage, kind: string, item: string): Promise<string> {
  const text = await f.main.innerText();
  const m = [...text.matchAll(new RegExp(`${kind}\\s+\\w+\\s+${item}\\s+([0-9a-f-]{36})`, 'g'))].pop();
  if (!m) throw new Error(`No "${kind}" line for ${item}`);
  return m[1];
}

qaTest('TC-APP007-042', async ({ page, qa }) => {
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
});

qaTest('TC-APP007-043', async ({ page, qa }) => {
  const f = new StoreFormsPage(page);
  const item = await newItem(page, qa);
  await f.open('documents', 'Store documents');

  await qa.step(1, async () => {
    await f.fill({ Store: STAND_IN_STORE.code, Item: item, Batch: qa.code('X-B01'), Expiry: '', Quantity: '100' });
    const toasts = await click(f, 'opening');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `refusal: "${toasts.join(' / ')}"`);
  });

  await qa.step(2, async () => {
    await f.fill({ Expiry: addDays(todayWib(), 365), Quantity: '0' });
    expect(await click(f, 'opening')).not.toContain('Saved.');
  });
});

qaTest('TC-APP007-044', async ({ browser, qa }) => {
  // "All branches" in the header: U1 works on one branch only, so the step runs as U2.
  const context = await browser.newContext({ storageState: authFileOf('U2') });
  const page = await context.newPage();
  await installToastRecorder(page);
  const f = new StoreFormsPage(page);
  qa.note(1, 'run as U2 (rs.admin, "All branches")');

  await qa.step(1, async () => {
    await f.open('documents', 'Store documents');
    await f.fill({ Store: STAND_IN_STORE.code, Item: 'QA-NONE', Batch: qa.code('X-B01'), Expiry: addDays(todayWib(), 365), Quantity: '100' });
    const toasts = await click(f, 'opening');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `answer: "${toasts.join(' / ')}"`);
  });
  await context.close();
});

qaTest('TC-APP007-045', async ({ page, qa }) => {
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
});

qaTest('TC-APP007-046', async ({ page, qa }) => {
  const { f, item, batch } = await opening(page, qa);
  const indent = await indentOrBlock(f, qa, item, [1, 2]);

  await qa.step(1, async () => {
    await f.fill({ Document: '00000000-0000-0000-0000-000000000000', Batch: batch, Quantity: '10' });
    expect(await click(f, 'issue')).not.toContain('Saved.');
  });

  await qa.step(2, async () => {
    await f.fill({ Document: indent, Batch: batch, Quantity: '11' });
    const toasts = await click(f, 'issue');
    if (toasts.includes('Saved.')) qa.deviation(2, 'Refused: more than the indent asks for', 'issued 11 against an indent of 10');
  });
});

qaTest('TC-APP007-047', async ({ page, qa }) => {
  const { f, item, batch } = await opening(page, qa);
  const indent = await indentOrBlock(f, qa, item, [1, 2]);

  await qa.step(1, async () => {
    await f.fill({ Document: indent });
    expect(await click(f, 'receipt')).not.toContain('Saved.');
  });

  await qa.step(2, async () => {
    await f.fill({ Document: indent, Batch: batch, Quantity: '10' });
    expect(await click(f, 'issue')).toContain('Saved.');
    const issue = await lastId(f, 'issue', item);
    await f.fill({ Document: issue });
    expect(await click(f, 'return')).not.toContain('Saved.');
  });
});

qaTest('TC-APP007-048', async ({ page, qa }) => {
  const item = await newItem(page, qa);
  const f = new StoreFormsPage(page);
  await f.open('documents', 'Store documents');

  await qa.step(1, async () => {
    await f.fill({ Store: STAND_IN_STORE_2.code, 'To store': STAND_IN_STORE.code, Item: item, Quantity: '5', Department: 'X Poli Umum', 'Other branch': '', Document: '' });
    const toasts = await click(f, 'departmental');
    if (isServerError(toasts)) return qa.blocked(1, 26);
    qa.note(1, `department "X Poli Umum" is typed as the workbook gives it`);
    expect(toasts).toContain('Saved.');
  });

  await qa.step(2, async () => {
    await f.fill({ Department: '', 'Other branch': 'BR02' });
    const toasts = await click(f, 'inter_branch');
    if (isServerError(toasts)) return qa.blocked(2, 26);
    qa.note(2, 'other branch code BR02, Daan Mogot');
    expect(toasts).toContain('Saved.');
  });

  qa.notRun(3, 'needs a user at the other branch (U6, not prepared)');
});

qaTest('TC-APP007-049', async ({ page, qa }) => {
  const item = await newItem(page, qa);
  const f = new StoreFormsPage(page);
  await f.open('documents', 'Store documents');
  await f.fill({ Store: STAND_IN_STORE_2.code, 'To store': STAND_IN_STORE.code, Item: item, Quantity: '5', Department: '', 'Other branch': '', Document: '' });

  await qa.step(1, async () => {
    expect(await click(f, 'departmental')).not.toContain('Saved.');
  });
  await qa.step(2, async () => {
    expect(await click(f, 'inter_branch')).not.toContain('Saved.');
  });
});

qaTest('TC-APP007-050', async ({ page, qa }) => {
  const { f, item } = await opening(page, qa);
  const indent = await indentOrBlock(f, qa, item, [1]);
  qa.notRun(2, 'checked in 09 Procurement (where the purchase request appears is TBD in the workbook)');

  await qa.step(1, async () => {
    await f.fill({ Document: indent });
    expect(await click(f, 'convert')).toContain('Saved.');
    qa.note(1, `lines of the item: ${((await f.main.innerText()).match(new RegExp(`\\w+\\s+\\w+\\s+${item}`, 'g')) ?? []).join(' | ')}`);
  });
});

qaTest('TC-APP007-051', async ({ page, qa }) => {
  const f = new StoreFormsPage(page);
  await f.open('documents', 'Store documents');
  await qa.step(1, async () => {
    await f.fill({ Document: '' });
    expect(await click(f, 'convert')).not.toContain('Saved.');
  });
});

// ---------------------------------------------------------------- stock desk

qaTest('TC-APP007-052', async ({ page, qa }) => {
  const { item, batch } = await opening(page, qa);
  const f = new StoreFormsPage(page);

  await qa.step(1, async () => {
    await f.open('stock-desk', 'Stock desk');
    await expect(f.main.getByText('Schedulers wait. They are not running.')).toBeVisible();
    for (const n of ['Store', 'Item', 'Batch', 'Quantity', 'Counted', 'Reason', 'New batch', 'Expiry']) await expect(f.input(n)).toBeVisible();
    for (const b of ['consumption', 'count', 'adjustment', 'correction']) await expect(f.button(b)).toBeVisible();
  });

  const desk = async (step: number, kind: string, values: Record<string, string>) => {
    await qa.step(step, async () => {
      await f.fill(values);
      const toasts = await click(f, kind);
      expect(toasts).toContain('Saved.');
      await expect(f.main).toContainText(new RegExp(`${kind}\\s+posted`));
    });
  };
  await desk(2, 'consumption', { Store: STAND_IN_STORE.code, Item: item, Batch: batch, Quantity: '2', Counted: '', Reason: '', 'New batch': '', Expiry: '' });
  await desk(3, 'count', { Counted: '95' });
  await desk(4, 'adjustment', { Quantity: '2', Reason: qa.name('X pecah saat bongkar') });
  await desk(5, 'correction', { 'New batch': qa.code('X-B01A'), Expiry: addDays(todayWib(), 365) });
});

qaTest('TC-APP007-053', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/en/inventory');
    await page.getByRole('main').getByRole('link', { name: 'Stock book', exact: true }).click();
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Stock book' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Receipts, transfers, returns, and counts are appended per batch. A Fornas receipt lands in the shared warehouse. Selling prices stay on the price list.')).toBeVisible();
  });
});
