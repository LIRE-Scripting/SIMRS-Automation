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
  await page.getByRole('combobox', { name: 'Visit' }).selectOption('Outpatient');
  const margin = page.getByRole('textbox', { name: 'Site margin' });
  const tax = page.getByRole('textbox', { name: 'Tax (%)' });
  if ((await margin.inputValue()) !== BILLING.itemPrice.margin || (await tax.inputValue()) !== BILLING.itemPrice.tax) {
    await page.getByRole('combobox', { name: 'Method' }).selectOption({ label: 'Cost plus margin' });
    await margin.fill(BILLING.itemPrice.margin);
    await tax.fill(BILLING.itemPrice.tax);
    // "Save price" answers HTTP 500 (found blocker 35); the price stays at cost with no tax.
    await c.button('Save price').click();
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
