import { addDays, todayWib } from '../../../lib/dates';
import type { Locator, Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { asOnSite } from '../../../lib/i18n';
import { closeDialog } from '../../../lib/pharmacy-data';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { toastsAfter } from '../18-settings/helpers';

/**
 * The CSSD documents of 21-cssd.xlsx: Sterile Request (/cssd/requests),
 * Unsterile Receipt (/cssd/receipts), cycles and the ward's Sterile Receipt
 * (/cssd/sterile-receipts). Each is a form ("New") with stores, set lines
 * and item lines, then the actions Save, Send for Approval, Approve,
 * Reject and Cancel.
 *
 * No store can be made (found blocker 26): the stores of the workbook data
 * stand in as seed stores of Podomoro.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const STORES = {
  /** "X Gudang OK": the stand-in store of 05 Pharmacy, where the tests receive their stock. */
  requesting: { code: 'FI01-00-00', name: 'GUDANG FARMASI RUMAH SAKIT' },
  /** "X Gudang CSSD": the Central Sterile Supply Unit store. */
  sterilizing: { code: 'FE07-00-20', name: 'CSSU' },
  /** "X Transit CSSD": the sterile store. */
  transit: { code: 'GST', name: 'Gudang Steril' },
} as const;

export const SET = 'SET-OK';
export const PACKING = 'QA-POUCH';

/**
 * Opens a CSSD screen; under load nginx answers "504 Gateway Time-out" now and
 * then (the CSSD lists are slow), so a gateway page is reloaded a few times.
 */
export async function gotoPatiently(page: Page, url: string): Promise<void> {
  for (let i = 0; ; i++) {
    const res = await page.goto(url).catch(() => null);
    await page.waitForLoadState('networkidle').catch(() => {});
    const gateway = (res?.status() ?? 200) >= 502 || (await page.getByRole('heading', { name: /^50[234] /, exact: false }).count()) > 0;
    if (!gateway || i >= 3) return;
    await page.waitForTimeout(10_000);
  }
}

/** Waits (up to 6 minutes) until the site answers again after a stalled receipt: the CSSD home page loads in time. */
async function recovered(page: Page): Promise<void> {
  const until = Date.now() + 360_000;
  while (Date.now() < until) {
    const t = Date.now();
    const res = await page.request.get('/id/cssd', { timeout: 20_000, maxRedirects: 0 }).catch(() => null);
    if (res && res.status() < 500 && Date.now() - t < 5_000) return;
    await page.waitForTimeout(15_000);
  }
}

