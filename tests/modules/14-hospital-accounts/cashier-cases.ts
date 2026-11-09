import { asOnSite } from '../../../lib/i18n';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, SERVER_FAILURE } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { CashierPage, rupiah } from '../../../pages/billing/CashierPage';
import { patient, sell, stock } from '../05-pharmacy/helpers';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { counterClosed, ensureSettings, newRxInvoice, paidSale, pay, rxInvoices, sale, select } from './helpers';
import { TC_APP014_003, TC_APP014_005, TC_APP014_006, TC_APP014_008 } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of cashier.spec.ts, shared with the end-to-end chains (chain.run). */

/** The red box of the screen when it holds a server failure (HTTP 500 until 2026-10-30, a database error since), else ''. */
export async function serverError(c: CashierPage): Promise<string> {
  return (await c.error().allInnerTexts().catch(() => [])).find((t) => SERVER_FAILURE.test(t)) ?? '';
}

/** A refusal: the expected message, or the server-error toast recorded as a deviation. */
export async function refused(qa: Qa, step: number, c: CashierPage, message: string): Promise<void> {
  await expect(c.error()).toBeVisible();
  const text = (await c.error().allInnerTexts()).join(' / ');
  if (!text.includes(message)) qa.deviation(step, `Red message: "${message}"`, `toast "${text}"`);
}

/** An RX- invoice of a pharmacy sale made by this test (the new RX- invoice of the cashier search). */
export async function rxSale(page: Page, qa: Qa, line: { requested?: string; issued?: string; discount?: string }): Promise<{ rx: string; pt: { mrn: string; fullName: string } }> {
  await stock(page, qa);
  const pt = await patient(page, qa);
  const before = await rxInvoices(page);
  expect(await sell(page, pt, [{ item: PHARMACY.para, ...line }])).toContain('Dispense confirmed — issue lines saved.');
  return { rx: await newRxInvoice(page, before), pt };
}

export async function rxInvoice(page: Page, qa: Qa, line: { requested?: string; issued?: string; discount?: string }): Promise<string> {
  return (await rxSale(page, qa, line)).rx;
}

export const TC_APP014_001: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  let invoice = '';
  let cashBefore = 0;

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Hospital Accounts\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Fast Cashier' }).first().click();
    await expect(c.heading).toBeVisible();
    for (const l of ['Available', 'Amount due'] as const) expect(await c.barValue(l)).toBe('Rp 0');
    await expect(c.bar).toContainText('No invoice selected');
    await expect(page.getByText('Select or create a charge first.')).toBeVisible();
    // System cash is filled in after the screen loads.
    await expect.poll(() => c.systemCash(), { timeout: 5_000 }).toBeGreaterThan(0).catch(() => {});
    cashBefore = await c.systemCash();
  });

  await qa.step(2, async () => {
    await c.charge.fill('150000');
    await c.remark.fill('QA walk-in');
    await c.button('Create charge').click();
    await expect(c.bar).toContainText(/Draft\s*INV-/);
    invoice = (await c.barState()).invoice;
    expect(await c.barValue('Amount due')).toBe('Rp 166.500');
  });

  await qa.step(3, async () => {
    expect(await c.lines()).toEqual({ Gross: 'Rp 150.000', Discount: 'Rp 0', Tax: 'Rp 16.500', 'Patient net': 'Rp 166.500' });
    await expect(c.field('Cash amount (IDR)')).toHaveValue('166500');
    await expect(c.tender()).toHaveValue(/cash/i);
  });

  await qa.step(4, async () => {
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect([await c.barValue('Amount due'), await c.barValue('Deposits')]).toEqual(['Rp 0', 'Rp 166.500']);
  });

  await qa.step(5, async () => {
    expect(await c.receiptValue('Invoice')).toBe(invoice);
    expect((await c.receiptValue('Tender')).toUpperCase()).toBe('CASH');
    expect(await c.receiptValue('Paid')).toBe('Rp 166.500');
    expect(await c.receiptValue('Remaining due')).toBe('Rp 0');
    expect(await c.receiptValue('Status')).toBe('PAID');
  });

  await qa.step(6, async () => {
    await expect.poll(() => c.systemCash()).toBe(cashBefore + 166500);
  });

  await qa.step(7, async () => {
    await c.button('New sale').click();
    await expect(c.bar).toContainText('No invoice selected');
    await expect(c.search).toBeFocused();
  });
};

