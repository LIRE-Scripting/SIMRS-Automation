import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { screenOpens } from '../shared/screen-opens';
import { toastsAfter } from '../18-settings/helpers';

/**
 * 22-services.xlsx: category, item, request, purchase request and purchase
 * order. Each screen has one button that opens a dialog (one or two steps)
 * with an "Action" list; actions on a saved document take its internal id
 * (the column "Code") in "Document". Refusals show the toast "Minified React
 * error #441" (HTTP 500): the expected server text is recorded next to it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SAVED = 'Saved.';

const SCREENS = {
  categories: { heading: 'Service category', button: 'Save category' },
  items: { heading: 'Service item', button: 'Save item' },
  requests: { heading: 'Service request', button: 'Create request' },
  'purchase-requests': { heading: 'Service purchase request', button: 'Create purchase request' },
  orders: { heading: 'Service purchase order', button: 'Create order' },
} as const;
type Route = keyof typeof SCREENS;

class Desk {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: Route,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/en/services/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: SCREENS[this.route].heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  /** Opens the dialog, fills fields (on whichever step they are), picks the action and saves; returns the toasts. */
  async save(v: Record<string, string>, action?: string): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: SCREENS[this.route].button }).click();
    const pending = new Map(Object.entries(v));
    for (let step = 0; step < 3; step++) {
      for (const [k, val] of [...pending]) {
        const box = this.dialog.getByRole('textbox', { name: k, exact: true });
        if (await box.isVisible()) {
          await box.fill(val);
          pending.delete(k);
        }
      }
      const next = this.dialog.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible())) break;
      await next.click();
    }
    if (pending.size) throw new Error(`fields not found: ${[...pending.keys()].join(', ')}`);
    if (action) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(this.page, mark);
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The row whose "Detail" starts with a number or code. */
  async row(text: string): Promise<Locator> {
    await this.open();
    const search = this.main.getByRole('textbox', { name: 'Search' }).or(this.main.getByRole('searchbox'));
    if (await search.count()) await search.first().fill(text);
    const r = this.rows().filter({ hasText: text });
    await expect(r.first()).toBeVisible();
    return r.first();
  }
  async status(text: string): Promise<string> {
    return (await (await this.row(text)).getByRole('cell').first().innerText()).trim();
  }
  async id(text: string): Promise<string> {
    return (await (await this.row(text)).getByRole('cell').nth(2).innerText()).trim();
  }
}

const desk = (page: Page, r: Route) => new Desk(page, r);

/** Expects a refusal; records the toast next to the server text the workbook names. */
function refused(qa: Qa, step: number, toasts: string[], serverText: string): void {
  expect(toasts).not.toContain(SAVED);
  qa.note(step, `toast "${toasts.join(' / ').slice(0, 120)}" (the workbook: the server text ends in "${serverText}")`);
}

async function category(page: Page, qa: Qa, parent?: string): Promise<string> {
  const code = qa.code(parent ? 'X-LDR-CUCI' : 'X-LDR');
  expect(await desk(page, 'categories').save({ Code: code, Name: qa.name('X Laundry uji'), ...(parent ? { Parent: parent } : {}) })).toContain(SAVED);
  return code;
}

async function item(page: Page, qa: Qa, cat: string): Promise<string> {
  const code = qa.code('X-CUCI');
  expect(await desk(page, 'items').save({ Code: code, Name: qa.name('X Cuci linen uji'), Parent: cat })).toContain(SAVED);
  return code;
}

