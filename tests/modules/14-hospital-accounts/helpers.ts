import { expect, type Locator, type Page } from '@playwright/test';
import { BILLING } from '../../../lib/billing-data';
import { CashierPage } from '../../../pages/billing/CashierPage';

/**
 * Shared steps of 14-hospital-accounts.xlsx. Each test makes its own walk-in
 * sales; "Counter settings BR-A" and the outpatient item price of 05 are set
 * once before the cashier tests (they are settings of the branch).
 */

let settingsChecked = false;

/** Counter settings BR-A and the outpatient item price (margin 25%, tax 11%) of the catalogue. */
export async function ensureSettings(page: Page): Promise<void> {
  if (settingsChecked) return;
  const c = new CashierPage(page);
  await c.open();
  let changed = false;
  for (const [label, value] of Object.entries(BILLING.counter)) {
    const f = page.getByRole('textbox', { name: label === 'Rounding' ? /^Rounding/ : label, exact: label !== 'Rounding' });
    if ((await f.inputValue()) !== value) {
      await f.fill(value);
      changed = true;
    }
  }
  if (changed) {
    await c.button('Save settings').click();
    await expect(page.getByRole('textbox', { name: 'Tax rate (%)' })).toHaveValue(BILLING.counter['Tax rate (%)']);
  }
  const now = await readItemPrice(page);
  if (now.method !== 'cost_plus' || now.margin !== marginOnSite(BILLING.itemPrice.margin) || now.tax !== BILLING.itemPrice.tax) {
    await saveItemPrice(page, { method: 'Cost plus margin', margin: BILLING.itemPrice.margin, tax: BILLING.itemPrice.tax });
  }
  await c.open();
  await expect(page.getByRole('textbox', { name: 'Discount cap (IDR)' })).toHaveValue(BILLING.counter['Discount cap (IDR)']);
  settingsChecked = true;
}

/** True when the U1 cashier's day is already closed (no money can be taken today). */
export async function counterClosed(page: Page): Promise<boolean> {
  const c = new CashierPage(page);
  await c.open();
  return c.closedBanner().isVisible();
}

/** A walk-in sale; returns its invoice number (the bar shows "Draft INV-…"). */
export async function sale(page: Page, amount = '150000', remark = 'QA walk-in'): Promise<string> {
  const c = new CashierPage(page);
  await c.open();
  await c.charge.fill(amount);
  await c.remark.fill(remark);
  await c.button('Create charge').click();
  await expect(c.bar).toContainText(/Draft\s*(INV|RX)-/);
  return (await c.barState()).invoice;
}

/** Finds a sale by its number and selects it. */
export async function select(page: Page, invoice: string): Promise<CashierPage> {
  const c = new CashierPage(page);
  await c.open();
  await c.search.fill(invoice);
  await c.button('Search').click();
  await expect(c.bar).toContainText(invoice);
  return c;
}

/** Clicks Pay and waits until the bar or an error answers. */
export async function pay(page: Page, cash?: string): Promise<void> {
  const c = new CashierPage(page);
  if (cash !== undefined) await c.field('Cash amount (IDR)').fill(cash);
  await c.button('Pay').click();
  await expect.poll(async () => /Paid\s*(INV|RX)-/.test(await c.bar.innerText()) || (await c.error().count()) > 0, { timeout: 10_000 }).toBe(true).catch(() => {});
}

/** A walk-in sale of 150,000 paid in cash; returns its number. */
export async function paidSale(page: Page, amount = '150000'): Promise<string> {
  const invoice = await sale(page, amount);
  await pay(page);
  await expect(new CashierPage(page).bar).toContainText(new RegExp(`Paid\\s*${invoice}`));
  return invoice;
}

/**
 * Every RX- invoice the cashier search offers (the pharmacist's screen does
 * not show the number of a sale). The list of hits is capped: a prefix whose
 * list is full is split into its 16 longer prefixes.
 */
/**
 * The newest RX- invoices: the cashier search for "RX-" lists the 20 newest
 * first (seen 2026-10-30). Read before and after a sale, the one new number
 * is the sale's invoice. (Walking every prefix of the numbers took thousands
 * of searches once the site held a few thousand RX- invoices.)
 */
export async function rxInvoices(page: Page): Promise<Set<string>> {
  const c = new CashierPage(page);
  await c.open();
  await c.search.fill('RX-');
  await c.button('Search').click();
  const hits = page.getByRole('listbox').getByRole('button');
  await hits.first().waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  return new Set((await hits.allInnerTexts()).map((t) => t.match(/RX-[0-9a-f]{8}/)?.[0]).filter((x): x is string => !!x));
}

