import { toastsAfter } from '../18-settings/helpers';
import { toastMark } from '../../../lib/assertions';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../../../fixtures/e2e';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 22-services that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP022_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP022_003 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP022_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP022_009 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const TC_APP022_012 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

export const SAVED = 'Saved.';

export const desk = (page: Page, r: Route) => new Desk(page, r);

export async function category(page: Page, qa: Qa, parent?: string): Promise<string> {
  const code = qa.code(parent ? 'X-LDR-CUCI' : 'X-LDR');
  expect(await desk(page, 'categories').save({ Code: code, Name: qa.name('X Laundry uji'), ...(parent ? { Parent: parent } : {}) })).toContain(SAVED);
  return code;
}

export async function item(page: Page, qa: Qa, cat: string): Promise<string> {
  const code = qa.code('X-CUCI');
  expect(await desk(page, 'items').save({ Code: code, Name: qa.name('X Cuci linen uji'), Parent: cat })).toContain(SAVED);
  return code;
}

/** A request of the test, saved as a draft; returns its number. */
export async function request(page: Page, qa: Qa, itemCode: string, cat: string): Promise<string> {
  const no = qa.code('X-SR-001');
  expect(await desk(page, 'requests').save({ Number: no, Parent: cat, Item: itemCode, Department: qa.prefix('X Bangsal uji'), Description: qa.prefix('X cuci linen') })).toContain(SAVED);
  return no;
}

export async function act(page: Page, route: Route, no: string, action: string): Promise<string[]> {
  const d = desk(page, route);
  return d.save({ Document: await d.id(no) }, action);
}

export async function purchaseRequest(page: Page, qa: Qa, it: string): Promise<string> {
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

export const prStatus = async (page: Page, id: string) => desk(page, 'purchase-requests').status(id);

export async function approvedPr(page: Page, qa: Qa, it: string): Promise<string> {
  const id = await purchaseRequest(page, qa, it);
  const d = desk(page, 'purchase-requests');
  for (const a of ['Send purchase request', 'Approve purchase request']) expect(await d.save({ Document: id }, a), a).toContain(SAVED);
  return id;
}

export const ORDER = (qa: Qa, it: string, pr: string, extra: Record<string, string> = {}) => ({
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

export type Route = keyof typeof SCREENS;

export class Desk {
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

export const SCREENS = {
  categories: { heading: 'Service category', button: 'Save category' },
  items: { heading: 'Service item', button: 'Save item' },
  requests: { heading: 'Service request', button: 'Create request' },
  'purchase-requests': { heading: 'Service purchase request', button: 'Create purchase request' },
  orders: { heading: 'Service purchase order', button: 'Create order' },
} as const;