qaTest('TC-APP022-001', async ({ page, qa }) => {
  const d = desk(page, 'categories');
  const code = qa.code('X-LDR');
  const child = qa.code('X-LDR-CUCI');
  await qa.step(1, async () => {
    await page.goto('/en/services');
    await page.getByRole('main').getByRole('link', { name: 'Service category' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Service category' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Save category' })).toBeVisible();
    await expect(d.main.getByRole('textbox', { name: 'Search' }).or(d.main.getByRole('searchbox')).first()).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Save category' }).click();
    await expect(d.dialog).toHaveAccessibleName('Service category');
    for (const f of ['Code', 'Name', 'Parent', 'Purchase account', 'Service center']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save category', 'Deactivate', 'Delete category']);
  });
  await qa.step(3, async () => {
    expect(await d.save({ Code: code, Name: qa.name('X Laundry uji') })).toContain(SAVED);
    const c = (await (await d.row(code)).getByRole('cell').allInnerTexts()).map((t) => t.trim());
    expect(c[0]).toBe('active');
    expect(c[1]).toContain(code);
    expect(c[2]).toMatch(/^[0-9a-f-]{36}$/);
  });
  await qa.step(4, async () => {
    expect(await d.save({ Code: child, Name: qa.name('X Cuci laundry uji'), Parent: code })).toContain(SAVED);
  });
  await qa.step(5, async () => {
    await d.save({ Code: child }, 'Deactivate');
    expect(await d.status(child)).not.toBe('active');
  });
  await qa.step(6, async () => {
    await d.save({ Code: child }, 'Delete category');
    await d.open();
    await expect(d.rows().filter({ hasText: child })).toHaveCount(0);
  });
});

