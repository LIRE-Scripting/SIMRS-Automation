import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { clickFor, createAccount, toastsAfter } from './helpers';
import { firstCode } from '../../../lib/qa-data/names';

/**
 * 19-finance.xlsx, the vouchers of Finance (/finance/documents/<kind>: bank
 * and cash receipt, contra, debit and credit memo, purchase, sales, opening
 * balance), the trial balance and the payment wizard (/finance/payments).
 * The account lists offer only the first 50 accounts (found blocker 40): the
 * lines use the first offered QA accounts (accountsOf).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const KINDS = ['bank-receipt', 'cash-receipt', 'contra', 'debit-memo', 'purchase', 'sales', 'credit-memo'] as const;
type Kind = (typeof KINDS)[number] | 'opening-balance';

class FinanceDoc {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly kind: Kind,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/id/finance/documents/${this.kind}`);
    await expect(this.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  /** Document numbers of the list (first column). */
  async numbers(): Promise<string[]> {
    await this.open();
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row')
      .evaluateAll((rs) => rs.map((r) => (r.querySelector('td')?.textContent ?? '').trim()).filter((t) => t && !/No documents yet|Belum ada/.test(t)));
  }
  /** The header fields of the dialog that this kind shows, by label. */
  async header(v: Record<string, string>): Promise<void> {
    for (const [label, value] of Object.entries(v)) {
      const box = this.dialog.getByLabel(label, { exact: true });
      if (await box.count()) await box.first().fill(value);
    }
  }
  /** Two lines: `debit` debited and `credit` credited with `amount` (or the amounts given). */
  async lines(debit: string, credit: string, amount: string, creditAmount = amount): Promise<void> {
    const accounts = this.dialog.getByRole('combobox', { name: 'Account', exact: true });
    const debits = this.dialog.getByRole('textbox', { name: 'Debit', exact: true });
    const credits = this.dialog.getByRole('textbox', { name: 'Credit', exact: true });
    for (const [i, [code, d, c]] of ([[debit, amount, ''], [credit, '', creditAmount]] as const).entries()) {
      const labels = await accounts.nth(i).locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
      const label = labels.find((o) => o.startsWith(code.toUpperCase()));
      expect(label, `account ${code} offered`).toBeTruthy();
      await accounts.nth(i).selectOption({ label: label! });
      await debits.nth(i).fill(d);
      await credits.nth(i).fill(c);
    }
  }
  /**
   * Saves the dialog: the toasts and the text the dialog still shows. The
   * dialog is a panel under a card of the page, which takes the pointer, so
   * "Save" is pressed with the keyboard.
   */
  async save(): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).press('Enter');
    const toasts = await toastsAfter(this.page, mark);
    const inDialog = (await this.dialog.isVisible()) ? (await this.dialog.innerText()).replace(/\s+/g, ' ') : '';
    return [...toasts, inDialog];
  }
  row(no: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: no, exact: true }) }).first();
  }
  async status(no: string): Promise<string> {
    await this.open();
    const cells = (await this.row(no).getByRole('cell').allInnerTexts()).map((t) => t.trim());
    return cells[4] ?? '';
  }
  async act(no: string, action: string): Promise<string[]> {
    await this.open();
    return clickFor(this.page, this.row(no).getByRole('button', { name: action, exact: true }));
  }
}

/** The header of a kind with every field it may need (the dialog fills the labels it has). */
function headerOf(qa: Qa, date = todayWib()): Record<string, string> {
  return {
    Date: date,
    Narration: qa.prefix('X Voucher uji'),
    Reference: qa.code('X-REF-001'),
    Party: qa.name('X PT Mitra Uji'),
    Beneficiary: qa.name('X Penerima uji'),
    'Instrument number': qa.code('X-CHQ-001'),
    'Instrument type': 'CHEQUE',
    'Instrument date': date,
    'Valid until': addDays(date, 90),
  };
}

/**
 * The accounts of the lines: the lists offer only the first 50 accounts
 * (found blocker 40), so an account made by the test cannot be chosen; the
 * first offered QA bank account, 4101 · Pendapatan and the first offered QA
 * equity account are used, by the start of their codes.
 */
/**
 * The accounts of the lines: a test bank account, the seed income account and an equity account of this test. The
 * account picker offers only the first accounts in code order (found blocker 40); the many QA-1010/1501/2110 accounts
 * of earlier runs push QA-3010 past them, so the equity account gets a code that sorts first.
 */
async function accountsOf(page: Page, qa: Qa): Promise<{ bank: string; income: string; equity: string }> {
  const equity = await createAccount(page, { code: firstCode('QA-3010'), name: qa.name('QA Modal Uji'), kind: 'Equity' });
  return { bank: 'QA-1010', income: '4101', equity: equity.code };
}

