import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { screenOpens } from '../shared/screen-opens';
import { toastsAfter } from '../18-settings/helpers';
import { TC_APP023_020 } from './cases';

/**
 * 23-sourcing.xlsx: masters, tenders, bids, agreements and deposits. Every
 * screen has one button that opens a dialog (one or two steps) with an
 * "Action" list; actions on a saved row take its internal id (column
 * "Code") in "Document". The approved purchase request a tender starts from
 * is an approved row of Procurement (/procurement/requests, made by 09). A
 * bid can be accepted only after the close date, so the tenders of those
 * tests close yesterday (a typed date in the past is accepted, TC-APP023-006
 * step 8). Refusals show "Minified React error #441"; the server text of the
 * workbook is recorded next to it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SAVED = 'Saved.';

const SCREENS = {
  masters: { heading: 'Masters', button: 'Category' },
  tenders: { heading: 'Tenders', button: 'Create tender' },
  bids: { heading: 'Bids', button: 'Bid' },
  agreements: { heading: 'Agreements', button: 'Agreement' },
  money: { heading: 'Deposits', button: 'Fee' },
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
    await this.page.goto(`/en/sourcing/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: SCREENS[this.route].heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async openDialog(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: SCREENS[this.route].button, exact: true }).click();
    await expect(this.dialog).toBeVisible();
  }
  /** Fills fields on whichever step they are, picks the action, saves; returns the toasts. */
  async save(v: Record<string, string>, action?: string): Promise<string[]> {
    await this.openDialog();
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
  /** The rows, as [status, detail, id]. */
  async list(search?: string): Promise<string[][]> {
    await this.open();
    if (search) {
      await this.main.getByRole('textbox', { name: 'Search' }).or(this.main.getByRole('searchbox')).first().fill(search);
      await expect(this.rows().filter({ hasText: search }).first()).toBeVisible().catch(() => {});
    }
    return this.rows().evaluateAll((rs) =>
      rs.filter((r) => r.querySelectorAll('td').length >= 3).map((r) => Array.from(r.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.trim() ?? '')),
    );
  }
  /** Saves and returns the id of the row that is new afterwards. */
  async create(v: Record<string, string>, action?: string): Promise<{ toasts: string[]; id: string }> {
    const before = new Set((await this.list()).map((r) => r[2]));
    const toasts = await this.save(v, action);
    const after = await this.list();
    return { toasts, id: after.find((r) => r[2] && !before.has(r[2]))?.[2] ?? '' };
  }
  async status(id: string): Promise<string> {
    return (await this.list()).find((r) => r[2] === id)?.[0] ?? '';
  }
}

const desk = (page: Page, r: Route) => new Desk(page, r);

function refused(qa: Qa, step: number, toasts: string[], serverText: string): void {
  expect(toasts).not.toContain(SAVED);
  qa.note(step, `toast "${toasts.join(' / ').slice(0, 120)}" (the workbook: the server text ends in "${serverText}")`);
}

async function master(page: Page, qa: Qa, kind: 'Category' | 'Checklist' | 'Bidder', base: string, name: string): Promise<string> {
  const code = qa.code(base);
  expect(await desk(page, 'masters').save({ Code: code, Name: qa.name(name) }, kind)).toContain(SAVED);
  return code;
}

/** The id of an approved request of Procurement (made by 09). */
async function approvedRequest(page: Page): Promise<string> {
  await page.goto('/en/procurement/requests');
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.getByRole('main').innerText();
  const id = text.match(/approved \S+ ([0-9a-f-]{36})/)?.[1];
  expect(id, 'an approved row on /procurement/requests').toBeTruthy();
  return id!;
}


const WEEK = () => addDays(todayWib(), 7);

qaTest('TC-APP023-001', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const cat = qa.code('X-ALKES');
  const bidder = qa.code('X-BDR1');
  await qa.step(1, async () => {
    await page.goto('/en/sourcing');
    await page.getByRole('main').getByRole('link', { name: 'Masters' }).click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Masters' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Category', exact: true })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Category', exact: true }).click();
    await expect(d.dialog).toHaveAccessibleName('Masters');
    for (const f of ['Code', 'Name', 'Note', 'Amount']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Category', 'Checklist', 'Bidder', 'Convert to vendor']);
  });
  await qa.step(3, async () => {
    expect(await d.save({ Code: cat, Name: qa.name('X Alkes uji') })).toContain(SAVED);
    expect((await d.list(cat)).some((r) => r[1].includes(cat))).toBe(true);
  });
  await qa.step(4, async () => {
    const ck = qa.code('X-CK1');
    expect(await d.save({ Code: ck, Name: qa.name('X NPWP terlampir') }, 'Checklist')).toContain(SAVED);
    qa.note(4, `the checklist is ${(await d.list(ck)).some((r) => r[1].includes(ck)) ? '' : 'not '}listed on the screen`);
  });
  await qa.step(5, async () => {
    expect(await d.save({ Code: bidder, Name: qa.name('X PT Penawar Uji') }, 'Bidder')).toContain(SAVED);
    expect((await d.list(bidder)).some((r) => r[1].includes(bidder))).toBe(true);
  });
  await qa.step(6, async () => {
    const rows = await d.list();
    const mine = rows.filter((r) => r[1].includes(cat) || r[1].includes(bidder)).map((r) => `${r[0]} ${r[1]}`);
    qa.note(6, `one list: ${mine.join(' ; ')}`);
  });
});