qaTest('TC-APP022-002', async ({ page, qa }) => {
  const d = desk(page, 'categories');
  const code = await category(page, qa);
  await category(page, qa, code);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: qa.code('X-LDR'), Name: qa.name('X Laundry uji'), 'Purchase account': '' }), 'code, name, account and center are required'));
  await qa.step(2, async () => {
    const own = qa.code('X-LDR');
    refused(qa, 2, await d.save({ Code: own, Name: qa.name('X Laundry uji'), Parent: own }), 'category cannot parent itself');
  });
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: qa.code('X-LDR'), Name: qa.name('X Laundry uji'), Parent: qa.code('X-TIDAK-ADA') }), 'parent is missing'));
  await qa.step(4, async () => refused(qa, 4, await d.save({ Code: code, Name: qa.name('X Laundry uji') }), 'duplicate'));
  await qa.step(5, async () => refused(qa, 5, await d.save({ Code: code }, 'Delete category'), 'children exist'));
  await qa.step(6, async () => refused(qa, 6, await d.save({ Code: qa.code('X-TIDAK-ADA') }, 'Deactivate'), 'category is missing'));
  await qa.step(7, async () => {
    const toasts = await d.save({ Code: qa.code('X-LDR'), Name: qa.name('X Laundry uji'), 'Purchase account': '9999-QA' });
    qa.note(7, `account "9999-QA": toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-003', async ({ page, qa }) => {
  const d = desk(page, 'items');
  const cat = await category(page, qa);
  const code = qa.code('X-CUCI');
  await qa.step(1, async () => {
    await page.goto('/en/services');
    await page.getByRole('main').getByRole('link', { name: 'Service item' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Service item' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Save item' })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Save item' }).click();
    await expect(d.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/^1\s*Details$/, /^2\s*Review$/]);
    for (const f of ['Code', 'Name', 'Parent', 'Purchase account']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('button', { name: 'Back' })).toBeDisabled();
  });
  await qa.step(3, async () => {
    await d.dialog.getByRole('button', { name: 'Next' }).click();
    for (const f of ['Stock account', 'Sales account', 'Service center']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  });
  await qa.step(4, async () => {
    expect(await d.save({ Code: code, Name: qa.name('X Cuci linen uji'), Parent: cat })).toContain(SAVED);
    const detail = (await (await d.row(code)).getByRole('cell').nth(1).innerText()).trim();
    expect(detail).toContain(code);
    expect(detail).toContain(cat);
  });
});

qaTest('TC-APP022-004', async ({ page, qa }) => {
  const d = desk(page, 'items');
  const cat = await category(page, qa);
  const code = await item(page, qa, cat);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: qa.code('X-CUCI'), Name: qa.name('X Cuci linen uji'), Parent: cat, 'Sales account': '' }), 'accounts are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: qa.code('X-CUCI'), Name: qa.name('X Cuci linen uji') }), 'category is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: code, Name: qa.name('X Cuci linen uji'), Parent: cat }), 'duplicate'));
  await qa.step(4, async () => {
    await d.open();
    await d.main.getByRole('button', { name: 'Save item' }).click();
    await d.dialog.getByRole('button', { name: 'Next' }).click();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' })).toHaveCount(0);
  });
});

/** A request of the test, saved as a draft; returns its number. */
async function request(page: Page, qa: Qa, itemCode: string, cat: string): Promise<string> {
  const no = qa.code('X-SR-001');
  expect(await desk(page, 'requests').save({ Number: no, Parent: cat, Item: itemCode, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen') })).toContain(SAVED);
  return no;
}

async function act(page: Page, route: Route, no: string, action: string): Promise<string[]> {
  const d = desk(page, route);
  return d.save({ Document: await d.id(no) }, action);
}

qaTest('TC-APP022-005', async ({ page, qa }) => {
  const d = desk(page, 'requests');
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/en/services');
    await page.getByRole('main').getByRole('link', { name: 'Service request' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Service request' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Create request' })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Create request' }).click();
    await expect(d.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveCount(2);
    for (const f of ['Number', 'Parent', 'Item', 'Service center']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  await qa.step(3, async () => {
    no = await request(page, qa, it, cat);
    expect(await d.status(no)).toBe('draft');
  });
  await qa.step(4, async () => {
    expect(await act(page, 'requests', no, 'Send request')).toContain(SAVED);
    expect(await d.status(no)).toBe('sent');
  });
  await qa.step(5, async () => {
    expect(await act(page, 'requests', no, 'Approve request')).toContain(SAVED);
    expect(await d.status(no)).toBe('approved');
  });
  await qa.step(6, async () => {
    expect(await act(page, 'requests', no, 'Partial')).toContain(SAVED);
    expect(await d.status(no)).toBe('partial');
    const second = await request(page, qa, it, cat);
    for (const a of ['Send request', 'Approve request', 'Complete']) expect(await act(page, 'requests', second, a), a).toContain(SAVED);
    expect(await d.status(second)).toBe('completed');
  });
});

qaTest('TC-APP022-006', async ({ page, qa }) => {
  const d = desk(page, 'requests');
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  const fields = (extra: Record<string, string>) => ({ Number: qa.code('X-SR-001'), Parent: cat, Item: it, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen'), ...extra });
  await qa.step(1, async () => refused(qa, 1, await d.save(fields({ Department: '' })), 'number, category, item, center and department are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save(fields({ Item: 'CUCI' })), 'item is missing'));
  const draft = await request(page, qa, it, cat);
  await qa.step(3, async () => refused(qa, 3, await act(page, 'requests', draft, 'Approve request'), 'send the request first'));
  await qa.step(4, async () => {
    expect(await act(page, 'requests', draft, 'Send request')).toContain(SAVED);
    refused(qa, 4, await act(page, 'requests', draft, 'Complete'), 'complete only from approved');
  });
  await qa.step(5, async () => {
    refused(qa, 5, await d.save({ Document: '' }, 'Send request'), 'document is missing');
    refused(qa, 5, await d.save({ Document: draft }, 'Send request'), 'document is missing');
  });
});

qaTest('TC-APP022-007', async ({ page, qa }) => {
  const d = desk(page, 'requests');
  const cat = await category(page, qa);
  const it = await item(page, qa, cat);
  await qa.step(1, async () => {
    const no = await request(page, qa, it, cat);
    expect(await act(page, 'requests', no, 'Send request')).toContain(SAVED);
    expect(await act(page, 'requests', no, 'Reject request')).toContain(SAVED);
    expect(await d.status(no)).toBe('rejected');
  });
  await qa.step(2, async () => {
    const no = await request(page, qa, it, cat);
    for (const a of ['Send request', 'Approve request', 'Cancel request']) expect(await act(page, 'requests', no, a), a).toContain(SAVED);
    expect(await d.status(no)).toBe('cancelled');
  });
  await qa.step(3, async () => {
    const no = await request(page, qa, it, cat);
    for (const a of ['Send request', 'Approve request', 'Partial']) expect(await act(page, 'requests', no, a), a).toContain(SAVED);
    refused(qa, 3, await act(page, 'requests', no, 'Complete'), 'complete only from approved');
  });
  await qa.step(4, async () => {
    const no = await request(page, qa, it, cat);
    expect(await act(page, 'requests', no, 'Send request')).toContain(SAVED);
    const toasts = await act(page, 'requests', no, 'Approve request');
    qa.note(4, `the creator approves the own request: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-008', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

async function purchaseRequest(page: Page, qa: Qa, it: string): Promise<string> {
  const d = desk(page, 'purchase-requests');
  await d.open();
  const before = new Set(await d.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[2]?.textContent?.trim() ?? '')));
  expect(await d.save({ Item: it, Store: 'CSSD', Quantity: '2' })).toContain(SAVED);
  await d.open();
  await d.main.getByRole('textbox', { name: 'Search' }).or(d.main.getByRole('searchbox')).first().fill(it);
  const ids = await d.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[2]?.textContent?.trim() ?? ''));
  const id = ids.find((x) => x && !before.has(x));
  expect(id, 'the new purchase request').toBeTruthy();
  return id!;
}