/** A saved document of a kind; returns its number (new in the list) and the toasts. */
async function saveDoc(d: FinanceDoc, header: Record<string, string>, debit: string, credit: string, amount: string): Promise<{ no: string; shown: string[] }> {
  const before = new Set(await d.numbers());
  await d.main.getByRole('button', { name: 'New', exact: true }).click();
  await expect(d.dialog).toBeVisible();
  await d.header(header);
  await d.lines(debit, credit, amount);
  const shown = await d.save();
  const no = (await d.numbers()).find((n) => !before.has(n)) ?? '';
  return { no, shown };
}

/** The answers to a document dated today while the year 2026 has no periods (found blocker 45). */
const noPeriod = (shown: string[]) => shown.some((t) => /no (financial )?period/i.test(t));

/** A row of the trial balance for an account (its text), for the branch and today. */
async function trialRow(page: Page, code: string): Promise<string> {
  await page.goto('/id/finance/trial-balance');
  await page.waitForLoadState('networkidle').catch(() => {});
  const show = page.getByRole('main').getByRole('button', { name: 'Show' });
  if (await show.isVisible().catch(() => false)) await show.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('row').filter({ hasText: code.toUpperCase() }).first();
  return (await row.isVisible().catch(() => false)) ? (await row.innerText()).replace(/\s+/g, ' ') : '';
}

qaTest('TC-APP019-050', async ({ page, qa }) => {
  const a = await accountsOf(page, qa);
  const d = new FinanceDoc(page, 'bank-receipt');
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Bank receipt' }).or(page.getByRole('main').getByRole('link', { name: 'Bank receipt' })).first().click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Bank receipt' })).toBeVisible();
    await expect(d.main.getByText(/^These vouchers follow the journal path/)).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'New', exact: true }).click();
    for (const f of ['Date', 'Narration', 'Reference', 'Instrument number', 'Instrument type', 'Instrument date', 'Valid until']) await expect(d.dialog.getByLabel(f, { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  });
  const first = await saveDoc(d, headerOf(qa), a.bank, a.income, '2500000');
  if (noPeriod(first.shown)) {
    for (const st of [3, 4, 5, 6]) qa.blocked(st, 45);
    return;
  }
  await qa.step(3, async () => {
    const r = first;
    expect(r.shown).toContain('Saved.');
    no = r.no;
    expect(no, 'the new bank receipt in the list').toBeTruthy();
    expect(await d.status(no)).toBe('Draft');
  });
  await qa.step(4, async () => {
    expect(await d.act(no, 'Send')).toContain('Sent.');
    expect(await d.act(no, 'Approve')).toContain('Approved.');
    expect(await d.status(no)).toBe('Approved');
  });
  await qa.step(5, async () => {
    const done: string[] = [];
    for (const kind of KINDS.slice(1)) {
      const k = new FinanceDoc(page, kind);
      const [debit, credit] = kind === 'purchase' || kind === 'debit-memo' ? [a.income, a.bank] : [a.bank, a.income];
      const r = await saveDoc(k, headerOf(qa), debit, credit, '100000');
      if (!r.no || !r.shown.includes('Saved.')) {
        done.push(`${kind}: not saved ("${r.shown.join(' / ').slice(-120)}")`);
        continue;
      }
      await k.act(r.no, 'Send');
      await k.act(r.no, 'Approve');
      done.push(`${kind} ${r.no}: ${await k.status(r.no)}`);
    }
    qa.note(5, done.join('; '));
    const notApproved = done.filter((x) => !/: Approved$/.test(x));
    if (notApproved.length) qa.deviation(5, 'Each screen has the same list and its own dialog; each approved document shows in Trial balance', notApproved.join('; '));
    qa.note(5, `Trial balance, ${a.bank}: "${(await trialRow(page, a.bank)) || 'no row'}"`);
  });
  await qa.step(6, async () => {
    await page.goto('/id/finance/vouchers');
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(6, `Vouchers ${(await page.getByRole('main').innerText()).includes(no) ? 'lists' : 'does not list'} ${no} (TBD in the workbook)`);
  });
});