export class CssdForm {
  readonly main: Locator;
  constructor(
    readonly page: Page,
    readonly route: 'requests' | 'receipts' | 'sterile-receipts',
  ) {
    this.main = page.getByRole('main');
  }
  async openNew(): Promise<void> {
    await gotoPatiently(this.page, `/id/cssd/${this.route}/new`);
    await expect(this.main.getByRole('heading', { level: 1, name: 'New' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  field(name: string): Locator {
    return this.main.getByRole('textbox', { name, exact: true });
  }
  button(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }
  /**
   * Picks a store in a type-ahead: its list ("<code> <name>") opens on focus,
   * and a typed code that is not picked from it is cleared.
   */
  async pickStore(field: string, code: string): Promise<void> {
    const box = this.field(field);
    await box.click();
    await box.fill(code);
    await this.main.getByText(code, { exact: true }).first().click();
    await expect(box).not.toHaveValue('');
  }
  /** Picks the three stores of a request by their codes. */
  async stores(s: { requesting?: string; sterilizing?: string; transit?: string }): Promise<void> {
    if (s.requesting !== undefined) await this.pickStore('Requesting Store', s.requesting);
    if (s.sterilizing !== undefined) await this.pickStore('Sterilizing Store', s.sterilizing);
    if (s.transit !== undefined) await this.pickStore('Transit Store', s.transit);
  }
  /** Picks the first option of a select that starts with `start` (labels as the site shows them). */
  async pick(select: Locator, start: string): Promise<string> {
    const labels = await select.locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
    const label = labels.find((l) => l.startsWith(start));
    expect(label, `an option starting "${start}"`).toBeTruthy();
    await select.selectOption({ label: label! });
    return label!;
  }
  /** "Add set": the set, its quantity and packing type on the new line. */
  async addSet(set = SET, quantity = '1', packing = PACKING): Promise<void> {
    await this.button('Add set').click();
    const line = this.main.locator('select').filter({ has: this.page.locator('option', { hasText: set }) }).last();
    await this.pick(line, set);
    await this.main.getByRole('spinbutton', { name: 'Quantity' }).last().fill(quantity);
    await this.pick(this.main.getByRole('combobox', { name: 'Packing Type' }).last(), packing);
  }
  /** The item lines (the section under the heading "Items"). */
  items(): Locator {
    return this.main.getByRole('heading', { name: 'Items' }).locator('xpath=..');
  }
  /**
   * Searches an item by its code and adds it with a quantity and packing
   * type. An item kept in batches gets its quantity on the line's first batch
   * row (`batch`): "Batch quantities must equal the line quantity."
   */
  async addItem(code: string, quantity: string, packing = PACKING, batch?: string): Promise<void> {
    const items = this.items();
    await items.getByRole('textbox', { name: 'Search an item…' }).fill(code);
    const hit = items.getByRole('button', { name: new RegExp(code) }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    const quantities = items.getByRole('spinbutton', { name: 'Quantity' });
    await quantities.first().fill(quantity);
    await this.pick(items.getByRole('combobox', { name: 'Packing Type' }).last(), packing);
    if (batch !== undefined) {
      await items.getByRole('textbox', { name: 'Batch code' }).first().fill(batch);
      await quantities.nth(1).fill(quantity);
    }
  }
  /** Clicks a button of the form and returns the toasts and any red text. */
  async act(name: string): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.button(name).click();
    const toasts = await toastsAfter(this.page, mark);
    const errors = (await this.main.locator('[role="alert"]').allInnerTexts().catch(() => [] as string[])).map((t) => t.trim()).filter(Boolean);
    return [...toasts, ...errors.filter((e) => !toasts.includes(e))];
  }
  /** The packing numbers shown on the lines. */
  async packingNumbers(): Promise<string[]> {
    const text = await this.main.innerText();
    return [...new Set(text.match(/\bPK[-\w]+|\bPKG[-\w]+/g) ?? [])];
  }
}

/** The stock of an item per store: the "Stock on hand" lines of the Item Master ("<store> · <batch> <qty> · <date>"), summed by store code. */
export async function stockByStore(page: Page, code: string): Promise<Map<string, number>> {
  const items = new ItemMasterPage(page);
  await items.open();
  const d = await items.openEdit({ code });
  const lines = d.getByText('Stock on hand', { exact: true }).locator('xpath=..').getByRole('listitem');
  await lines.first().waitFor({ timeout: 10_000 }).catch(() => {});
  const out = new Map<string, number>();
  for (const line of await lines.allInnerTexts()) {
    const m = line.replace(/\s+/g, ' ').match(/^(\S+) · (\S+) (-?[\d.,]+) · \d{4}-\d{2}-\d{2}$/);
    if (m) out.set(m[1], (out.get(m[1]) ?? 0) + Number(m[3].replace(/,/g, '')));
  }
  await closeDialog(page, d);
  return out;
}

/** The document number shown on a saved CSSD document ("SR-0003", "UR-0001", …). */
export async function docNumber(page: Page, prefix: string): Promise<string> {
  const text = await page.getByRole('main').innerText();
  const no = text.match(new RegExp(`\\b${prefix}-\\d+\\b`))?.[0] ?? '';
  expect(no, `a document number ${prefix}-…`).toBeTruthy();
  return no;
}

/**
 * A sterile request of the test with the set and 3 of QA-PARA (from `batch`),
 * saved, sent and approved; returns its number and packing numbers.
 */
export async function approvedRequest(page: Page, itemCode: string, batch: string): Promise<{ no: string; packs: string[] }> {
  const f = new CssdForm(page, 'requests');
  await f.openNew();
  await f.stores({ requesting: STORES.requesting.code, sterilizing: STORES.sterilizing.code, transit: STORES.transit.code });
  await f.addSet();
  await f.addItem(itemCode, '3', undefined, batch);
  expect(await f.act('Save')).toContain('Request saved.');
  expect(await f.act('Send for Approval')).toContain('Sent for approval. Packing numbers were created.');
  const packs = await f.packingNumbers();
  expect(await f.act('Approve')).toContain('Approved. Items moved to the transit store and sets were booked there, unsterile.');
  return { no: await docNumber(page, 'SR'), packs };
}

/** Picks the source document of a conversion ("Convert from") by its number. */
export async function convertFrom(f: CssdForm, no: string): Promise<void> {
  const box = f.field('Convert from');
  await box.click();
  await box.fill(no);
  await f.main.getByText(no, { exact: true }).first().click();
  await expect(box).not.toHaveValue('');
}

/** The lines of a conversion as { kind, code, packing, requested, open } and the input of their received quantity. */
export async function conversionLines(f: CssdForm): Promise<{ text: string; received: Locator }[]> {
  const rows = f.main.getByRole('table').last().getByRole('row').filter({ has: f.page.locator('input') });
  const out: { text: string; received: Locator }[] = [];
  for (const r of await rows.all()) out.push({ text: (await r.innerText()).replace(/\s+/g, ' ').trim(), received: r.locator('input').last() });
  return out;
}

/** Clicks an action that must be refused; true when `message` shows (a toast or a text of the form), with what was shown. */
export async function refusedWith(f: CssdForm, action: string, message: string): Promise<{ shown: boolean; texts: string[] }> {
  const texts = await f.act(action);
  const inForm = await f.main.getByText(message, { exact: false }).count();
  return { shown: texts.some((t) => t.includes(message)) || inForm > 0, texts };
}

/**
 * After "Save" a receipt stays on the new form; its actions are on the saved
 * document. When "Send for Approval" is not shown, the document is opened
 * from the list: the newest row that names `text` (its source request).
 * Returns false when the saved document does not open: its page does not load
 * and nginx answers "504 Gateway Time-out" (found blocker 48).
 */
export async function openSaved(f: CssdForm, text: string): Promise<boolean> {
  if (await f.button('Send for Approval').isVisible({ timeout: 4_000 }).catch(() => false)) return true;
  await gotoPatiently(f.page, `/id/cssd/${f.route}`);
  const row = f.main.getByRole('row').filter({ hasText: text }).first();
  await expect(row).toBeVisible();
  const open = row.getByRole('button', { name: 'Open' }).or(row.getByRole('link', { name: 'Open' })).first();
  const actions = f.button('Send for Approval').or(f.button('Approve')).first();
  // Under load the document opens slowly, and now and then the first click is lost.
  for (let i = 0; i < 2 && !(await actions.isVisible().catch(() => false)); i++) {
    if (await open.isVisible().catch(() => false)) await open.click();
    await actions.waitFor({ timeout: 30_000 }).catch(() => {});
  }
  if (await actions.isVisible().catch(() => false)) return true;
  // nginx "504 Gateway Time-out" until 2026-10-30; since 2026-10-31 the page itself reads "The operation was aborted due to timeout".
  const gateway =
    (await f.page.getByRole('heading', { name: /^50[234] / }).count()) > 0 ||
    (await asOnSite(() => f.main.getByText(/aborted due to timeout/i).count())) > 0;
  const onDocument = new RegExp(`/cssd/${f.route}/[0-9a-f-]{36}`).test(f.page.url());
  if (gateway || !onDocument) {
    await recovered(f.page);
    return false;
  }
  await expect(actions).toBeVisible();
  return true;
}

/**
 * An approved sterile request of the test and its unsterile receipt, sent and
 * approved: the set and the item are in the CSSD store, unsterile. Returns the
 * request number and its packing numbers; `stalled` when the saved receipt
 * does not open (found blocker 48).
 */
export async function approvedReceipt(page: Page, itemCode: string, batch: string): Promise<{ request: string; packs: string[]; stalled?: boolean }> {
  const r = await approvedRequest(page, itemCode, batch);
  const f = new CssdForm(page, 'receipts');
  await f.openNew();
  await convertFrom(f, r.no);
  await f.pickStore('CSSD Store', STORES.sterilizing.code);
  const lines = await conversionLines(f);
  for (const l of lines) await l.received.fill(l.text.match(/(\d+)\s+(\d+)\s*$/)?.[2] ?? '1');
  expect(await f.act('Save')).toContain('Receipt saved.');
  // The saved receipt does not open (found blocker 48): it cannot be sent or approved.
  if (!(await openSaved(f, r.no))) return { request: r.no, packs: r.packs, stalled: true };
  expect(await f.act('Send for Approval')).toContain('Sent for approval. Stock has not moved.');
  expect(await f.act('Approve')).toContain('Approved. Items and sets moved to the CSSD store, still unsterile.');
  return { request: r.no, packs: r.packs };
}

/** The new sterilization cycle form (/cssd/cycles/new). */
export class CycleForm extends CssdForm {
  constructor(page: Page) {
    super(page, 'receipts');
  }
  async openCycle(): Promise<void> {
    await gotoPatiently(this.page, '/id/cssd/cycles/new');
    await expect(this.main.getByRole('heading', { level: 1, name: 'New' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  /** "Sterile store of this branch" and "Save store"; returns the toasts. */
  async saveStore(code: string): Promise<string[]> {
    await this.pickStore('Sterile store of this branch', code).catch(async () => {
      // The list beside the type-ahead (it has no name of its own): the one offering the store.
      const list = this.main.locator('select').filter({ has: this.page.locator('option', { hasText: code }) }).first();
      await this.pick(list, code);
    });
    return this.act('Save store');
  }
  /** An input of the load by the text above it (the labels of the form are not tied to their inputs). */
  input(label: string): Locator {
    return this.main.locator(`xpath=.//*[normalize-space()="${label}"]/following-sibling::input[1]`).first();
  }
  /** The load: dates, batch, expiry, the packs (by packing number) and a quality check with a result. */
  async load(v: { packs: string[]; start?: string; end?: string; expiry?: string; result?: string }): Promise<{ results: string[]; chosen: boolean }> {
    const day = todayWib();
    await this.input('Start').fill(v.start ?? `${day}T08:00`);
    await this.input('End').fill(v.end ?? `${day}T09:00`);
    await this.input('Batch code').fill(`B-${day}`);
    await this.input('Expiry').fill(v.expiry ?? addDays(day, 30));
    for (const pk of v.packs) {
      await this.main.getByRole('textbox', { name: 'Packing number' }).last().fill(pk);
      await this.button('Add set').click();
    }
    if (v.result) {
      await this.button('Add check').click();
      const lists = this.main.locator('select');
      const n = await lists.count();
      // The check line: indicator type, test name, result (the last three lists of the form).
      for (let i = Math.max(0, n - 3); i < n - 1; i++) await lists.nth(i).selectOption({ index: 1 }, { timeout: 5_000 }).catch(() => {});
      const result = lists.nth(n - 1);
      const results = (await result.locator('option').allInnerTexts()).map((o) => o.trim());
      const chosen = await result.selectOption({ label: v.result }, { timeout: 5_000 }).then(() => true, () => false);
      return { results, chosen };
    }
    return { results: [], chosen: false };
  }
}

