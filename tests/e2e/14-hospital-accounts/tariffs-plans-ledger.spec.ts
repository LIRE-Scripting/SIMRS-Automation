import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { registerPatient } from '../../../lib/ambulatory-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { screenOpens } from '../shared/screen-opens';
import { counterClosed, ensureSettings, sale } from './helpers';

/**
 * 14-hospital-accounts.xlsx: Tariff group (/billing/tariffs), Patient plan
 * (/billing/plans), Patient ledger (/billing/ledger) and the screen check of
 * every route (074 … 078). Codes carry a token. "The internal id of a
 * registered test patient" is shown on no screen; it is read from the answer of
 * the patient search on Registered patients (Q27).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  // The amount bar of Fast Cashier is a status region; its text is not a toast.
  return (await toastsSince(page, mark)).filter((t) => !t.startsWith('Deposit / PED'));
}

/** A screen of the three: title, the dialog button, a search, a table Status / Detail / Code. */
class DeskScreen {
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
    await this.page.goto(`/en/billing/${this.route}`);
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

const tariffs = (page: Page) => new DeskScreen(page, 'tariffs', 'Tariff group', 'Tariff group', 'Tariff group');
const plans = (page: Page) => new DeskScreen(page, 'plans', 'Patient plan', 'Patient plan', 'Plan');
const ledger = (page: Page) => new DeskScreen(page, 'ledger', 'Patient ledger', 'Patient ledger', 'Bill inpatient');

/** A registered test patient and its internal id (read from the answer of the patient search). */
async function patientWithId(page: Page, qa: Qa): Promise<{ id: string; name: string; mrn: string }> {
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
  const items = JSON.parse(body.split('\n').find((l) => l.startsWith('1:'))!.slice(2)).items as { id: string; mrn: string }[];
  const id = items.find((i) => i.mrn === p.mrn)!.id;
  qa.note(1, `test patient ${p.fullName} (${p.mrn}); its internal id ${id} is read from the answer of the patient search, as no screen shows it`);
  return { id, name: p.fullName, mrn: p.mrn };
}

/** A tariff group of this test with a price for its service; returns the codes. */
async function pricedGroup(page: Page, qa: Qa, price = '150000'): Promise<{ group: string; service: string }> {
  const t = tariffs(page);
  const group = qa.code('X-UMUM');
  const service = qa.code('X-VISITE');
  expect(await t.save({ 'Group / plan code': group, 'Name / destination': qa.name('X Umum') }, 'Tariff group')).toContain('Saved.');
  expect(await t.save({ 'Group / plan code': group, Service: service, Amount: price }, 'Service price')).toContain('Saved.');
  return { group, service };
}

qaTest('TC-APP014-053', async ({ page, qa }) => {
  const t = tariffs(page);
  const group = qa.code('X-UMUM');
  const name = qa.name('X Umum');
  const service = qa.code('X-VISITE');

  await qa.step(1, async () => {
    await page.goto('/en/billing/cashier');
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
});

qaTest('TC-APP014-054', async ({ page, qa }) => {
  const t = tariffs(page);
  const { group } = await pricedGroup(page, qa);
  const cases: [number, Record<string, string>, string, string][] = [
    [1, { 'Group / plan code': qa.code('X-UMUM'), 'Name / destination': '' }, 'Tariff group', 'code and name are required'],
    [2, { 'Group / plan code': group, 'Name / destination': qa.name('X Umum') }, 'Tariff group', 'DuplicateEntry'],
    [3, { 'Group / plan code': qa.code('X-TIDAK'), Service: qa.code('X-VISITE'), Amount: '150000' }, 'Service price', 'select the tariff group'],
    [4, { 'Group / plan code': group, Service: '', Amount: '150000' }, 'Service price', 'serviceGrpOrType'],
    [5, { 'Group / plan code': group, Service: qa.code('X-VISITE'), Amount: '0' }, 'Service price', 'serviceGrpOrType'],
    [6, { 'Group / plan code': '   ', 'Name / destination': '   ' }, 'Tariff group', 'hospital accounts failed'],
  ];
  for (const [step, v, action, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await t.save(v, action);
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
});

qaTest('TC-APP014-055', async ({ page, qa }) => {
  const t = tariffs(page);
  const { group } = await pricedGroup(page, qa);
  await qa.step(1, async () => {
    const service = qa.code('X-VISITE');
    const toasts = await t.save({ 'Group / plan code': group, Service: service, Amount: '150.000' }, 'Service price');
    if (toasts.includes('Saved.')) {
      await t.open();
      qa.note(1, `stored: ${(await t.cells(t.row(service)))[1]}`);
    } else qa.note(1, `text shown: "${toasts.join(' / ')}"`);
  });
  for (const [step, amount] of [[2, '150,000'], [3, '-5000']] as const) {
    await qa.step(step, async () => {
      const toasts = await t.save({ 'Group / plan code': group, Service: qa.code('X-VISITE'), Amount: amount }, 'Service price');
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}"`);
    });
  }
});

qaTest('TC-APP014-056', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-057', async ({ page, qa }) => {
  const pl = plans(page);
  const pt = await patientWithId(page, qa);
  const code = qa.code('X-BPJS-K1');
  const sponsor = qa.code('X-BPJS');

  await qa.step(1, async () => {
    await page.goto('/en/billing/cashier');
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
});

qaTest('TC-APP014-058', async ({ page, qa }) => {
  const pl = plans(page);
  const pt = await patientWithId(page, qa);
  const code = qa.code('X-BPJS-K1');
  expect(await pl.save({ 'Group / plan code': code, 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'Plan')).toContain('Saved.');
  const cases: [number, Record<string, string>, string][] = [
    [1, { 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.name }, 'noPatPlanAvail'],
    [2, { 'Group / plan code': '', 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'code is required'],
    [3, { 'Group / plan code': code, 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'DuplicateEntry'],
  ];
  for (const [step, v, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await pl.save(v, 'Plan');
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
  await qa.step(4, async () => {
    const toasts = await pl.save({ 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': '00000000-0000-4000-8000-000000000000' }, 'Plan');
    qa.note(4, `a well-formed id of no patient: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP014-059', async ({ page, qa }) => {
  const pl = plans(page);
  const none = await patientWithId(page, qa);
  await qa.step(1, async () => {
    const toasts = await pl.save({ 'Patient / source': none.id }, 'Check eligibility');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "noPatPlanAvail")`);
  });
  await qa.step(2, async () => {
    expect(await pl.save({ 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': none.id }, 'Plan')).toContain('Saved.');
    const toasts = await pl.save({ 'Patient / source': none.id }, 'Check eligibility');
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "pre-authorization is not approved")`);
  });
  await qa.step(3, async () => {
    await pl.open();
    await pl.rows().first().getByRole('button', { name: 'Use' }).click();
    await pl.openDialog();
    const source = await pl.input('Patient / source').inputValue();
    const toasts = await pl.fillAndSave({}, 'Check eligibility');
    qa.note(3, `"Patient / source" after "Use": ${source}; text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

qaTest('TC-APP014-060', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-061', async ({ page, qa }) => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const invoice = qa.code('X-RI-0001');

  await qa.step(1, async () => {
    await page.goto('/en/billing/cashier');
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
});

qaTest('TC-APP014-062', async ({ page, qa }) => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const base = { 'Invoice number': qa.code('X-RI-0001'), 'Group / plan code': group, Service: service, 'Patient / source': pt.id, Quantity: '2' };
  const cases: [number, Record<string, string>, string][] = [
    [1, { ...base, Service: qa.code('X-TANPA-HARGA') }, 'Tariff is not defined for this service'],
    [2, { ...base, Quantity: '0' }, 'Tariff is not defined for this service'],
    [3, { ...base, 'Invoice number': '' }, 'Tariff is not defined for this service'],
    [4, { ...base, 'Patient / source': pt.name }, 'patient is required'],
  ];
  for (const [step, v, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await l.save(v, 'Bill inpatient', true);
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
});

qaTest('TC-APP014-063', async ({ page, qa }) => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const invoice = qa.code('X-RI-0001');
  const base = { 'Invoice number': invoice, 'Group / plan code': group, Service: service, 'Patient / source': pt.id, Quantity: '2' };
  expect(await l.save(base, 'Bill inpatient', true)).toContain('Saved.');

  await qa.step(1, async () => {
    const toasts = await l.save(base, 'Bill inpatient', true);
    await l.find(pt.id);
    qa.note(1, `second bill with the same number: "${toasts.join(' / ')}"; rows with the number: ${await l.row(invoice).count()}`);
  });
  await qa.step(2, async () => {
    const other = qa.code('X-RI-0001');
    const toasts = await l.save({ ...base, 'Invoice number': other, Quantity: '1', Amount: '999999' }, 'Bill inpatient', true);
 await l.find(pt.id);
    qa.note(2, `"${toasts.join(' / ')}"; row: ${(await l.cells(l.row(other).first()).catch(() => [])).join(' | ')}`);
  });
  qa.blocked(3, 36);
  await qa.step(4, async () => {
    await l.open();
    await l.main.getByRole('textbox', { name: 'Find patient' }).fill(pt.name);
    await l.main.getByRole('button', { name: 'Find patient' }).click();
    qa.note(4, `search by name shows ${await l.rows().count()} row(s); the invoice of the patient is ${(await l.row(invoice).count()) ? '' : 'not '}among them`);
  });
});

qaTest('TC-APP014-064', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-065', async () => {
  // Every step needs a chosen invoice on Patient ledger (found blocker 36); the plan declares the case fixme.
});

qaTest('TC-APP014-066', async ({ page, qa }) => {
  const l = ledger(page);
  await qa.step(1, async () => {
    await l.open();
    const dest = (await l.cells(l.rows().first()))[2];
    await l.openDialog();
    const toasts = await l.fillAndSave({ 'Patient / source': '', 'Name / destination': dest, Amount: '50000' }, 'Move deposit', true);
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "PlsSelSrcSite")`);
  });
  for (const st of [2, 3, 4, 5]) qa.blocked(st, 36);
  qa.notRun(6, 'needs a chosen invoice (found blocker 36)');
  qa.notRun(7, 'needs an invoice of BR-B; U1 works on one branch');
});

qaTest('TC-APP014-067', async ({ qa }) => {
  qa.notRun(1, 'needs two users saving at the same moment (U4 "Second user of the same role" is not made)');
});

qaTest('TC-APP014-068', async () => {
  // Every step needs a chosen invoice on Patient ledger (found blocker 36); the plan declares the case fixme.
});

qaTest('TC-APP014-069', async ({ page, qa }) => {
  const l = ledger(page);
  await qa.step(3, async () => {
    await l.open();
    await l.openDialog();
    const toasts = await l.fillAndSave({ 'Patient / source': '', 'Card status': 'failed', Amount: '100000' }, 'Failed card', true);
    expect(toasts).not.toContain('Saved.');
    qa.note(3, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "document is missing")`);
  });
  for (const st of [1, 2, 4]) qa.blocked(st, 36);
});

const SCREENS: [string, string, string][] = [
  ['TC-APP014-074', '/billing', 'Hospital Accounts'],
  ['TC-APP014-075', '/billing/cashier', 'Fast Cashier'],
  ['TC-APP014-076', '/billing/ledger', 'Patient ledger'],
  ['TC-APP014-077', '/billing/plans', 'Patient plan'],
  ['TC-APP014-078', '/billing/tariffs', 'Tariff group'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