qaTest('TC-APP019-051', async ({ page, qa }) => {
  const a = await accountsOf(page, qa);
  const refused = async (step: number, kind: Kind, header: Record<string, string>, message: string, amounts: [string, string] = ['100000', '100000']) => {
    const d = new FinanceDoc(page, kind);
    await d.open();
    await d.main.getByRole('button', { name: 'New', exact: true }).click();
    await d.header(header);
    await d.lines(a.bank, a.income, amounts[0], amounts[1]);
    const shown = await d.save();
    expect(shown).not.toContain('Saved.');
    // The period is checked first: the text of the step is not reached while the year has no periods (found blocker 45).
    if (noPeriod(shown) && !shown.some((t) => t.includes(message))) return qa.blocked(step, 45);
    if (!shown.some((t) => t.includes(message))) qa.deviation(step, `The text "${message}"`, `"${shown.join(' / ').slice(-200)}"`);
  };
  const full = headerOf(qa);
  await qa.step(1, () => refused(1, 'bank-receipt', { ...full, 'Instrument number': '', 'Instrument type': '', 'Instrument date': '', 'Valid until': '' }, 'Instrument number, type, date, and validity are required.'));
  await qa.step(2, () => refused(2, 'cash-receipt', { ...full, Beneficiary: '' }, 'A cash receipt needs a beneficiary.'));
  await qa.step(3, () => refused(3, 'purchase', { ...full, Party: '', Reference: '' }, 'This voucher needs a party and a reference number.'));
  await qa.step(4, () => refused(4, 'contra', full, 'Debit and credit must match, on leaf accounts.', ['100000', '90000']));
  await qa.step(5, () => refused(5, 'sales', headerOf(qa, addDays(todayWib(), -60)), 'The date is outside the back-dated window.'));
});

qaTest('TC-APP019-052', async ({ page, qa }) => {
  const a = await accountsOf(page, qa);
  const d = new FinanceDoc(page, 'opening-balance');
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Opening balance' }).or(page.getByRole('main').getByRole('link', { name: 'Opening balance' })).first().click();
    await expect(d.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(d.main.getByRole('table')).toBeVisible();
  });
  const opening = await saveDoc(d, { Date: todayWib(), Narration: qa.prefix('X Saldo awal uji') }, a.bank, a.equity, '10000000');
  const blocked = noPeriod(opening.shown);
  if (blocked) qa.blocked(2, 45);
  else await qa.step(2, async () => {
    const r = opening;
    expect(r.shown).toContain('Saved.');
    await d.act(r.no, 'Send');
    await d.act(r.no, 'Approve');
    expect(await d.status(r.no)).toBe('Approved');
  });
  await qa.step(3, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Trial balance' }).or(page.getByRole('main').getByRole('link', { name: 'Trial balance' })).first().click();
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Trial balance' })).toBeVisible();
    qa.note(3, `columns ${(await page.getByRole('main').getByRole('columnheader').allInnerTexts()).map((c) => c.trim()).join(', ')}`);
  });
  if (blocked) qa.blocked(4, 45);
  else await qa.step(4, async () => {
    const bank = await trialRow(page, a.bank);
    const equity = await trialRow(page, a.equity);
    qa.note(4, `${a.bank}: "${bank || 'no row'}"; ${a.equity}: "${equity || 'no row'}"`);
    if (!bank.replace(/[.,]/g, '').includes('10000000')) qa.deviation(4, 'Cash shows 10000000 under "Opening debit"', bank ? `"${bank}"` : 'no row for the account');
  });
  qa.notRun(5, 'TBD in the workbook: the screen shows no totals; the sums of the columns are read in step 4 per account');
});

qaTest('TC-APP019-053', async ({ page, qa }) => {
  await qa.step(2, async () => {
    await page.goto('/id/finance/trial-balance');
    await page.waitForLoadState('networkidle').catch(() => {});
    const from = page.getByRole('main').getByLabel('From', { exact: true });
    const to = page.getByRole('main').getByLabel('To', { exact: true });
    if (await from.count()) await from.fill('2001-01-01');
    if (await to.count()) await to.fill('2001-01-31');
    await page.getByRole('main').getByRole('button', { name: 'Show' }).click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const shown = (await page.getByRole('main').getByText('No rows in this range.').count()) > 0;
    if (!shown) qa.deviation(2, 'The text "No rows in this range."', `"${(await page.getByRole('main').innerText()).replace(/\s+/g, ' ').slice(-160)}"`);
  });
  await qa.step(4, async () => {
    await page.goto('/id/finance/trial-balance');
    const exports = await page.getByRole('main').getByRole('button', { name: /export|print|download|csv|excel|cetak|unduh/i }).count();
    qa.note(4, `${exports} export or print button(s) on Trial balance (TBD in the workbook)`);
  });
  qa.notRun(1, 'TBD in the workbook: a second opening document for the cash account of the hospital adds to its books for every user');
  qa.notRun(3, 'U1 works on Podomoro only; "All branches" is TC-APP019-053 step 3 for U2 (no write)');
});