export const TC_APP014_002: QaBody = async ({ page, qa }) => {
  const rx = await rxInvoice(page, qa, { requested: '10', issued: '10' });
  qa.note(1, `RX invoice of a pharmacy sale of this test: ${rx}`);
  let c = await select(page, rx);
  const due = await c.barValue('Amount due');
  // Priced with the outpatient item price of the catalogue (margin 25 %, tax 11 %), saved since 2026-10-31 (was found blocker 35).
  await qa.step(1, async () => {
    expect((await c.barState()).status).toBe('Draft');
    expect(due).toBe('Rp 13.875');
  });
  await qa.step(2, async () => {
    const lines = await c.lines();
    qa.note(2, `lines ${JSON.stringify(lines)}`);
    expect([lines.Gross, lines.Tax, lines['Patient net']]).toEqual(['Rp 12.500', 'Rp 1.375', 'Rp 13.875']);
  });

  await qa.step(3, async () => {
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.receiptValue('Paid')).toBe(due);
  });
  await qa.step(4, async () => {
    c = await select(page, rx);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.barValue('Amount due')).toBe('Rp 0');
  });
};

export const TC_APP014_004: QaBody = async ({ page, qa }) => {
  const invoice = await sale(page);
  const c = new CashierPage(page);
  await c.field('Deposits').fill('166500');
  await c.button('Take deposit').click();
  await expect.poll(() => c.barValue('Deposits')).toBe('Rp 166.500');
  const cash0 = await c.systemCash();

  await qa.step(1, async () => {
    await select(page, invoice);
    expect([await c.barValue('Available'), await c.barValue('Amount due')]).toEqual(['Rp 166.500', 'Rp 0']);
    expect((await c.barState()).status).toBe('Draft');
    await expect(c.field('Cash amount (IDR)')).toHaveValue('0');
  });
  let paid = true;
  await qa.step(2, async () => {
    await pay(page);
    const failure = await serverError(c);
    if (failure) {
      paid = false;
      qa.note(2, `"Pay" with cash 0: red box "${failure}" (found blocker 56); the sale stays Draft`);
      return qa.blocked(2, 56);
    }
    expect((await c.barState()).status).toBe('Paid');
    expect([await c.receiptValue('Paid'), await c.receiptValue('Remaining due'), await c.receiptValue('Status')]).toEqual(['Rp 0', 'Rp 0', 'PAID']);
  });
  if (paid) expect(await c.systemCash()).toBe(cash0);
};

export const TC_APP014_010: QaBody = async ({ page, qa }) => {
  const invoice = await paidSale(page);
  const c = new CashierPage(page);
  await select(page, invoice);

  await qa.step(1, async () => {
    await c.button('Reopen sale').click();
    await expect.poll(async () => (await c.barState()).status).toBe('Draft');
    expect([await c.barValue('Available'), await c.barValue('Amount due')]).toEqual(['Rp 166.500', 'Rp 0']);
  });
  await qa.step(2, async () => {
    await c.field('Discount (IDR)').fill('20000');
    await c.button('Apply discount').click();
    await expect.poll(async () => (await c.lines())['Patient net']).toBe('Rp 144.300');
    expect([await c.barValue('Available'), await c.barValue('Amount due')]).toEqual(['Rp 166.500', 'Rp 0']);
  });
  let paid = true;
  await qa.step(3, async () => {
    await pay(page, '0');
    const failure = await serverError(c);
    if (failure) {
      paid = false;
      qa.note(3, `"Pay" with cash 0: red box "${failure}" (found blocker 56); the sale stays Draft`);
      return qa.blocked(3, 56);
    }
    expect((await c.barState()).status).toBe('Paid');
  });
  if (!paid) return qa.blocked(4, 56);
  await qa.step(4, async () => {
    await c.field('Refund (IDR)').fill('22200');
    await c.button('Refund payment').click();
    await expect.poll(() => c.barValue('Available')).toBe('Rp 144.300');
    expect(await c.barValue('Amount due')).toBe('Rp 0');
    expect((await c.barState()).status).toBe('Paid');
  });
};

