import type { Locator, Page, Response } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsAfter } from '../18-settings/helpers';
import { head } from '../20-budget/cases';
import { newItem } from '../07-inventory/cases';
import { act as procurementAct, raise } from '../09-procurement/cases';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';

/**
 * Test cases of 23-sourcing that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const SAVED = 'Saved.';

const SCREENS = {
  masters: { heading: 'Masters', button: 'Category' },
  tenders: { heading: 'Tenders', button: 'Create tender' },
  bids: { heading: 'Bids', button: 'Bid' },
  agreements: { heading: 'Agreements', button: 'Agreement' },
  money: { heading: 'Deposits', button: 'Fee' },
} as const;
export type Route = keyof typeof SCREENS;

/** The values of the "Action" entries of the tender, bid, agreement and deposit dialogs. */
const ACTION_VALUES: Record<string, string> = {
  'Create tender': 'tender',
  'Send tender': 'send_tender',
  Publish: 'publish',
  Advert: 'ad',
  Corrigendum: 'corrigendum',
  Bid: 'bid',
  'Submit bid': 'submit_bid',
  'Open bid': 'open_bid',
  'Accept bid': 'accept_bid',
  'Evaluate accept': 'evaluate_accept',
  'Evaluate reject': 'evaluate_reject',
  Sheet: 'sheet',
  Agreement: 'agreement',
  'Send agreement': 'send_agreement',
  'Approve agreement': 'approve_agreement',
  Amend: 'amend',
  Sanction: 'sanction',
  Fee: 'fee',
  Deposit: 'emd',
  Refund: 'refund',
  Forfeit: 'forfeit',
  Release: 'release',
};

/** The values of the "Action" list of an open dialog. */
export async function actionValues(dialog: Locator): Promise<string[]> {
  return dialog.getByRole('combobox', { name: 'Action' }).locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
}
export const valuesOf = (actions: string[]) => actions.map((a) => ACTION_VALUES[a]);