qaTest('TC-APP019-054', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const a = await accountsOf(page, qa);
  const wizard = async (kind: 'Bank' | 'Cash') => {
    await page.goto('/id/finance/payments');
    await page.waitForLoadState('networkidle').catch(() => {});
    const selects = main.locator('select');
    await selects.nth(0).selectOption({ label: kind });
    const accounts = await selects.nth(1).locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
    const mine = accounts.find((o) => o.startsWith(a.bank.toUpperCase()));
    await selects.nth(1).selectOption(mine ? { label: mine } : { index: 1 });
    await selects.nth(2).selectOption({ label: 'Ad-hoc advance' });
    await main.getByRole('button', { name: 'Next', exact: true }).click();
    return mine;
  };
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Payments' }).or(main.getByRole('link', { name: 'Payments' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Payments' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    const mine = await wizard('Bank');
    qa.note(2, `bank account: ${mine ?? 'the bank account of the test is not offered; the first one is used'}`);
    for (const f of ['Date', 'Amount', 'Narration', 'Party']) await expect(main.getByLabel(f, { exact: true }).first()).toBeVisible();
  });
  let saved: string[] = [];
  await qa.step(3, async () => {
    await main.getByLabel('Date', { exact: true }).first().fill(todayWib());
    await main.getByLabel('Amount', { exact: true }).first().fill('500000');
    await main.getByLabel('Narration', { exact: true }).first().fill(qa.prefix('X Uang muka uji'));
    await main.getByLabel('Party', { exact: true }).first().fill(qa.name('X PT Mitra Uji'));
    const debit = main.locator('select').filter({ has: page.locator('option', { hasText: a.income.toUpperCase() }) }).first();
    if (await debit.count()) await debit.selectOption({ label: (await debit.locator('option', { hasText: a.income.toUpperCase() }).first().textContent())!.trim() });
    for (const [f, v] of [['Instrument number', qa.code('X-CHQ-001')], ['Instrument type', 'CHEQUE'], ['Instrument date', todayWib()]]) {
      const box = main.getByLabel(f, { exact: true });
      if (await box.count()) await box.first().fill(v);
    }
    saved = await clickFor(page, main.getByRole('button', { name: 'Save', exact: true }));
    qa.note(3, `Save: "${saved.join(' / ')}"`);
    if (noPeriod(saved)) return;
    expect(saved).toContain('Saved.');
  });
  // No payment dated today can be saved while the year has no periods (found blocker 45).
  if (noPeriod(saved)) {
    qa.blocked(3, 45);
    qa.blocked(4, 45);
  } else await qa.step(4, async () => {
    const row = main.getByRole('row').filter({ hasText: '500' }).first();
    const send = await clickFor(page, row.getByRole('button', { name: 'Send', exact: true })).catch(() => ['(no "Send" on the row)']);
    const approve = await clickFor(page, row.getByRole('button', { name: 'Approve', exact: true })).catch(() => ['(no "Approve" on the row)']);
    qa.note(4, `Send: "${send.join(' / ')}"; Approve: "${approve.join(' / ')}"; Trial balance ${a.bank}: "${(await trialRow(page, a.bank)) || 'no row'}"`);
  });
  qa.notRun(5, '"Print cheque" is tried in TC-APP019-055 steps 3 and 4 on the payment of step 3');
  await qa.step(6, async () => {
    const mine = await wizard('Cash');
    qa.note(6, `cash payment: the lines step for "Cash" ${(await main.getByLabel('Instrument number', { exact: true }).count()) ? 'still asks for the instrument' : 'has no instrument inputs'} (${mine ?? 'first cash account'})`);
  });
});

qaTest('TC-APP019-055', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/finance/payments');
    await page.waitForLoadState('networkidle').catch(() => {});
    const types = await main.locator('select').nth(2).locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
    qa.note(1, `disbursements offered: ${types.join(', ')} (the description: "sources whose module is not published are not shown")`);
  });
  await qa.step(2, async () => {
    await page.goto('/id/finance/payments');
    await page.waitForLoadState('networkidle').catch(() => {});
    const selects = main.locator('select');
    await selects.nth(0).selectOption({ label: 'Bank' });
    await selects.nth(1).selectOption({ index: 1 });
    await selects.nth(2).selectOption({ label: 'Ad-hoc advance' });
    await main.getByRole('button', { name: 'Next', exact: true }).click();
    await main.getByLabel('Date', { exact: true }).first().fill(todayWib());
    await main.getByLabel('Amount', { exact: true }).first().fill('500000');
    await main.getByLabel('Narration', { exact: true }).first().fill(qa.prefix('X Uang muka uji'));
    const toasts = await clickFor(page, main.getByRole('button', { name: 'Save', exact: true }));
    expect(toasts).not.toContain('Saved.');
    if (!toasts.some((t) => t.includes('A bank instrument is required.'))) qa.deviation(2, 'The text "A bank instrument is required."', `"${toasts.join(' / ') || 'no toast'}"`);
  });
  qa.notRun(3, 'needs an approved bank payment with "Print cheque" (TC-APP019-054 step 4 records whether the payment can be approved)');
  qa.notRun(4, 'needs an approved bank payment with "Print cheque" (TC-APP019-054 step 4)');
  qa.notRun(5, '"Refuse a negative cash or bank balance" is a setting of the branch configuration for every user');
  qa.notRun(6, 'needs a user with a transaction limit (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
});