export const TC_APP014_017: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.open();
    await c.button('Insurance / BPJS').click();
    await expect(page.getByRole('region', { name: 'Insurance / BPJS' })).toBeVisible();
  });
  await qa.step(2, async () => {
    const panel = page.getByRole('region', { name: 'Insurance / BPJS' });
    await panel.getByRole('textbox', { name: 'Patient share (%)' }).fill('20');
    await panel.getByRole('textbox', { name: 'Sponsor share (%)' }).fill('80');
    await panel.getByRole('button', { name: 'Save shares' }).click();
    await c.charge.fill('5000000');
    await c.button('Create charge').click();
    await expect(c.bar).toContainText(/Draft\s*INV-/);
    const text = (await panel.innerText()).replace(/\s+/g, ' ');
    qa.note(2, `panel: ${text.slice(-200)}`);
    if (!text.includes('Rp 1.000.000 / Rp 4.000.000')) qa.deviation(2, 'Panel line "This charge uses that split: Rp 1.000.000 / Rp 4.000.000"', 'no split line');
  });
  for (const s of [3, 4, 5, 6, 7, 8, 9]) qa.blocked(s, 33);
};

export const TC_APP014_019: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  let invoice = '';
  await qa.step(1, async () => {
    await c.open();
    await expect(c.search).toBeFocused();
    await expect(page.getByText('Keys: F2 lookup · F3 walk-in amount · F4 pay · Esc new sale', { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await page.keyboard.press('F3');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('150000');
    await page.keyboard.press('Enter');
    await expect(c.bar).toContainText(/Draft\s*INV-/);
    invoice = (await c.barState()).invoice;
    const focused = await c.field('Cash amount (IDR)').evaluate((e) => e === document.activeElement);
    if (!focused) qa.deviation(2, 'The cursor moves to the cash amount', `the cursor is in "${await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.id ?? document.activeElement?.tagName)}"`);
  });
  await qa.step(3, async () => {
    await page.keyboard.press('F4');
    await expect.poll(async () => (await c.barState()).status).toBe('Paid');
    await expect(c.receipt().getByRole('term').first()).toBeVisible();
  });
  await qa.step(4, async () => {
    await page.keyboard.press('Escape');
    await expect(c.bar).toContainText('No invoice selected');
    await expect(c.search).toBeFocused();
  });
  await qa.step(5, async () => {
    await page.keyboard.press('F2');
    await page.keyboard.type(invoice);
    await page.keyboard.press('Enter');
    await expect(c.bar).toContainText(invoice);
    expect((await c.barState()).status).toBe('Paid');
  });
};

export const TC_APP014_021: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Hospital Accounts\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Hospital Accounts$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Hospital Accounts' })).toBeVisible();
    await expect(main.getByText('Invoice, deposit & Fast Cashier', { exact: true })).toBeVisible();
    for (const t of ['Fast Cashier', 'Insurance / BPJS']) await expect(main.getByRole('link', { name: t, exact: true }).first()).toBeVisible();
  });
  await qa.step(2, async () => {
    for (const t of ['Fast Cashier', 'Insurance / BPJS']) {
      await page.goto('/id/billing');
      await main.getByRole('link', { name: t, exact: true }).last().click();
      await expect(c.heading).toBeVisible();
    }
    await page.getByRole('navigation', { name: 'Billing' }).getByRole('link', { name: 'Fast Cashier' }).click();
    await expect(c.heading).toBeVisible();
  });
  await qa.step(3, () => asOnSite(async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/billing/cashier');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const pay = (await page.getByRole('heading', { level: 2 }).allInnerTexts()).join(', ');
    qa.note(3, `heading "${h1}"; sections ${pay}`);
    if (/1\. Charge lookup|2\. Payment/.test(pay)) qa.deviation(3, 'Headings, field names, buttons and messages are Indonesian', `English sections: ${pay}`);
  }));
  await qa.step(4, async () => {
    const id = new CashierPage(page);
    // In Indonesian the labels differ: the walk-in form is the first input and button after its heading.
    const walkIn = page.getByRole('heading', { level: 3 });
    await walkIn.locator('xpath=following::input[1]').fill('150000');
    await walkIn.locator('xpath=following::button[1]').click();
    await expect(id.bar).toContainText(/166\.500/);
  });
};