const prStatus = async (page: Page, id: string) => desk(page, 'purchase-requests').status(id);

qaTest('TC-APP022-009', async ({ page, qa }) => {
  const d = desk(page, 'purchase-requests');
  const it = await item(page, qa, await category(page, qa));
  let id = '';
  await qa.step(1, async () => {
    await page.goto('/en/services');
    await page.getByRole('main').getByRole('link', { name: 'Service purchase request' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Service purchase request' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Create purchase request' })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Create purchase request' }).click();
    for (const f of ['Item', 'Store', 'Quantity', 'Document']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Create purchase request', 'Send purchase request', 'Approve purchase request', 'Reject purchase request']);
  });
  await qa.step(3, async () => {
    id = await purchaseRequest(page, qa, it);
    expect(await prStatus(page, id)).toBe('draft');
  });
  await qa.step(4, async () => {
    expect(await d.save({ Document: id }, 'Send purchase request')).toContain(SAVED);
    expect(await prStatus(page, id)).toBe('sent');
  });
  await qa.step(5, async () => {
    expect(await d.save({ Document: id }, 'Approve purchase request')).toContain(SAVED);
    expect(await prStatus(page, id)).toBe('approved');
  });
});

qaTest('TC-APP022-010', async ({ page, qa }) => {
  const d = desk(page, 'purchase-requests');
  const it = await item(page, qa, await category(page, qa));
  await qa.step(1, async () => refused(qa, 1, await d.save({ Item: it, Store: 'CSSD', Quantity: '0' }), 'item, store and quantity are required'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Item: qa.code('X-TIDAK-ADA'), Store: 'CSSD', Quantity: '2' }), 'item is missing'));
  await qa.step(3, async () => {
    const id = await purchaseRequest(page, qa, it);
    refused(qa, 3, await d.save({ Document: id }, 'Approve purchase request'), 'send the request first');
  });
  await qa.step(4, async () => {
    const toasts = await d.save({ Item: it, Store: qa.prefix('X Gudang tidak ada'), Quantity: '2' });
    qa.note(4, `a store that is not in Inventory: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-011', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

async function approvedPr(page: Page, qa: Qa, it: string): Promise<string> {
  const id = await purchaseRequest(page, qa, it);
  const d = desk(page, 'purchase-requests');
  for (const a of ['Send purchase request', 'Approve purchase request']) expect(await d.save({ Document: id }, a), a).toContain(SAVED);
  return id;
}

const ORDER = (qa: Qa, it: string, pr: string, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-SPO-001'),
  Name: qa.prefix('X Vendor laundry'),
  Tax: 'PPN 11%',
  Terms: '30 hari',
  Item: it,
  Quantity: '2',
  Rate: '150000',
  Document: pr,
  ...extra,
});

qaTest('TC-APP022-012', async ({ page, qa }) => {
  const d = desk(page, 'orders');
  const it = await item(page, qa, await category(page, qa));
  const pr = await approvedPr(page, qa, it);
  const v = ORDER(qa, it, pr);
  await qa.step(1, async () => {
    await page.goto('/en/services');
    await page.getByRole('main').getByRole('link', { name: 'Service purchase order' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Service purchase order' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Create order' })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Create order' }).click();
    for (const f of ['Number', 'Name', 'Tax', 'Terms']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('button', { name: 'Next' })).toBeVisible();
  });
  await qa.step(3, async () => {
    expect(await d.save(v)).toContain(SAVED);
    expect(await d.status(v.Number)).toBe('draft');
  });
  await qa.step(4, async () => {
    expect(await act(page, 'orders', v.Number, 'Send order')).toContain(SAVED);
    expect(await d.status(v.Number)).toBe('sent');
    expect(await act(page, 'orders', v.Number, 'Approve order')).toContain(SAVED);
    expect(await d.status(v.Number)).toBe('approved');
  });
  await qa.step(5, async () => {
    const amended = qa.code('X-SPO-001');
    const toasts = await d.save({ Number: amended, Document: await d.id(v.Number) }, 'Amend');
    await d.open();
    const rows = (await d.rows().allInnerTexts()).filter((t) => t.includes(v.Number) || t.includes(amended)).map((t) => t.replace(/\s+/g, ' '));
    qa.note(5, `"Amend": "${toasts.join(' / ')}"; rows: ${rows.join(' ; ')}`);
  });
});

qaTest('TC-APP022-013', async ({ page, qa }) => {
  const d = desk(page, 'orders');
  const it = await item(page, qa, await category(page, qa));
  const pr = await approvedPr(page, qa, it);
  await qa.step(1, async () => {
    const sent = await purchaseRequest(page, qa, it);
    expect(await desk(page, 'purchase-requests').save({ Document: sent }, 'Send purchase request')).toContain(SAVED);
    refused(qa, 1, await d.save(ORDER(qa, it, sent)), 'approve the request first');
  });
  await qa.step(2, async () => refused(qa, 2, await d.save(ORDER(qa, it, '')), 'document is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save(ORDER(qa, it, pr, { Terms: '' })), 'vendor, tax, terms, item, quantity and rate are required'));
  const draft = ORDER(qa, it, pr);
  expect(await d.save(draft)).toContain(SAVED);
  await qa.step(4, async () => {
    const approved = ORDER(qa, it, pr);
    expect(await d.save(approved)).toContain(SAVED);
    for (const a of ['Send order', 'Approve order']) expect(await act(page, 'orders', approved.Number, a), a).toContain(SAVED);
    refused(qa, 4, await d.save({ Number: '', Document: await d.id(approved.Number) }, 'Amend'), 'a new number is required');
  });
  await qa.step(5, async () => refused(qa, 5, await d.save({ Number: qa.code('X-SPO-001'), Document: await d.id(draft.Number) }, 'Amend'), 'approve the order first'));
  await qa.step(6, async () => {
    const toasts = await d.save(ORDER(qa, it, pr, { Rate: '0' }));
    qa.note(6, `rate 0: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP022-014', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

const ROUTES: [string, string, string][] = [
  ['TC-APP022-023', '/services', 'Services'],
  ['TC-APP022-024', '/services/bills', 'Vendor bill'],
  ['TC-APP022-025', '/services/categories', 'Service category'],
  ['TC-APP022-026', '/services/items', 'Service item'],
  ['TC-APP022-027', '/services/orders', 'Service purchase order'],
  ['TC-APP022-028', '/services/purchase-requests', 'Service purchase request'],
  ['TC-APP022-029', '/services/receipts', 'Service receipt'],
  ['TC-APP022-030', '/services/requests', 'Service request'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
