import type { Locator, Page } from '@playwright/test';
import { toastsSince, toastMark } from '../../../lib/assertions';
import { registerPatient } from '../../../lib/ambulatory-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { todayWib } from '../../../lib/dates';
import { PHARMACY, stockOf, total } from '../../../lib/pharmacy-data';
import { test, expect } from '../../../fixtures/e2e';
import { select, sale, pay, paidSale, ensureSettings, counterClosed } from './helpers';
import { rupiah, CashierPage } from '../../../pages/billing/CashierPage';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 14-hospital-accounts that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP014_053 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const t = tariffs(page);
  const group = qa.code('X-UMUM');
  const name = qa.name('X Umum');
  const service = qa.code('X-VISITE');

  await qa.step(1, async () => {
    await page.goto('/id/billing/cashier');
    await page.getByRole('navigation', { name: 'Billing' }).getByRole('link', { name: 'Tarif' }).click();
    await expect(t.main.getByRole('heading', { level: 1, name: 'Tariff group' })).toBeVisible();
    await expect(t.main.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await expect(t.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await t.openDialog();
    for (const f of ['Group / plan code', 'Name / destination', 'Service', 'Amount']) await expect(t.input(f)).toBeVisible();
    await expect(t.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Tariff group', 'Service price']);
    await expect(t.dialog.getByRole('button', { name: 'Close' }).last()).toBeVisible();
  });
  await qa.step(3, async () => {
    expect(await t.fillAndSave({ 'Group / plan code': group, 'Name / destination': name }, 'Tariff group')).toContain('Saved.');
    await expect(t.dialog).toBeHidden();
    await t.open();
    await t.main.getByRole('textbox', { name: 'Search' }).fill(group);
    const c = await t.cells(t.row(group).first());
    expect(c[0]).toBe('active');
    expect(c[1]).toBe(`${group} ${name}`);
    expect(c[2]).toMatch(/^[0-9a-f-]{36}$/);
  });
  await qa.step(4, async () => {
    expect(await t.save({ 'Group / plan code': group, Service: service, Amount: '150000' }, 'Service price')).toContain('Saved.');
    await t.open();
    // The list shows a limited number of rows; the search box narrows it to the service.
    await t.main.getByRole('textbox', { name: 'Search' }).fill(service);
    await expect(t.row(service)).toHaveCount(1);
    expect(await t.cells(t.row(service))).toEqual(['priced', `${service} 150000`, group, '']);
  });
  await qa.step(5, async () => {
    expect(await t.save({ 'Group / plan code': group, Service: service, Amount: '175000' }, 'Service price')).toContain('Saved.');
    await t.open();
    await t.main.getByRole('textbox', { name: 'Search' }).fill(service);
    await expect(t.row(service)).toHaveCount(1);
    expect((await t.cells(t.row(service)))[1]).toBe(`${service} 175000`);
  });
  await qa.step(6, async () => {
    await t.main.getByRole('textbox', { name: 'Search' }).fill(group);
    await expect.poll(async () => (await t.rows().allInnerTexts()).every((r) => r.includes(group))).toBe(true);
  });
};

export const TC_APP014_057 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const pl = plans(page);
  const pt = await patientWithId(page, qa);
  const code = qa.code('X-BPJS-K1');
  const sponsor = qa.code('X-BPJS');

  await qa.step(1, async () => {
    await page.goto('/id/billing/cashier');
    await page.getByRole('navigation', { name: 'Billing' }).getByRole('link', { name: 'Rencana' }).click();
    await expect(pl.main.getByRole('heading', { level: 1, name: 'Patient plan' })).toBeVisible();
    await expect(pl.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await pl.openDialog();
    for (const f of ['Group / plan code', 'Name / destination', 'Patient / source']) await expect(pl.input(f)).toBeVisible();
    await expect(pl.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Plan', 'Check eligibility']);
  });
  await qa.step(3, async () => {
    expect(await pl.fillAndSave({ 'Group / plan code': code, 'Name / destination': sponsor, 'Patient / source': pt.id }, 'Plan')).toContain('Saved.');
    await pl.open();
    if (!(await pl.row(code).first().waitFor({ timeout: 10_000 }).then(() => true, () => false))) {
      // The list shows its first 21 plans with no paging or search (found blocker 40): the new plan is not there to be read.
      qa.note(3, `the plan ${code} is saved but not among the ${(await pl.rows().count())} rows the list shows`);
      return qa.blocked(3, 40);
    }
    const c = await pl.cells(pl.row(code));
    expect(c[0]).toBe('active');
    expect(c[1]).toBe(`${code} ${sponsor}`);
    expect(c.join(' ')).not.toContain(pt.name);
  });
  await qa.step(4, async () => {
    await pl.open();
    await pl.openDialog();
    const f = pl.input('Patient / source');
    if (!(await f.getAttribute('aria-controls'))) qa.note(4, '"Patient / source" offers no search; the id must be copied from elsewhere');
  });
  await qa.step(5, async () => {
    const toasts = await pl.save({ 'Patient / source': pt.id }, 'Check eligibility');
    qa.note(5, `the test patient has a plan but no approved pre-authorisation (none can be made on a screen, found blocker 33): "${toasts.join(' / ')}"`);
  });
};

export const TC_APP014_061 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const invoice = qa.code('X-RI-0001');

  await qa.step(1, async () => {
    await page.goto('/id/billing/cashier');
    await page.getByRole('navigation', { name: 'Billing' }).getByRole('link', { name: 'Buku pasien' }).click();
    await expect(l.main.getByRole('heading', { level: 1, name: 'Patient ledger' })).toBeVisible();
    await expect(l.main.getByText('Tax and discount stay on the cashier. Sponsor and BPJS claims stay on the cashier insurance panel.', { exact: true })).toBeVisible();
    await expect(l.main.getByRole('textbox', { name: 'Find patient' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await l.openDialog();
    await expect(l.dialog.getByRole('list', { name: 'Wizard steps' }).getByRole('listitem')).toHaveText([/Details/, /Review/]);
    for (const f of ['Invoice number', 'Group / plan code', 'Service', 'Patient / source']) await expect(l.input(f)).toBeVisible();
  });
  await qa.step(3, async () => {
    for (const [k, v] of Object.entries({ 'Invoice number': invoice, 'Group / plan code': group, Service: service, 'Patient / source': pt.id })) await l.input(k).fill(v);
    await l.dialog.getByRole('button', { name: 'Next' }).click();
    await expect(l.input('Quantity')).toHaveValue('1');
    await expect(l.input('Amount')).toHaveValue('0');
    await expect(l.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Bill inpatient', 'Move deposit', 'Failed card']);
  });
  await qa.step(4, async () => {
    await l.input('Quantity').fill('2');
    const mark = await toastMark(page);
    await l.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved.');
    await l.open();
    if (!(await l.row(invoice).count())) {
      qa.deviation(4, `A row with the state "open" and "${invoice} deposit 0"`, 'the list without a search does not show the new invoice (it lists some invoices only)');
      return;
    }
    const c = await l.cells(l.row(invoice));
    expect(c[0]).toBe('open');
    expect(c[1]).toBe(`${invoice} deposit 0`);
  });
  await l.find(pt.id);
  qa.note(5, `"Find patient" shows ${await l.row(invoice).count()} row(s) for the invoice; the server answer holds it with "charge 300000"`);
  qa.blocked(5, 36);
  if (await counterClosed(page)) {
    qa.notRun(6, 'the U1 counter is closed for today (TC-APP014-011); the invoice is searched on Fast Cashier on another day');
    return;
  }
  await qa.step(6, async () => {
    const c = new CashierPage(page);
    await c.open();
    await c.search.fill(invoice);
    await c.button('Search').click();
    await expect(c.bar).toContainText(invoice);
    qa.note(6, `Fast Cashier: Amount due ${await c.barValue('Amount due')}, lines ${JSON.stringify(await c.lines())}`);
  });
  void todayWib;
};

export const TC_APP014_003 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const invoice = await sale(page);
  const c = new CashierPage(page);
  const cash0 = await c.systemCash();

  await qa.step(1, async () => {
    await c.field('Deposits').fill('50000');
    await c.button('Take deposit').click();
    await expect.poll(() => c.barValue('Deposits')).toBe('Rp 50.000');
    expect([await c.barValue('Available'), await c.barValue('Amount due')]).toEqual(['Rp 50.000', 'Rp 116.500']);
    expect((await c.barState()).status).toBe('Draft');
    await expect(c.receipt().getByRole('term')).toHaveCount(0);
  });
  await qa.step(2, async () => {
    await expect(c.field('Cash amount (IDR)')).toHaveValue('116500');
  });
  await qa.step(3, async () => {
    await c.button('New sale').click();
    await select(page, invoice);
    expect([await c.barValue('Available'), await c.barValue('Amount due'), await c.barValue('Deposits')]).toEqual(['Rp 50.000', 'Rp 116.500', 'Rp 50.000']);
  });
  await qa.step(4, async () => {
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect([await c.receiptValue('Paid'), await c.receiptValue('Remaining due')]).toEqual(['Rp 116.500', 'Rp 0']);
  });
  await expect.poll(() => c.systemCash()).toBe(cash0 + 166500);
};

export const TC_APP014_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
  await sale(page);
  const c = new CashierPage(page);
  const cash0 = await c.systemCash();

  await qa.step(1, async () => {
    await c.tender().selectOption({ label: 'Card' });
    await expect(c.field('EDC terminal')).toBeVisible();
    await expect(c.field('EDC approval')).toBeVisible();
    await expect(c.button('Cancel EDC')).toBeVisible();
  });
  await qa.step(2, async () => {
    await c.field('EDC terminal').fill('QA-EDC-01');
    await c.field('EDC approval').fill('123456');
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect((await c.receiptValue('Tender')).toUpperCase()).toBe('CARD');
    expect(await c.receiptValue('Paid')).toBe('Rp 166.500');
  });
  await qa.step(3, async () => {
    expect(await c.systemCash()).toBe(cash0);
  });
};

export const TC_APP014_006 = async ({ page, qa }: CaseArgs): Promise<void> => {
  await sale(page);
  const c = new CashierPage(page);
  await qa.step(1, async () => {
    await c.field('Discount (IDR)').fill('20000');
    await c.button('Apply discount').click();
    await expect.poll(async () => (await c.lines()).Discount).toBe('Rp 20.000');
    expect(await c.lines()).toEqual({ Gross: 'Rp 150.000', Discount: 'Rp 20.000', Tax: 'Rp 14.300', 'Patient net': 'Rp 144.300' });
    expect(await c.barValue('Amount due')).toBe('Rp 144.300');
    expect((await c.barState()).status).toBe('Draft');
  });
  await qa.step(2, async () => {
    await pay(page);
    expect((await c.barState()).status).toBe('Paid');
    expect(await c.receiptValue('Paid')).toBe('Rp 144.300');
  });
};

export const TC_APP014_008 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const invoice = await paidSale(page);
  const c = new CashierPage(page);
  let cash0 = 0;

  await qa.step(1, async () => {
    await select(page, invoice);
    cash0 = await c.systemCash();
    for (const b of ['Take deposit', 'Pay', 'Apply discount']) await expect(c.button(b)).toBeDisabled();
    await expect(c.field('Refund (IDR)')).toBeEnabled();
    await expect(c.button('Refund payment')).toBeEnabled();
  });
  await qa.step(2, async () => {
    await c.field('Refund (IDR)').fill('50000');
    await c.button('Refund payment').click();
    await expect.poll(() => c.barValue('Available')).toBe('Rp 116.500');
    expect(await c.barValue('Amount due')).toBe('Rp 50.000');
    expect((await c.barState()).status).toBe('Draft');
  });
  await qa.step(3, async () => {
    await expect.poll(() => c.systemCash()).toBe(cash0 - 50000);
  });
};

export const TC_APP014_011 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = new CashierPage(page);
  test.skip(await counterClosed(page), 'The U1 counter is already closed for today');
  await ensureSettings(page);
  await paidSale(page);
  let system = 0;

  await qa.step(1, async () => {
    await c.open();
    await expect.poll(() => c.systemCash()).toBeGreaterThan(0);
    system = await c.systemCash();
    qa.note(1, `System cash ${system}`);
  });

  await qa.step(2, async () => {
    await c.field('Declared cash (IDR)').fill(String(system));
    await c.button('Close my day').click();
    await expect(c.closedBanner()).toBeVisible();
    expect(rupiah((await c.value('Variance').innerText()).trim())).toBe(0);
  });

  await qa.step(3, async () => {
    for (const b of ['Create charge', 'Close my day']) await expect(c.button(b)).toBeDisabled();
    await expect(c.field('Declared cash (IDR)')).toBeDisabled();
  });

  qa.notRun(4, 'Cashier 2 is not made (00-prerequisites.xlsx | Users, U4 "Second user of the same role")');
};

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  // The amount bar of Fast Cashier is a status region; its text is not a toast.
  return (await toastsSince(page, mark)).filter((t) => !t.startsWith('Deposit / PED'));
}

export const tariffs = (page: Page) => new DeskScreen(page, 'tariffs', 'Tariff group', 'Tariff group', 'Tariff group');

export const plans = (page: Page) => new DeskScreen(page, 'plans', 'Patient plan', 'Patient plan', 'Plan');

export const ledger = (page: Page) => new DeskScreen(page, 'ledger', 'Patient ledger', 'Patient ledger', 'Bill inpatient');

/** A registered test patient and its internal id (read from the answer of the patient search). */
export async function patientWithId(page: Page, qa: Qa): Promise<{ id: string; name: string; mrn: string }> {
  const p = await registerPatient(page, 'QA-HAC Pasien Umum', qa.token());
  const reg = new RegisteredPatientsPage(page);
  // Any answer that carries the MRN holds the record with its id (the list load or the search); tried up to three times.
  let body = '';
  for (let i = 0; i < 3 && !body; i++) {
    const answer = page.waitForResponse(async (r) => (await r.text().catch(() => '')).includes(`"mrn":"${p.mrn}"`), { timeout: 10_000 }).catch(() => null);
    await reg.open();
    await reg.search(p.mrn);
    body = (await (await answer)?.text()) ?? '';
  }
  expect(body, `an answer with the record of ${p.mrn}`).not.toBe('');
  // The answer is a stream of lines; the record is in the one that holds a list of items with this MRN.
  const found = body
    .split('\n')
    .map((l) => l.replace(/^\d+:/, ''))
    .flatMap((l) => {
      try {
        return (JSON.parse(l).items ?? []) as { id: string; mrn: string }[];
      } catch {
        return [];
      }
    })
    .find((i) => i.mrn === p.mrn);
  expect(found, `the record of ${p.mrn} in the answer of the patient search`).toBeDefined();
  const id = found!.id;
  qa.note(1, `test patient ${p.fullName} (${p.mrn}); its internal id ${id} is read from the answer of the patient search, as no screen shows it`);
  return { id, name: p.fullName, mrn: p.mrn };
}

/** A tariff group of this test with a price for its service; returns the codes. */
export async function pricedGroup(page: Page, qa: Qa, price = '150000'): Promise<{ group: string; service: string }> {
  const t = tariffs(page);
  const group = qa.code('X-UMUM');
  const service = qa.code('X-VISITE');
  expect(await t.save({ 'Group / plan code': group, 'Name / destination': qa.name('X Umum') }, 'Tariff group')).toContain('Saved.');
  expect(await t.save({ 'Group / plan code': group, Service: service, Amount: price }, 'Service price')).toContain('Saved.');
  return { group, service };
}

/** A screen of the three: title, the dialog button, a search, a table Status / Detail / Code. */
export class DeskScreen {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: 'tariffs' | 'plans' | 'ledger',
    readonly heading: string,
    readonly dialogName: string,
    readonly opener: string,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog', { name: dialogName });
  }
  async open(): Promise<void> {
    await this.page.goto(`/id/billing/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async openDialog(): Promise<Locator> {
    await this.main.getByRole('button', { name: this.opener, exact: true }).click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }
  input(name: string): Locator {
    return this.dialog.getByRole('textbox', { name, exact: true });
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** Lists the invoices of a patient (the list without a search holds only some invoices). */
  async find(patientId: string): Promise<void> {
    await this.open();
    await this.main.getByRole('textbox', { name: 'Find patient' }).fill(patientId);
    await this.main.getByRole('button', { name: 'Find patient' }).click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /** Fills the dialog (inputs by label, "Action" by option) and saves; returns the toasts. */
  async save(v: Record<string, string>, action?: string, twoSteps = false): Promise<string[]> {
    await this.open();
    await this.openDialog();
    return this.fillAndSave(v, action, twoSteps);
  }
  async fillAndSave(v: Record<string, string>, action?: string, twoSteps = false): Promise<string[]> {
    const first = ['Invoice number', 'Group / plan code', 'Service', 'Patient / source'];
    for (const [k, val] of Object.entries(v)) if (!twoSteps || first.includes(k)) await this.input(k).fill(val ?? '');
    if (twoSteps) {
      await this.dialog.getByRole('button', { name: 'Next' }).click();
      for (const [k, val] of Object.entries(v)) if (!first.includes(k)) await this.input(k).fill(val ?? '');
    }
    if (action) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    return toastsAfter(this.page, mark);
  }
}

/** TC-APP014-016: Item price of Fast Cashier and an estimate (the price cannot be saved, found blocker 35). */
export const TC_APP014_016 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = new CashierPage(page);
  await c.open();
  await qa.step(1, async () => {
    await page.getByRole('combobox', { name: 'Visit' }).selectOption('Outpatient');
    for (const f of ['Site margin', 'Tax (%)']) await expect(page.getByRole('textbox', { name: f })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Method' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Block a price below cost' })).toBeVisible();
  });
  qa.blocked(2, 35);
  qa.note(2, '"Save price" answers HTTP 500 (found blocker 35): the price stays at cost with no tax');
  const before = total(await stockOf(page, PHARMACY.para.code));
  await c.open();
  // The card of "Estimate": its heading sits in the card's header.
  const estimate = page.getByRole('heading', { name: 'Estimate' }).locator('xpath=../..');
  await qa.step(3, async () => {
    const fields = await estimate.locator('input, select').evaluateAll((es) => es.map((e) => `${(e as HTMLInputElement).labels?.[0]?.innerText ?? ''}:${e.tagName}:${(e as HTMLInputElement).type}`));
    qa.note(3, `the Estimate card: ${fields.join(', ')}`);
    await estimate.getByRole('textbox', { name: 'Patient' }).fill(qa.name('X Pasien Estimasi'));
    const item = estimate.getByRole('textbox', { name: 'Item code' }).or(estimate.getByRole('combobox', { name: 'Item code' })).first();
    await item.fill(PHARMACY.para.code);
    const list = await item.getAttribute('aria-controls');
    if (list) await page.locator(`#${list}`).getByRole('option').first().click().catch(() => {});
    const qty = estimate.getByRole('spinbutton').first();
    if (await qty.count()) await qty.fill('10');
    else qa.deviation(3, 'Picks QA-PARA, quantity 10', 'the card has no quantity field: each line is one unit');
    await estimate.getByRole('button', { name: 'Add line' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = (await estimate.innerText()).replace(/\s+/g, ' ');
    qa.note(3, `after "Add line": "${text.slice(-160)}"`);
    expect(text).toMatch(new RegExp(`${PHARMACY.para.code}|${PHARMACY.para.name}`));
  });
  await qa.step(4, async () => {
    await estimate.getByRole('button', { name: 'Estimate', exact: true }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = (await estimate.innerText()).replace(/\s+/g, ' ');
    qa.note(4, `estimate: "${text.slice(-160)}"`);
    if (!text.includes('Rp 13.875')) qa.deviation(4, 'Patient net Rp 12.500, Tax Rp 1.375, Total Rp 13.875', 'priced at cost with no tax (found blocker 35)');
  });
  await qa.step(5, async () => {
    expect(total(await stockOf(page, PHARMACY.para.code))).toBe(before);
  });
};