export const TC_APP014_022: QaBody = async ({ page, qa }) => {
  await sale(page);
  const c = new CashierPage(page);
  const cash0 = await c.systemCash();
  await qa.step(1, async () => {
    await c.field('Cash amount (IDR)').fill('100000');
    await c.button('Pay').click();
    await refused(qa, 1, c, 'payment does not settle the sale; take a deposit instead');
  });
  await qa.step(2, async () => {
    expect((await c.barState()).status).toBe('Draft');
    expect([await c.barValue('Amount due'), await c.barValue('Deposits')]).toEqual(['Rp 166.500', 'Rp 0']);
    await expect(c.receipt().getByRole('term')).toHaveCount(0);
  });
  expect(await c.systemCash()).toBe(cash0);
};

export const TC_APP014_023: QaBody = async ({ page, qa }) => {
  await sale(page);
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await pay(page, '200000');
    const status = (await c.barState()).status;
    const change = await page.getByText(/change/i).count();
    qa.note(1, `status ${status}; Deposits ${await c.barValue('Deposits')}; Available ${await c.barValue('Available')}`);
    if (status === 'Paid' && !change) qa.deviation(1, 'The cashier is told that change of 33,500 is due, or the excess is refused', `accepted: Deposits ${await c.barValue('Deposits')}, no change shown`);
  });
};

export const TC_APP014_024: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.open();
    await c.charge.fill('150.000');
    await c.button('Create charge').click();
    await expect(c.bar).toContainText(/Draft\s*INV-/);
    const gross = (await c.lines()).Gross;
    if (gross !== 'Rp 150.000') qa.deviation(1, 'A sale of Rp 150.000 before tax', `a sale of ${gross}: the dot is read as a decimal point`);
  });
};

export const TC_APP014_025: QaBody = async ({ page, qa }) => {
  await sale(page);
  const c = new CashierPage(page);
  await c.tender().selectOption({ label: 'Card' });
  await qa.step(1, async () => {
    await c.button('Pay').click();
    await refused(qa, 1, c, 'card and UPI need an EDC terminal response');
  });
  await qa.step(2, async () => {
    await c.field('EDC terminal').fill('QA-EDC-01');
    await c.button('Pay').click();
    await refused(qa, 2, c, 'card and UPI need an EDC terminal response');
  });
  await qa.step(3, async () => {
    expect((await c.barState()).status).toBe('Draft');
    expect(await c.barValue('Deposits')).toBe('Rp 0');
  });
};

export const TC_APP014_027: QaBody = async ({ page, qa }) => {
  await sale(page);
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.field('Discount (IDR)').fill('200000');
    await c.button('Apply discount').click();
    await refused(qa, 1, c, 'discount cannot exceed the charge');
  });
  await qa.step(2, async () => {
    const l = await c.lines();
    expect([l.Discount, l['Patient net']]).toEqual(['Rp 0', 'Rp 166.500']);
  });
};

export const TC_APP014_030: QaBody = async ({ page, qa }) => {
  const invoice = await paidSale(page);
  const c = await select(page, invoice);
  const cash0 = await c.systemCash();
  await qa.step(1, async () => {
    await c.field('Refund (IDR)').fill('200000');
    await c.button('Refund payment').click();
    await refused(qa, 1, c, 'refund exceeds the deposit balance');
  });
  await qa.step(2, async () => {
    expect([await c.barValue('Deposits'), (await c.barState()).status]).toEqual(['Rp 166.500', 'Paid']);
    expect(await c.systemCash()).toBe(cash0);
  });
};

export const TC_APP014_031: QaBody = async ({ page, qa }) => {
  const invoice = await sale(page);
  const c = new CashierPage(page);
  await c.tender().selectOption({ label: 'Card' });
  await c.field('EDC terminal').fill('QA-EDC-01');
  await c.field('EDC approval').fill('123456');
  await pay(page);
  await select(page, invoice);
  const cash0 = await c.systemCash();
  await qa.step(1, async () => {
    await c.field('Refund (IDR)').fill('50000');
    await c.button('Refund payment').click();
    await expect.poll(() => c.barValue('Available')).toBe('Rp 116.500');
  });
  await qa.step(2, async () => {
    const cash = await c.systemCash();
    if (cash !== cash0) qa.deviation(2, 'System cash unchanged: no cash was taken for this sale', `System cash fell by ${cash0 - cash}`);
  });
};