export class Desk {
  readonly main: Locator;
  readonly dialog: Locator;
  /** The answer of the last save whose new record could not be found (for the error message). */
  lastAnswer = '';
  constructor(
    readonly page: Page,
    readonly route: Route,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/id/sourcing/${this.route}`);
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
    if (action) {
      // By value where it is known: some Indonesian labels read back as other English texts ("Kembali" is Back, not Refund).
      const list = this.dialog.getByRole('combobox', { name: 'Action' });
      const value = ACTION_VALUES[action];
      const values = await list.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
      await list.selectOption(value && values.includes(value) ? { value } : { label: action });
    }
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
      // The search asks the server: it finds rows past the first ones the list shows (found blocker 40), also by id.
      const box = this.main.getByRole('textbox', { name: 'Search' }).or(this.main.getByRole('searchbox')).first();
      await box.fill(search);
      await box.press('Enter');
      await expect(this.rows().filter({ hasText: search }).first()).toBeVisible().catch(() => {});
    }
    return this.rows().evaluateAll((rs) =>
      rs.filter((r) => r.querySelectorAll('td').length >= 3).map((r) => Array.from(r.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.trim() ?? '')),
    );
  }
  /**
   * Saves and returns the id of the new record: from the answer of the save
   * (1:{"id":…}), else the row that is new in the list. The lists show only
   * their first rows (found blocker 40), so a new row is often not listed.
   */
  async create(v: Record<string, string>, action?: string): Promise<{ toasts: string[]; id: string }> {
    const before = new Set((await this.list()).map((r) => r[2]));
    const answers: Promise<string>[] = [];
    const listen = (res: Response) => {
      if (res.request().method() !== 'POST' || !res.request().headers()['next-action']) return;
      answers.push(res.text().catch(() => ''));
    };
    this.page.on('response', listen);
    const toasts = await this.save(v, action).finally(() => this.page.off('response', listen));
    const bodies = await Promise.all(answers);
    // The answer of a save names the new record: 1:{"id":"…"} (a nil id 00000000-… is no id).
    const answered = bodies.map((t) => /^1:\{"id":"([\w-]+)"\}/m.exec(t)?.[1]?.replace(/^[0-]+$/, '') ?? '').find(Boolean);
    if (answered) return { toasts, id: answered };
    // Else the row that is new in the list, found by its number or code when the list is long.
    const key = v.Number || v.Code || '';
    const after = await this.list(key || undefined);
    const id = after.find((r) => r[2] && !before.has(r[2]) && (!key || r[1].includes(key)))?.[2] ?? '';
    if (!id && toasts.includes(SAVED)) this.lastAnswer = bodies.map((t) => t.slice(0, 160)).join(' | ');
    return { toasts, id };
  }
  async status(id: string): Promise<string> {
    return (await this.list(id)).find((r) => r[2] === id)?.[0] ?? '';
  }
}

export const desk = (page: Page, r: Route) => new Desk(page, r);

/**
 * Expects an action to have brought its row to `expected`. The lists hold
 * only the first 40 records the server sends, and their search looks only
 * through those (found blocker 40): when the row is not there, the toast
 * "Saved." of the action stands in.
 */
export function reached(r: { toasts: string[]; status: string }, expected: string): void {
  if (r.status) expect(r.status).toBe(expected);
  else expect(r.toasts, `the action that leads to "${expected}" (its row is not listed, found blocker 40)`).toContain(SAVED);
}

/** A status read from a list, checked when the row is listed (found blocker 40). */
export function expectListed(status: string, expected: string): void {
  if (status) expect(status).toBe(expected);
}

export function refused(qa: Qa, step: number, toasts: string[], serverText: string): void {
  // A save the workbook expects refused, saved by the site: a deviation, not an error of the test.
  if (toasts.includes(SAVED)) return qa.deviation(step, `Refused (the server text ends in "${serverText}")`, 'saved ("Saved.")');
  qa.note(step, `toast "${toasts.join(' / ').slice(0, 120)}" (the workbook: the server text ends in "${serverText}")`);
}

export async function master(page: Page, qa: Qa, kind: 'Category' | 'Checklist' | 'Bidder', base: string, name: string): Promise<string> {
  const code = qa.code(base);
  expect(await desk(page, 'masters').save({ Code: code, Name: qa.name(name) }, kind)).toContain(SAVED);
  return code;
}

/** The id of an approved request of Procurement (made by 09). */
export async function approvedRequest(page: Page): Promise<string> {
  await page.goto('/id/procurement/requests');
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.getByRole('main').innerText();
  const id = text.match(/approved \S+ ([0-9a-f-]{36})/)?.[1];
  expect(id, 'an approved row on /procurement/requests').toBeTruthy();
  return id!;
}


/**
 * A purchase request of the test (for a new item) raised, sent and approved
 * in Procurement; returns its id. The site takes one tender per request: a
 * second tender for a request answers HTTP 500 (digest 3536862028, seen
 * 2026-10-29), so every tender of the tests starts from its own request.
 */
export async function freshRequest(page: Page, qa: Qa): Promise<string> {
  const d = new ProcurementDeskPage(page);
  const id = await raise(d, await newItem(page, qa));
  expect(await procurementAct(d, 'suppliers', id, 'send_request')).toContain(SAVED);
  expect(await procurementAct(d, 'suppliers', id, 'approve_request')).toContain(SAVED);
  return id;
}

export const WEEK = () => addDays(todayWib(), 7);

/** TC-APP023-001: the masters of sourcing (category, checklist, bidder). */
export const TC_APP023_001 = async ({ page, qa }: CaseArgs): Promise<{ category: string; bidder: string; bidderName: string }> => {
  const d = desk(page, 'masters');
  const cat = qa.code('X-ALKES');
  const bidder = qa.code('X-BDR1');
  await qa.step(1, async () => {
    await page.goto('/id/sourcing');
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
    if (!(await d.list(cat)).some((r) => r[1].includes(cat))) qa.note(3, `${cat} is saved but not listed: the list and its search hold only the first 40 records (found blocker 40)`);
  });
  await qa.step(4, async () => {
    const ck = qa.code('X-CK1');
    expect(await d.save({ Code: ck, Name: qa.name('X NPWP terlampir') }, 'Checklist')).toContain(SAVED);
    qa.note(4, `the checklist is ${(await d.list(ck)).some((r) => r[1].includes(ck)) ? '' : 'not '}listed on the screen`);
  });
  await qa.step(5, async () => {
    expect(await d.save({ Code: bidder, Name: qa.name('X PT Penawar Uji') }, 'Bidder')).toContain(SAVED);
    if (!(await d.list(bidder)).some((r) => r[1].includes(bidder))) qa.note(5, `${bidder} is saved but not listed: the list and its search hold only the first 40 records (found blocker 40)`);
  });
  await qa.step(6, async () => {
    const rows = await d.list();
    const mine = rows.filter((r) => r[1].includes(cat) || r[1].includes(bidder)).map((r) => `${r[0]} ${r[1]}`);
    qa.note(6, `one list: ${mine.join(' ; ')}`);
  });
  return { category: cat, bidder, bidderName: qa.name('X PT Penawar Uji') };
};


export const YESTERDAY = () => addDays(todayWib(), -1);

/** Opens a screen of Sourcing by its menu and checks its heading, its button and its columns. */
async function byMenu(page: Page, route: Route, link: string): Promise<Desk> {
  const d = desk(page, route);
  await page.goto('/id/sourcing');
  await page.getByRole('complementary').getByRole('link', { name: link, exact: true }).or(page.getByRole('main').getByRole('link', { name: link, exact: true })).first().click();
  await expect(d.main.getByRole('heading', { level: 1, name: SCREENS[route].heading })).toBeVisible();
  await expect(d.main.getByRole('button', { name: SCREENS[route].button, exact: true })).toBeVisible();
  await expect(d.main.getByRole('textbox', { name: 'Search' }).or(d.main.getByRole('searchbox')).first()).toBeVisible();
  await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  return d;
}

/** Saves an action on a saved row (its id in "Document") and returns the toasts and the status of the row afterwards. */
export async function act(page: Page, route: Route, id: string, action: string, extra: Record<string, string> = {}): Promise<{ toasts: string[]; status: string }> {
  const d = desk(page, route);
  const toasts = await d.save({ Document: id, ...extra }, action);
  return { toasts, status: await d.status(id) };
}

/** A tender of a new category (or `category`) from a new approved purchase request (or `request`, which must have no tender yet), saved as draft; returns its id. */
export async function draftTender(page: Page, qa: Qa, v: { category?: string; request?: string; close?: string } = {}): Promise<{ id: string; category: string }> {
  const category = v.category ?? (await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji'));
  const t = desk(page, 'tenders');
  const r = await t.create({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: v.request ?? (await freshRequest(page, qa)), Close: v.close ?? WEEK() });
  expect(r.toasts, 'the tender is saved').toContain(SAVED);
  expect(r.id, `the id of the new tender (answer: ${t.lastAnswer || 'none'})`).toBeTruthy();
  return { id: r.id, category };
}

/** A tender sent and published; closing yesterday by default, so that its bids can be accepted. */
export async function publishedTender(page: Page, qa: Qa, v: { category?: string; request?: string; close?: string } = {}): Promise<{ id: string; category: string }> {
  const t = await draftTender(page, qa, { close: YESTERDAY(), ...v });
  reached(await act(page, 'tenders', t.id, 'Send tender'), 'sent');
  reached(await act(page, 'tenders', t.id, 'Publish'), 'published');
  return t;
}

/** A bid of `bidder` on a tender, saved as draft; returns its id. */
export async function newBid(page: Page, tender: string, bidder: string, price: string): Promise<{ id: string; toasts: string[] }> {
  return desk(page, 'bids').create({ Document: tender, Code: bidder, Price: price }, 'Bid');
}

/** A bid submitted and opened; returns its id. */
export async function openedBid(page: Page, tender: string, bidder: string, price: string): Promise<string> {
  const b = await newBid(page, tender, bidder, price);
  expect(b.toasts, 'the bid is saved').toContain(SAVED);
  reached(await act(page, 'bids', b.id, 'Submit bid'), 'submitted');
  reached(await act(page, 'bids', b.id, 'Open bid'), 'opened');
  return b.id;
}

/**
 * A published tender (closed yesterday) with a bid of a new bidder opened,
 * evaluated, rated accepted on the sheet and accepted: what an agreement
 * needs (TC-APP023-020, steps 4 and 5).
 */
export async function ratedTender(page: Page, qa: Qa): Promise<{ tender: string; bidder: string; bid: string }> {
  const t = await publishedTender(page, qa);
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  const bid = await openedBid(page, t.id, bidder, '1450000');
  const b = desk(page, 'bids');
  expect(await b.save({ Document: bid, Name: 'A' }, 'Evaluate accept')).toContain(SAVED);
  expect(await b.save({ Document: t.id, Code: bidder, Name: 'accepted' }, 'Sheet')).toContain(SAVED);
  reached(await act(page, 'bids', bid, 'Accept bid'), 'accepted');
  return { tender: t.id, bidder, bid };
}

/**
 * Saves an agreement for a tender as the workbook does (first step, then the
 * tender in "Document"). The save answers HTTP 500 (digest 3681885900, found
 * blocker 50) also for a tender whose bid is accepted and rated on the sheet;
 * it is tried once more with a budget head of the test, in case the empty
 * "Budget head" is what the server refuses. Returns the id, the toasts of
 * both tries and whether only the second saved.
 */
export async function saveAgreement(page: Page, qa: Qa, v: Record<string, string>): Promise<{ id: string; toasts: string[]; withHead: boolean }> {
  const d = desk(page, 'agreements');
  const first = await d.create(v, 'Agreement');
  if (first.toasts.includes(SAVED)) return { id: first.id, toasts: first.toasts, withHead: false };
  const second = await d.create({ ...v, Number: `${v.Number}-B`, 'Budget head': (await head(page, qa)).code, Amount: '14500000' }, 'Agreement');
  return { id: second.toasts.includes(SAVED) ? second.id : '', toasts: [...first.toasts, ...second.toasts], withHead: second.toasts.includes(SAVED) };
}

/** Records the outcome of saveAgreement on a step: a save that needs the budget head is a deviation; no save is found blocker 50. */
export function agreementSaved(qa: Qa, step: number, r: { id: string; toasts: string[]; withHead: boolean }): boolean {
  if (r.withHead) qa.deviation(step, 'Toast "Saved." with the first step and the tender only', `HTTP 500 ("${r.toasts[0]?.slice(0, 40)}"); saved only once a budget head and an amount were typed on the second step`);
  if (!r.toasts.includes(SAVED)) qa.note(step, `the agreement is not saved, with or without a budget head: "${r.toasts.map((t) => t.slice(0, 40)).join(' / ')}" (found blocker 50)`);
  return r.toasts.includes(SAVED);
}

/** TC-APP023-005: a tender from an approved purchase request (`given.request`, else a new one of the test), sent, published, advertised and corrected. */
export const TC_APP023_005 = async ({ page, qa }: CaseArgs, given: { request?: string; category?: string; close?: string } = {}): Promise<{ tender: string; category: string }> => {
  const t = desk(page, 'tenders');
  const category = given.category ?? (await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji'));
  let id = '';
  await qa.step(1, async () => {
    await page.goto('/id/sourcing');
    await page.getByRole('main').getByRole('link', { name: 'Tenders' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Tenders' })).toBeVisible();
    await expect(t.main.getByText('Mail to bidders stays out.', { exact: true })).toBeVisible();
    await expect(t.main.getByRole('button', { name: 'Create tender' })).toBeVisible();
    await expect(t.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await t.main.getByRole('button', { name: 'Create tender' }).click();
    await expect(t.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/^1\s*Details$/, /^2\s*Review$/]);
    for (const f of ['Number', 'Code', 'Name', 'Limited vendor']) await expect(t.dialog.getByRole('textbox', { name: f })).toBeVisible();
    for (const b of ['Back', 'Next']) await expect(t.dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
  await qa.step(3, async () => {
    const close = given.close ?? WEEK();
    const r = await t.create({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: given.request ?? (await freshRequest(page, qa)), Close: close });
    id = r.id;
    qa.note(3, `"Save": toast "${r.toasts.join(' / ').slice(0, 80)}"; tender ${id || '(not listed)'}, closing ${close}`);
    expect(r.toasts).toContain(SAVED);
    expectListed(await t.status(id), 'draft');
  });
  await qa.step(4, async () => {
    reached(await act(page, 'tenders', id, 'Send tender'), 'sent');
    reached(await act(page, 'tenders', id, 'Publish'), 'published');
  });
  await qa.step(5, async () => {
    const toasts = await t.save({ Name: qa.name('X Koran Uji'), Note: qa.prefix('X Pengumuman tender alat kesehatan'), Document: id }, 'Advert');
    expect(toasts).toContain(SAVED);
    qa.note(5, `the advert is ${(await t.list()).some((r) => r[1].includes('Koran')) ? '' : 'not '}listed on Tenders (TBD in the workbook: where it shows)`);
  });
  await qa.step(6, async () => {
    expect(await t.save({ Note: qa.prefix('X Koreksi spesifikasi'), Document: id }, 'Corrigendum')).toContain(SAVED);
    qa.note(6, `the tender reads "${await t.status(id)}" after the corrigendum (TBD in the workbook: where it shows, and whether it may move the close date)`);
  });
  return { tender: id, category };
};

/** TC-APP023-008: two bids on a published tender (`given`, else a new one closing yesterday), opened, evaluated, rated on the sheet; the first accepted. */
export const TC_APP023_008 = async ({ page, qa }: CaseArgs, given: { tender?: string; bidders?: string[] } = {}): Promise<{ tender: string; bids: string[]; bidders: string[] }> => {
  const tender = given.tender ?? (await publishedTender(page, qa)).id;
  const bidders = given.bidders?.length === 2 ? given.bidders : [given.bidders?.[0] ?? (await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji')), await master(page, qa, 'Bidder', 'X-BDR2', 'X PT Penawar Dua')];
  const prices = ['1450000', '1500000'];
  const bids: string[] = [];
  let d = desk(page, 'bids');
  await qa.step(1, async () => {
    d = await byMenu(page, 'bids', 'Bids');
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Bid', exact: true }).click();
    for (const f of ['Document', 'Code', 'Price', 'Name', 'Note']) await expect(d.dialog.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    expect(await actionValues(d.dialog)).toEqual(valuesOf(['Bid', 'Submit bid', 'Open bid', 'Accept bid', 'Evaluate accept', 'Evaluate reject', 'Sheet']));
    // The footer buttons (the dialog also has an icon "Close" in its corner).
    for (const b of ['Close', 'Save']) await expect(d.dialog.getByRole('button', { name: b, exact: true }).last()).toBeVisible();
  });
  await qa.step(3, async () => {
    for (const [i, b] of bidders.entries()) {
      const r = await newBid(page, tender, b, prices[i]);
      expect(r.toasts, `the bid of ${b}`).toContain(SAVED);
      bids.push(r.id);
      expectListed(await d.status(r.id), 'draft');
    }
    qa.note(3, `bids ${bids.join(', ')} on tender ${tender}`);
  });
  await qa.step(4, async () => {
    for (const id of bids) {
      reached(await act(page, 'bids', id, 'Submit bid'), 'submitted');
      reached(await act(page, 'bids', id, 'Open bid'), 'opened');
    }
  });
  await qa.step(5, async () => {
    expect(await d.save({ Document: bids[0], Name: 'A' }, 'Evaluate accept')).toContain(SAVED);
    expect(await d.save({ Document: bids[1], Note: qa.prefix('X Harga di atas pagu') }, 'Evaluate reject')).toContain(SAVED);
  });
  await qa.step(6, async () => {
    expect(await d.save({ Document: tender, Code: bidders[0], Name: 'accepted' }, 'Sheet')).toContain(SAVED);
    expect(await d.save({ Document: tender, Code: bidders[1], Name: 'rejected' }, 'Sheet')).toContain(SAVED);
    qa.note(6, 'the comparison sheet is not listed on Bids (TBD in the workbook: where it can be read)');
  });
  await qa.step(7, async () => {
    const r = await act(page, 'bids', bids[0], 'Accept bid');
    qa.note(7, `"Accept bid" on ${bids[0]} (the tender closed ${YESTERDAY()}): "${r.toasts.join(' / ')}"`);
    reached(r, 'accepted');
  });
  return { tender, bids, bidders };
};

/** TC-APP023-012: the agreement with the winner of a tender (`given`, else a tender with a bidder accepted on the sheet), sent, approved, sanctioned and amended. */
export const TC_APP023_012 = async ({ page, qa }: CaseArgs, given: { tender?: string; vendor?: string } = {}): Promise<{ agreement: string }> => {
  const tender = given.tender ?? (await ratedTender(page, qa)).tender;
  const vendor = given.vendor ?? qa.name('X PT Penawar Uji');
  let d = desk(page, 'agreements');
  let id = '';
  await qa.step(1, async () => {
    d = await byMenu(page, 'agreements', 'Agreements');
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Agreement', exact: true }).click();
    await expect(d.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveCount(2);
    for (const f of ['Number', 'Name', 'Item', 'Price']) await expect(d.dialog.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    for (const b of ['Back', 'Next']) await expect(d.dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
  let saved = false;
  await qa.step(3, async () => {
    const r = await saveAgreement(page, qa, { Number: qa.code('X-AGR-001'), Name: vendor, Item: qa.prefix('X Monitor pasien'), Price: '1450000', Document: tender });
    id = r.id;
    saved = agreementSaved(qa, 3, r);
    if (!saved) return;
    qa.note(3, `agreement ${id || '(id not read)'}`);
    expectListed(await d.status(id), 'draft');
  });
  if (!saved) {
    for (const st of [3, 4, 5, 6, 7]) qa.blocked(st, 50);
    return { agreement: '' };
  }
  await qa.step(4, async () => {
    reached(await act(page, 'agreements', id, 'Send agreement'), 'sent');
    reached(await act(page, 'agreements', id, 'Approve agreement'), 'approved');
  });
  let sanctioned = false;
  await qa.step(5, async () => {
    // A budget head of 20 Budget made by the test (no budget line can be allocated to it, blocker 13).
    const h = await head(page, qa);
    const toasts = await d.save({ Document: id, 'Budget head': h.code, Amount: '14500000' }, 'Sanction');
    sanctioned = toasts.includes(SAVED);
    qa.note(5, `"Sanction" of 14500000: "${toasts.join(' / ')}"`);
    if (!sanctioned) qa.blocked(5, 13);
  });
  if (sanctioned) qa.notRun(6, 'TBD in the workbook: the reservation on the budget position; the head of the test has no budget line to read (blocker 13)');
  else qa.blocked(6, 13);
  await qa.step(7, async () => {
    const r = await d.create({ Number: qa.code('X-AGR-002'), Document: id }, 'Amend');
    qa.note(7, `"Amend": "${r.toasts.join(' / ')}"; ${r.id ? `a new row ${r.id} "${await d.status(r.id)}"` : 'no new row'} (TBD in the workbook)`);
  });
  return { agreement: id };
};

/** TC-APP023-016: the tender fee and the deposit of a bidder (`given`, else a new tender and bidder), and the refund of the deposit. */
export const TC_APP023_016 = async ({ page, qa }: CaseArgs, given: { tender?: string; bidder?: string } = {}): Promise<{ deposit: string }> => {
  const tender = given.tender ?? (await publishedTender(page, qa, { close: WEEK() })).id;
  const bidder = given.bidder ?? (await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji'));
  let d = desk(page, 'money');
  let deposit = '';
  await qa.step(1, async () => {
    d = await byMenu(page, 'money', 'Deposits');
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Fee', exact: true }).click();
    for (const f of ['Document', 'Code', 'Amount']) await expect(d.dialog.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    expect(await actionValues(d.dialog)).toEqual(valuesOf(['Fee', 'Deposit', 'Refund', 'Forfeit', 'Release']));
    // The footer buttons (the dialog also has an icon "Close" in its corner).
    for (const b of ['Close', 'Save']) await expect(d.dialog.getByRole('button', { name: b, exact: true }).last()).toBeVisible();
  });
  await qa.step(3, async () => {
    const r = await d.create({ Document: tender, Code: bidder, Amount: '250000' }, 'Fee');
    qa.note(3, `fee: "${r.toasts.join(' / ')}"; row ${r.id || '(none new)'}`);
    expect(r.toasts).toContain(SAVED);
    expect(r.id, 'a row for the fee').toBeTruthy();
  });
  await qa.step(4, async () => {
    const r = await d.create({ Document: tender, Code: bidder, Amount: '5000000' }, 'Deposit');
    deposit = r.id;
    qa.note(4, `deposit: "${r.toasts.join(' / ')}"; row ${r.id || '(none new)'}`);
    expect(r.toasts).toContain(SAVED);
    expect(r.id, 'a row for the deposit').toBeTruthy();
  });
  await qa.step(5, async () => {
    await page.goto('/id/finance/vouchers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = (await page.getByRole('main').or(page.locator('body')).first().innerText({ timeout: 30_000 }).catch(() => '')).replace(/\s+/g, ' ');
    qa.note(5, `Finance / Vouchers ${text.includes(bidder) ? 'names' : 'does not name'} the bidder ${bidder}; "tender fee" ${/tender fee/i.test(text) ? 'shown' : 'not shown'}, "emd" ${/\bemd\b/i.test(text) ? 'shown' : 'not shown'} (TBD in the workbook)`);
  });
  await qa.step(6, async () => {
    const toasts = await d.save({ Document: deposit, Code: bidder, Amount: '5000000' }, 'Refund');
    qa.note(6, `refund of ${deposit}: "${toasts.join(' / ')}" (TBD in the workbook: a voucher "emd refund")`);
    expect(toasts).toContain(SAVED);
  });
  return { deposit };
};

/** TC-APP023-003: a bidder (`given`, else a new one) turned into a supplier of Procurement. */
export const TC_APP023_003 = async ({ page, qa }: CaseArgs, given?: string): Promise<void> => {
  const d = desk(page, 'masters');
  const bidder = given ?? (await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji'));
  await qa.step(1, async () => {
    expect(await d.save({ Code: bidder }, 'Convert to vendor')).toContain(SAVED);
    expectListed((await d.list(bidder)).find((r) => r[1].includes(bidder))?.[0] ?? '', 'supplier');
  });
  await qa.step(2, async () => {
    await page.goto('/id/procurement/suppliers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.getByRole('main').innerText();
    qa.note(2, `Procurement / Suppliers ${text.includes(bidder) || text.includes('QA-PT Penawar Uji') ? 'lists' : 'does not list'} the bidder`);
  });
  qa.notRun(3, 'a purchase order for the supplier is the 09 Procurement flow');
};

/** TC-APP023-020: the whole sourcing of one request: tender, two bids with their fees and deposits, the winner's agreement, the loser's refund. */
export const TC_APP023_020 = async ({ page, qa }: CaseArgs): Promise<void> => {
  qa.notRun(1, 'the approval of a purchase request is the 09 Procurement flow (TC-APP009-039); an approved request of Procurement is used');
  let tender = '';
  await qa.step(2, async () => {
    tender = (await publishedTender(page, qa)).id;
    qa.note(2, `tender ${tender} published, closing ${YESTERDAY()} so that a bid can be accepted`);
  });
  const bidders = [await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji'), await master(page, qa, 'Bidder', 'X-BDR2', 'X PT Penawar Dua')];
  const bids: string[] = [];
  const deposits: string[] = [];
  const money = desk(page, 'money');
  await qa.step(3, async () => {
    for (const [i, b] of bidders.entries()) {
      bids.push(await openedBid(page, tender, b, ['1450000', '1500000'][i]));
      expect(await money.save({ Document: tender, Code: b, Amount: '250000' }, 'Fee')).toContain(SAVED);
      const dep = await money.create({ Document: tender, Code: b, Amount: '5000000' }, 'Deposit');
      expect(dep.toasts).toContain(SAVED);
      deposits.push(dep.id);
    }
    qa.note(3, `bids ${bids.join(', ')}; deposits ${deposits.join(', ')} (TBD in the workbook: the four vouchers in Finance)`);
  });
  await qa.step(4, async () => {
    const bd = desk(page, 'bids');
    expect(await bd.save({ Document: bids[0], Name: 'A' }, 'Evaluate accept')).toContain(SAVED);
    expect(await bd.save({ Document: bids[1], Note: qa.prefix('X Harga di atas pagu') }, 'Evaluate reject')).toContain(SAVED);
    expect(await bd.save({ Document: tender, Code: bidders[0], Name: 'accepted' }, 'Sheet')).toContain(SAVED);
    expect(await bd.save({ Document: tender, Code: bidders[1], Name: 'rejected' }, 'Sheet')).toContain(SAVED);
    reached(await act(page, 'bids', bids[0], 'Accept bid'), 'accepted');
  });
  await qa.step(5, async () => {
    const ag = desk(page, 'agreements');
    const r = await saveAgreement(page, qa, { Number: qa.code('X-AGR-001'), Name: qa.name('X PT Penawar Uji'), Item: qa.prefix('X Monitor pasien'), Price: '1450000', Document: tender });
    if (!agreementSaved(qa, 5, r)) return qa.blocked(5, 50);
    reached(await act(page, 'agreements', r.id, 'Send agreement'), 'sent');
    reached(await act(page, 'agreements', r.id, 'Approve agreement'), 'approved');
    const sanction = await ag.save({ Document: r.id, 'Budget head': (await head(page, qa)).code, Amount: '14500000' }, 'Sanction');
    qa.note(5, `agreement ${r.id} approved; "Sanction": "${sanction.join(' / ')}"`);
    if (!sanction.includes(SAVED)) qa.blocked(5, 13);
  });
  await qa.step(6, async () => {
    expect(await money.save({ Document: deposits[1], Code: bidders[1], Amount: '5000000' }, 'Refund')).toContain(SAVED);
    expect(await desk(page, 'masters').save({ Code: bidders[0] }, 'Convert to vendor')).toContain(SAVED);
    qa.note(6, `the deposit of ${bidders[1]} refunded; ${bidders[0]} reads "${(await desk(page, 'masters').list(bidders[0])).find((r) => r[1].includes(bidders[0]))?.[0] ?? ''}"`);
  });
  qa.notRun(7, 'TBD: the purchase order of the request is the 09 Procurement flow');
};