/** The one RX- invoice the cashier search offers now and did not offer `before` (a sale made in between). */
export async function newRxInvoice(page: Page, before: Set<string>): Promise<string> {
  const added = [...(await rxInvoices(page))].filter((x) => !before.has(x));
  expect(added, 'one new RX- invoice in the cashier search').toHaveLength(1);
  return added[0];
}

/** The "Dispense discounts" panel of Fast Cashier and its waiting rows (each with "Approve" and "Reject"). */
export async function holds(page: Page): Promise<{ panel: Locator; rows: Locator }> {
  await new CashierPage(page).open();
  const panel = page.getByRole('heading', { name: 'Dispense discounts' }).locator('xpath=..');
  const rows = panel.locator('xpath=.//*[.//button[normalize-space()="Approve" or normalize-space()="Setujui"] and .//button[normalize-space()="Reject" or normalize-space()="Tolak"]][not(.//*[.//button[normalize-space()="Approve" or normalize-space()="Setujui"] and .//button[normalize-space()="Reject" or normalize-space()="Tolak"]])]');
  return { panel, rows };
}

/**
 * "Site margin" of Item price takes a fraction (0.25 for 25 %) while "Tax (%)" takes a percentage: a margin of 25
 * is not saved, without a message (seen 2026-10-31; until 2026-10-30 every "Save price" answered HTTP 500, found
 * blocker 35). The workbook's percentages are typed as fractions.
 */
export const marginOnSite = (percent: string): string => String(Number(percent) / 100);

/** The card "Item price" of Fast Cashier. */
export const itemPriceCard = (page: Page): Locator => page.getByRole('heading', { name: 'Item price' }).locator('xpath=../..');

export interface ItemPrice {
  method?: 'Cost plus margin' | 'Sales price list';
  /** Site margin in percent, as the workbook gives it. */
  margin?: string;
  tax?: string;
  salesPrices?: { item: string; price: string }[];
}

export interface SavedItemPrice {
  method: string;
  margin: string;
  tax: string;
  /** Item codes of the sales prices. */
  salesPrices: string[];
}

/** The outpatient item price of the branch as saved: method value ("cost_plus" or "list"), margin as on the site, tax in percent. */
export async function readItemPrice(page: Page): Promise<SavedItemPrice> {
  await new CashierPage(page).open();
  await page.getByRole('combobox', { name: 'Visit' }).selectOption('Outpatient');
  const margin = page.getByRole('textbox', { name: 'Site margin' });
  // The values of the visit load after the choice.
  await page.waitForLoadState('networkidle').catch(() => {});
  return {
    method: await page.getByRole('combobox', { name: 'Method' }).inputValue(),
    margin: await margin.inputValue(),
    tax: await page.getByRole('textbox', { name: 'Tax (%)' }).inputValue(),
    salesPrices: (await itemPriceCard(page).getByRole('combobox', { name: 'Item code' }).evaluateAll((es) => es.map((e) => (e as HTMLInputElement).value))).map((v) => v.split(' · ')[0].trim()),
  };
}

/** Sets the outpatient item price of the branch, clicks "Save price" and returns the values read back after reopening. */
export async function saveItemPrice(page: Page, v: ItemPrice): Promise<SavedItemPrice> {
  await readItemPrice(page);
  const card = itemPriceCard(page);
  if (v.method) await page.getByRole('combobox', { name: 'Method' }).selectOption({ label: v.method });
  if (v.margin !== undefined) await page.getByRole('textbox', { name: 'Site margin' }).fill(marginOnSite(v.margin));
  if (v.tax !== undefined) await page.getByRole('textbox', { name: 'Tax (%)' }).fill(v.tax);
  for (const sp of v.salesPrices ?? []) {
    await card.getByRole('button', { name: 'Add sales price' }).click();
    const code = card.getByRole('combobox', { name: 'Item code' }).last();
    const list = page.locator(`#${await code.getAttribute('aria-controls')}`);
    await code.fill(sp.item);
    // Options read "<code> · <name>"; a longer code may start with the same text.
    await list.getByRole('option').filter({ hasText: `${sp.item} · ` }).first().getByRole('button').click();
    await card.getByRole('textbox', { name: 'Unit price' }).last().fill(sp.price);
  }
  await new CashierPage(page).button('Save price').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  return readItemPrice(page);
}