export const TC_APP014_033: QaBody = async ({ page, qa }) => {
  // The RX invoice is priced with the item price of the catalogue (tax 11 %), saved since 2026-10-31 (was found blocker 35).
  const rx = await rxInvoice(page, qa, { requested: '10', issued: '10' });
  qa.note(1, `RX invoice of a pharmacy sale of 10: ${rx}`);
  const c = await select(page, rx);
  qa.note(1, `before the discount: ${JSON.stringify(await c.lines())}`);
  await qa.step(1, async () => {
    await c.field('Discount (IDR)').fill('500');
    await c.button('Apply discount').click();
    await expect.poll(async () => (await c.lines()).Discount).toBe('Rp 500');
    const lines = await c.lines();
    qa.note(1, `after a discount of 500: ${JSON.stringify(lines)}`);
    if (lines.Tax !== 'Rp 1.320' || lines['Patient net'] !== 'Rp 13.320') {
      qa.deviation(1, 'Discount Rp 500, Tax Rp 1.320 (11% of 12,000), Patient net Rp 13.320', `Tax ${lines.Tax}, Patient net ${lines['Patient net']}`);
    }
  });
};

export const TC_APP014_034: QaBody = async ({ page, qa }) => {
  const rx = await rxInvoice(page, qa, { requested: '10', issued: '10', discount: '10' });
  qa.note(1, `RX invoice of a pharmacy sale of 10 with a 10% discount: ${rx}`);
  let c: CashierPage;
  await qa.step(1, async () => {
    c = await select(page, rx);
    const due = await c.barValue('Amount due');
    qa.note(1, `Amount due ${due}`);
    if (due !== 'Rp 12.487,50' && due !== 'Rp 12.488') qa.deviation(1, 'Amount due shown to the cent, or rounded by the branch rule', due);
  });
  await qa.step(2, async () => {
    const cash = await c.field('Cash amount (IDR)').inputValue();
    await pay(page);
    const paid = await c.receiptValue('Paid');
    qa.note(2, `Cash amount ${cash}; receipt Paid ${paid}`);
    if (rupiah(paid) !== 12487.5) qa.deviation(2, 'The amount collected equals the amount due (12,487.50)', `collected ${paid} (prefilled ${cash})`);
  });
};

export const TC_APP014_035: QaBody = async ({ page, qa }) => {
  const { rx, pt } = await rxSale(page, qa, {});
  const c = new CashierPage(page);
  qa.note(1, `PT-1 "${pt.fullName}" (${pt.mrn}) bought medicine (${rx})`);
  for (const [step, term] of [[1, pt.fullName], [2, pt.mrn]] as const) {
    await qa.step(step, async () => {
      await c.open();
      await c.search.fill(term);
      await c.button('Search').click();
      const none = await page.getByText('No invoices match.').isVisible({ timeout: 5_000 }).catch(() => false);
      if (none) qa.deviation(step, "The patient's open bills are listed", '"No invoices match."');
      else qa.note(step, `result: ${(await c.bar.innerText()).replace(/\s+/g, ' ')}`);
    });
  }
};

export const TC_APP014_040: QaBody = async ({ page, qa }) => {
  const invoice = await paidSale(page);
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    for (const t of ['Invoice', 'Tender', 'Paid', 'Remaining due', 'Status'] as const) expect(await c.receiptValue(t)).not.toBe('');
  });
  await qa.step(2, async () => {
    if (!(await c.receipt().getByRole('button', { name: /print|download/i }).count())) qa.deviation(2, 'A Print button or a printable page', 'no print or download control');
  });
  await qa.step(3, async () => {
    await c.button('New sale').click();
    await select(page, invoice);
    if (!(await c.receipt().getByRole('term').count())) qa.deviation(3, 'The receipt can be shown again', 'the receipt is not shown when the paid sale is found again');
  });
};