qaTest('TC-APP023-002', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const cat = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  await qa.step(1, async () => {
    for (const kind of ['Category', 'Checklist', 'Bidder']) refused(qa, 1, await d.save({ Code: qa.code('X-ALKES'), Name: '' }, kind), 'code and name are required');
  });
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: cat, Name: qa.name('X Alkes uji') }), 'duplicate'));
  await qa.step(3, async () => {
    await d.open();
    const rowButtons = await d.rows().first().getByRole('button').count();
    await d.openDialog();
    const actions = await d.dialog.getByRole('combobox', { name: 'Action' }).locator('option').allInnerTexts();
    expect(actions.some((a) => /edit|deactivate|delete/i.test(a))).toBe(false);
    qa.note(3, `actions ${actions.join(', ')}; ${rowButtons} button(s) on a row`);
  });
});

qaTest('TC-APP023-003', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  await qa.step(1, async () => {
    expect(await d.save({ Code: bidder }, 'Convert to vendor')).toContain(SAVED);
    expect((await d.list(bidder)).find((r) => r[1].includes(bidder))?.[0]).toBe('supplier');
  });
  await qa.step(2, async () => {
    await page.goto('/en/procurement/suppliers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const found = (await page.getByRole('main').innerText()).includes(bidder) || (await page.getByRole('main').innerText()).includes('QA-PT Penawar Uji');
    qa.note(2, `Procurement / Suppliers ${found ? 'lists' : 'does not list'} the bidder`);
  });
  qa.notRun(3, 'a purchase order for the supplier is the 09 Procurement flow');
});

qaTest('TC-APP023-004', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  expect(await d.save({ Code: bidder }, 'Convert to vendor')).toContain(SAVED);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: bidder }, 'Convert to vendor'), 'bidder is already a supplier'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: qa.code('X-TIDAK-ADA') }, 'Convert to vendor'), 'bidder is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: '' }, 'Convert to vendor'), 'code is required'));
  qa.notRun(4, 'needs a bidder named like an existing supplier of Procurement');
});

qaTest('TC-APP023-005', async ({ page, qa }) => {
  const t = desk(page, 'tenders');
  const category = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  await qa.step(1, async () => {
    await page.goto('/en/sourcing');
    await page.getByRole('main').getByRole('link', { name: 'Tenders' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Tenders' })).toBeVisible();
    await expect(t.main.getByText('Mail to bidders stays out.', { exact: true })).toBeVisible();
    await expect(t.main.getByRole('button', { name: 'Create tender' })).toBeVisible();
    await expect(t.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await t.main.getByRole('button', { name: 'Create tender' }).click();
    await expect(t.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveCount(2);
    for (const f of ['Number', 'Code', 'Name', 'Limited vendor']) await expect(t.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  await qa.step(3, async () => {
    const r = await t.create({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: await approvedRequest(page), Close: WEEK() });
    qa.note(3, `"Save": toast "${r.toasts.join(' / ').slice(0, 80)}"`);
    expect(r.toasts).not.toContain(SAVED);
  });
  for (const st of [3, 4, 5, 6]) qa.blocked(st, 39);
});

qaTest('TC-APP023-006', async ({ page, qa }) => {
  const t = desk(page, 'tenders');
  const category = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  const pr = await approvedRequest(page);
  const v = (extra: Record<string, string>) => ({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: pr, Close: WEEK(), ...extra });
  await qa.step(1, async () => {
    refused(qa, 1, await t.save(v({ Document: '' })), 'document is missing');
    refused(qa, 1, await t.save(v({ Document: 'bukan-id' })), 'document is missing');
  });
  await qa.step(2, async () => {
    await page.goto('/en/procurement/requests');
    const draft = (await page.getByRole('main').innerText()).match(/draft \S+ ([0-9a-f-]{36})/)?.[1];
    if (!draft) {
      qa.note(2, 'no request that is not approved on /procurement/requests');
      return;
    }
    refused(qa, 2, await t.save(v({ Document: draft })), 'the tender needs an approved purchase request');
  });
  await qa.step(3, async () => refused(qa, 3, await t.save(v({ Name: 'limited' })), 'at least one vendor is required'));
  await qa.step(4, async () => refused(qa, 4, await t.save(v({ Close: '' })), 'number, category and close date are required'));
  await qa.step(5, async () => refused(qa, 5, await t.save(v({ Code: qa.code('X-TIDAK-ADA') })), 'category is missing'));
  qa.blocked(6, 39);
  qa.blocked(7, 39);
  await qa.step(8, async () => {
    const toasts = await t.save(v({ Close: addDays(todayWib(), -30) }));
    qa.note(8, `a close date in the past: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP023-007', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP023-011', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP023-015', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP023-018', async ({ page, qa }) => {
  const m = desk(page, 'money');
  for (const st of [1, 2, 3]) qa.blocked(st, 39);
  await qa.step(4, async () => {
    await m.openDialog();
    await expect(m.dialog.getByRole('textbox', { name: 'Amount' })).toHaveValue('250000');
    qa.note(4, 'the dialog opens with the sample amount 250000');
  });
});

qaTest('TC-APP023-019', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP023-020', TC_APP023_020);

const ROUTES: [string, string, string][] = [
  ['TC-APP023-022', '/sourcing', 'Sourcing'],
  ['TC-APP023-023', '/sourcing/agreements', 'Agreements'],
  ['TC-APP023-024', '/sourcing/bids', 'Bids'],
  ['TC-APP023-025', '/sourcing/masters', 'Masters'],
  ['TC-APP023-026', '/sourcing/money', 'Deposits'],
  ['TC-APP023-027', '/sourcing/tenders', 'Tenders'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