export const TC_APP014_041: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  const panel = page.getByRole('region', { name: 'Insurance / BPJS' });
  await c.open();
  await c.button('Insurance / BPJS').click();
  await qa.step(1, async () => {
    await panel.getByRole('textbox', { name: 'Patient / pre-auth' }).fill(BILLING.none.name);
    await panel.getByRole('button', { name: 'Check eligibility' }).click();
    await expect(panel.getByText(/Eligible/)).toHaveCount(0);
    qa.note(1, `the panel reads: ${(await panel.innerText()).replace(/\s+/g, ' ').slice(-160)}`);
  });
  await qa.step(2, async () => {
    const submit = panel.getByRole('button', { name: 'Submit claim' });
    if (await submit.count()) {
      await panel.getByRole('textbox', { name: 'CBG code' }).fill('M-1-10-I');
      await submit.click();
      await refused(qa, 2, c, 'Claim submit failed (need eligible pre-auth).');
    } else qa.note(2, '"Submit claim" is not offered without an eligible pre-authorisation');
  });
  for (const s of [3, 4, 5]) qa.blocked(s, 33);
};

export const TC_APP014_043: QaBody = async ({ page, qa }) => {
  const invoice = await sale(page, '5000000');
  const c = new CashierPage(page);
  const panel = page.getByRole('region', { name: 'Insurance / BPJS' });
  await qa.step(1, async () => {
    await c.open();
    await c.button('Insurance / BPJS').click();
    await select(page, invoice);
    expect(await c.barValue('Amount due')).toBe('Rp 5.550.000');
  });
  await qa.step(2, async () => {
    await c.button('Insurance / BPJS').click().catch(() => {});
    const text = (await panel.innerText()).replace(/\s+/g, ' ');
    const split = text.match(/This charge uses that split: (Rp [\d.]+ \/ Rp [\d.]+)/)?.[1] ?? '';
    qa.note(2, `split line: "${split}" (shares ${await panel.getByRole('textbox', { name: 'Patient share (%)' }).inputValue()} / ${await panel.getByRole('textbox', { name: 'Sponsor share (%)' }).inputValue()})`);
    if (split && split !== 'Rp 1.000.000 / Rp 4.000.000') qa.deviation(2, 'Rp 1.000.000 / Rp 4.000.000', `"${split}" (taken from the walk-in "Charge (IDR)" field)`);
  });
  qa.blocked(3, 33);
};

export const TC_APP014_046: QaBody = async ({ page, qa }) => {
  const c = new CashierPage(page);
  const panel = page.getByRole('region', { name: 'Insurance / BPJS' });
  await c.open();
  await c.button('Insurance / BPJS').click();
  const buttons = (await panel.getByRole('button').allInnerTexts()).map((b) => b.trim());
  qa.note(1, `panel buttons: ${buttons.join(', ')}`);
  await qa.step(1, async () => {
    if (!buttons.some((b) => /pre-?auth|request/i.test(b))) qa.deviation(1, 'A form or button to request a pre-authorisation', 'none: the panel only searches existing ones');
  });
  await qa.step(2, async () => {
    if (!buttons.some((b) => /referral|add sep/i.test(b))) qa.deviation(2, 'A form or button to add the referral and its SEP number', 'none: "Check SEP" checks an existing one');
  });
};

export const TC_APP014_052: QaBody = async ({ page, qa }) => {
  const invoice = await sale(page);
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.field('Deposits').fill('50000');
    await c.field('Deposits').press('Escape');
    if ((await c.bar.innerText()).includes('No invoice selected')) qa.deviation(1, 'The screen keeps the sale, or asks before clearing', 'Esc clears the whole screen at once, with no question');
  });
  await qa.step(2, async () => {
    await select(page, invoice);
    const cash0 = await c.systemCash();
    await c.button('Pay').dblclick();
    await expect.poll(async () => (await c.barState()).status).toBe('Paid');
    await expect.poll(() => c.systemCash()).toBe(cash0 + 166500);
  });
  qa.notRun(3, 'signing out in a second tab would end the shared U1 session of the suite (Q19); the session end is covered by TC-APP005-050');
  qa.notRun(4, 'see step 3');
};
