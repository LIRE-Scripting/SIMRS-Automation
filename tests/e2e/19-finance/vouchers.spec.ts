import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { invalidFields } from '../18-settings/helpers';
import { Accounts, PostingRules, account, clickFor, createAccount, retireAccount } from './helpers';

/**
 * 19-finance.xlsx: Vouchers, ERP staging, the hub and the screen checks.
 * Vouchers has no <main>; "Create voucher" and the voucher detail are panels,
 * not dialogs.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

const plain = (t: string) => t.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

class Vouchers {
  constructor(readonly page: Page) {}
  async open(): Promise<void> {
    await this.page.goto('/en/finance/vouchers');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Vouchers' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The panel holding a heading (the "Create voucher" form or the voucher detail). */
  panel(heading: string | RegExp): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(heading, { exact: typeof heading === 'string' }) })
      .filter({ has: this.page.getByRole('button', { name: /^(Save|Close)$/ }) })
      .last();
  }
  get form(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByRole('heading', { name: 'Create voucher' }) });
  }
  async openForm(): Promise<void> {
    await this.open();
    await this.page.getByRole('button', { name: 'New voucher' }).click();
    await expect(this.form.getByText('Create a voucher and post it to the ledger.')).toBeVisible();
  }
  /** A field of the form: its label wraps a span with the name and the input. */
  field(label: string): Locator {
    return this.form.locator('label').filter({ has: this.page.locator(`span:text-is("${label}")`) }).locator('input, select, textarea');
  }
  async create(v: { value?: string; party?: string; narration?: string; currency?: string; type?: string }): Promise<string[]> {
    await this.openForm();
    if (v.type) await this.field('Doc type').selectOption({ label: v.type });
    if (v.currency !== undefined) await this.field('Currency').fill(v.currency);
    if (v.value !== undefined) await this.field('Voucher value').fill(v.value);
    if (v.party !== undefined) await this.field('Party').fill(v.party);
    if (v.narration !== undefined) await this.field('Narration').fill(v.narration);
    return clickFor(this.page, this.form.getByRole('button', { name: /^(Save|Saving…)$/ }));
  }
  /** The detail panel shown after a save or after "Open". */
  get detail(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: /^(VCH|SV|DC|DIET)-/ }) })
      .filter({ has: this.page.getByRole('term') })
      .last();
  }
}

const VCH = { value: '1500000', party: 'QA PT Uji', narration: 'QA Jurnal uji' };

qaTest('TC-APP019-008', async ({ page, qa }) => {
  const v = new Vouchers(page);
  const party = qa.name(VCH.party);
  const narration = qa.name(VCH.narration);
  let number = '';
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await page.getByRole('main').getByRole('link', { name: 'Vouchers' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vouchers' })).toBeVisible();
    await expect(page.getByText('Back-office vouchers, across document types.', { exact: true })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New voucher' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await page.getByRole('button', { name: 'New voucher' }).click();
    await expect(v.form.getByText('Create a voucher and post it to the ledger.')).toBeVisible();
    for (const f of ['Doc number', 'Doc date', 'Doc type', 'Currency', 'Voucher value', 'Party', 'Narration']) await expect(v.field(f)).toBeVisible();
    await expect(v.field('Doc date')).toHaveValue(todayWib());
    expect(await v.field('Doc type').evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.textContent?.trim())).toBe('1. Journal');
    await expect(v.field('Currency')).toHaveValue('IDR');
    await expect(v.field('Voucher value')).toHaveValue('0');
    await expect(v.field('Branch')).toHaveCount(0);
  });
  await qa.step(3, async () => {
    expect(await v.create({ value: VCH.value, party, narration })).toContain('Voucher created');
  });
  await qa.step(4, async () => {
    const text = plain(await v.detail.innerText());
    qa.note(4, `detail: "${text.slice(0, 200)}"`);
    number = text.match(/VCH-\d+/)?.[0] ?? '';
    expect(number).not.toBe('');
    for (const part of ['Journal', todayWib(), 'IDR 1.500.000,00', party, 'Open', narration]) expect(text).toContain(part);
  });
  await qa.step(5, async () => {
    await v.detail.getByRole('button', { name: 'Close' }).click();
    const row = v.rows().filter({ hasText: number });
    const first = plain(await v.rows().first().innerText());
    qa.note(5, `first row: "${first}"`);
    await expect(row).toHaveCount(1);
    const c = (await row.getByRole('cell').allInnerTexts()).map(plain);
    expect(c.slice(0, 7)).toEqual([number, todayWib(), 'Journal', party, 'IDR 1.500.000,00', 'Open', 'Open']);
    if (!first.startsWith(number)) qa.note(5, 'the new voucher is not the first row (vouchers of the same date are ordered by number)');
  });
});

qaTest('TC-APP019-009', async ({ page, qa }) => {
  const v = new Vouchers(page);
  let first: string[] = [];
  await qa.step(1, async () => {
    await v.open();
    await expect(v.rows()).toHaveCount(10);
    await expect(page.getByText(/^Showing 1–10 of \d+$/)).toBeVisible();
    await expect(page.getByRole('columnheader')).toHaveText(['Doc no', 'Date', 'Type', 'Party', 'Amount', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    const rows = await v.rows().evaluateAll((rs) => rs.map((r) => [r.querySelectorAll('td')[1]?.textContent ?? '', r.querySelectorAll('td')[0]?.textContent ?? '']));
    first = rows.map((r) => r[1]);
    const dates = rows.map((r) => r[0]);
    expect(dates).toEqual([...dates].sort().reverse());
    const sameDay = rows.filter((r) => r[0] === rows[0][0]).map((r) => r[1]);
    if (JSON.stringify(sameDay) !== JSON.stringify([...sameDay].sort().reverse())) qa.deviation(2, 'vouchers of the same date by document number, highest first', `first numbers: ${sameDay.slice(0, 4).join(', ')}`);
  });
  await qa.step(3, async () => {
    await v.rows().first().getByRole('button', { name: 'Open' }).click();
    const text = plain(await v.detail.innerText());
    qa.note(3, `detail: "${text.slice(0, 200)}"`);
    expect(text).toContain(first[0]);
  });
  await qa.step(4, async () => {
    await v.detail.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Next page' }).press('Enter');
    await expect(page.getByText(/^Showing 11–/)).toBeVisible();
    const dates = await v.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[1]?.textContent ?? ''));
    expect(dates.every((d) => d <= todayWib())).toBe(true);
  });
});

qaTest('TC-APP019-011', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await main.getByRole('link', { name: 'ERP staging' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'ERP invoice staging' })).toBeVisible();
    await expect(main.getByText('HIS invoices waiting to be posted, with patient name and medical record number.', { exact: true })).toBeVisible();
    await expect(main.getByRole('searchbox')).toBeVisible();
    await expect(main.getByRole('table')).toBeVisible();
    const buttons = (await main.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter((b) => b && !/^\d+$/.test(b));
    expect(buttons).toEqual([]);
  });
  await qa.step(2, async () => {
    await expect(main.getByRole('columnheader')).toHaveText(['Invoice', 'Date', 'Patient', 'MRN', 'Net', 'Patient', 'Sponsor', 'Posted']);
    const posted = await main.getByRole('rowgroup').nth(1).getByRole('row').evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[7]?.textContent?.trim() ?? ''));
    for (const p of posted.filter(Boolean)) expect(['Posted', 'Pending']).toContain(p);
  });
  await qa.step(3, async () => {
    const invoice = (await main.getByRole('rowgroup').nth(1).getByRole('row').first().getByRole('cell').first().innerText()).trim();
    const part = invoice.slice(0, Math.max(3, Math.floor(invoice.length / 2)));
    await main.getByRole('searchbox').fill(part);
    await expect.poll(async () => (await main.getByRole('rowgroup').nth(1).getByRole('row').allInnerTexts()).every((t) => t.toLowerCase().includes(part.toLowerCase()))).toBe(true);
    qa.note(3, `search "${part}"`);
  });
});

qaTest('TC-APP019-014', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const five = ['Financial years', 'Chart of accounts', 'Budget posting rules', 'Vouchers', 'ERP staging'];
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Finance\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Finance$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Finance' })).toBeVisible();
    await expect(main.getByText('Vouchers and general-ledger posting.', { exact: true })).toBeVisible();
    const tiles = (await main.getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => t && !['Home', 'Apps'].includes(t));
    for (const t of five) expect(tiles).toContain(t);
    if (tiles.length !== five.length) qa.deviation(1, `five tiles: ${five.join(', ')}`, `${tiles.length} tiles under ${(await main.getByRole('heading', { level: 2 }).allInnerTexts()).join(', ')}: ${tiles.join(', ')}`);
  });
  await qa.step(2, async () => {
    for (const t of five) {
      await page.goto('/en/finance');
      await main.getByRole('link', { name: t, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    const side = (await page.getByRole('complementary').last().innerText()).replace(/\s+/g, ' ');
    expect(side).toContain('Finance');
    expect(side).toContain('Vouchers & GL');
    for (const s of ['Masters', 'Ledgers']) expect(side.toLowerCase()).toContain(s.toLowerCase());
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/finance');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const tiles = (await main.getByRole('link').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    qa.note(3, `heading "${h1}"; tiles ${tiles.join(', ')}`);
    if (h1 !== 'Keuangan' || tiles.includes('Financial years')) qa.deviation(3, 'Indonesian ("Keuangan", "Tahun buku", "Bagan akun", …)', `"${h1}"; ${tiles.slice(2, 6).join(', ')}`);
  });
});

qaTest('TC-APP019-015', async ({ page, qa }) => {
  const v = new Vouchers(page);
  await qa.step(1, async () => {
    await v.openForm();
    await v.field('Doc type').selectOption({ label: '4. Bank Payment' });
    const labels = (await v.form.locator('label').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    if (!labels.some((l) => /account/i.test(l))) qa.deviation(1, 'The form asks for the bank account', `the same fields for every type: ${labels.join(', ')}`);
  });
  await qa.step(2, async () => {
    const lines = await v.form.getByRole('button', { name: /add line|line/i }).count();
    if (!lines) qa.deviation(2, 'Lines can be added; the totals of both sides are shown and must be equal', 'no lines, no debit and no credit');
  });
  await qa.step(3, async () => {
    const party = qa.name(VCH.party);
    expect(await v.create({ type: '4. Bank Payment', value: VCH.value, party, narration: qa.name('QA Bayar bank') })).toContain('Voucher created');
    const text = plain(await v.detail.innerText());
    if (!/QA-1010|QA-5010|debit|credit/i.test(text)) qa.deviation(3, 'The lines with their accounts', `a header only: "${text.slice(0, 120)}"`);
  });
});

qaTest('TC-APP019-018', async ({ page, qa }) => {
  const v = new Vouchers(page);
  const party = () => qa.name(VCH.party);
  await qa.step(1, async () => {
    const toasts = await v.create({ value: '0', party: party() });
    if (toasts.includes('Voucher created')) qa.deviation(1, 'Refused: a voucher needs a value', 'a voucher of "IDR 0,00" is saved');
  });
  await qa.step(2, async () => {
    for (const value of ['-1', '1000.555']) {
      const toasts = await v.create({ value, party: party() });
      expect(toasts, value).not.toContain('Voucher created');
      expect((await invalidFields(v.form)).length, value).toBeGreaterThan(0);
    }
  });
  await qa.step(3, async () => {
    const toasts = await v.create({ value: '1000', currency: 'ID', party: party() });
    expect(toasts).not.toContain('Voucher created');
    if (!toasts.some((t) => /three|3/.test(t))) qa.deviation(3, 'A message that the currency needs three letters', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(4, async () => {
    const toasts = await v.create({ value: '1000', currency: 'XYZ', party: party() });
    if (toasts.includes('Voucher created')) qa.deviation(4, 'Refused: not a currency', `saved; the detail reads "${plain(await v.detail.innerText()).slice(0, 100)}"`);
  });
  await qa.step(5, async () => {
    const toasts = await v.create({ value: '1000', party: `QA ${'x'.repeat(253)}` });
    expect(toasts).not.toContain('Voucher created');
    if (!toasts.some((t) => /255|long|limit/i.test(t))) qa.deviation(5, 'Refused with a message that names the limit of 255, or the field stops there', `toast "${toasts.join(' / ').slice(0, 120)}"`);
  });
});

qaTest('TC-APP019-024', async ({ page, qa }) => {
  const acc = new Accounts(page);
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank'));
  try {
    await qa.step(1, async () => {
      const row = await acc.row(bank.code);
      await row.getByRole('cell').first().click();
      const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim());
      const opened = await page.getByRole('dialog').count();
      if (!opened) qa.deviation(1, 'The entries booked to the account and its balance', `the row cannot be opened; it offers ${buttons.join(', ')}`);
    });
    await qa.step(2, async () => {
      await page.goto('/en/finance');
      const tiles = (await page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => !['Home', 'Apps'].includes(t));
      const side = (await page.getByRole('complementary').last().getByRole('link').allInnerTexts()).map((t) => t.trim());
      qa.note(2, `hub: ${tiles.join(', ')}; menu has "Trial balance": ${side.includes('Trial balance')}`);
      if (!tiles.some((t) => /ledger|trial|report/i.test(t))) qa.deviation(2, 'Tiles or reports are present', `the hub has ${tiles.join(', ')}; "Trial balance" is in the menu only`);
    });
    await qa.step(3, async () => {
      const v = new Vouchers(page);
      await v.open();
      const search = await page.getByRole('searchbox').count();
      const filters = await page.getByRole('combobox').count();
      const exp = await page.getByRole('button', { name: /export|download/i }).count();
      if (!search || !filters || !exp) qa.deviation(3, 'A search, filters and an export', `search ${search}, filters ${filters}, export ${exp}`);
    });
  } finally {
    await retireAccount(page, bank.code);
  }
});

qaTest('TC-APP019-033', async ({ page, qa }) => {
  const v = new Vouchers(page);
  const script = '<script>alert(1)</script>';
  const img = '<img src=x onerror=alert(1)>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });
  const code = qa.code('QA-XSS');
  try {
    await qa.step(1, async () => {
      expect(await v.create({ value: '1000', party: script, narration: img })).toContain('Voucher created');
      const text = await v.detail.innerText();
      expect(text).toContain(script);
      expect(text).toContain(img);
      await expect(page.locator('img[src="x"]')).toHaveCount(0);
      expect(alerted).toBe(false);
    });
    await qa.step(2, async () => {
      expect(await new Accounts(page).add({ code, name: script, kind: 'Expense' })).toContain(`Account ${code.toUpperCase()} created.`);
      expect((await new Accounts(page).cells(code))[1]).toBe(script);
      expect(alerted).toBe(false);
    });
    await qa.step(3, async () => {
      const r = new PostingRules(page);
      await r.open();
      const options = await r.debit('Allocation — capital').locator('option').allInnerTexts();
      expect(options).toContain(`${code.toUpperCase()} · ${script}`);
      expect(alerted).toBe(false);
    });
  } finally {
    await retireAccount(page, code);
  }
});

qaTest('TC-APP019-083', async ({ page, qa }) => {
  const v = new Vouchers(page);
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Vouchers' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vouchers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New voucher' })).toBeVisible();
    await expect(page.getByRole('columnheader')).toHaveText(['Doc no', 'Date', 'Type', 'Party', 'Amount', 'Status', 'Actions']);
  });
  let found: string[] = [];
  await qa.step(2, async () => {
    await v.open();
    const seen = new Map<string, string>();
    for (let i = 0; i < 12 && seen.size < 3; i++) {
      for (const t of await v.rows().allInnerTexts()) {
        const n = t.split('\t')[0].trim();
        const kind = n.startsWith('DIET-') ? 'DIET' : n.startsWith('DC-') ? 'DC' : n.startsWith('SV-') ? 'SV' : '';
        if (kind && !seen.has(kind)) seen.set(kind, plain(t));
      }
      const next = page.getByRole('button', { name: 'Next page' });
      if (await next.isDisabled()) break;
      await next.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    found = [...seen.values()];
    qa.note(2, `found: ${found.join(' ; ') || 'none'} (the first pages only)`);
    expect(seen.has('SV')).toBe(true);
    for (const k of ['DIET', 'DC']) if (!seen.has(k)) qa.note(2, `no ${k}- voucher on the first pages`);
    qa.note(2, `statuses: ${found.map((f) => f.split(' ').at(-2)).join(', ')}`);
  });
  await qa.step(3, async () => {
    await v.open();
    await v.rows().filter({ hasText: /^SV-/ }).first().getByRole('button', { name: 'Open' }).click();
    const text = plain(await v.detail.innerText());
    qa.note(3, `detail of a sale: "${text.slice(0, 160)}"`);
  });
  await qa.step(4, async () => {
    await page.goto('/en/finance/journals');
    await page.waitForLoadState('networkidle').catch(() => {});
    const n = await page.getByRole('row').filter({ hasText: /SV-|DC-|DIET-/ }).count();
    qa.note(4, `${n} journal row(s) carry such a number`);
  });
  await qa.step(5, async () => {
    await page.goto('/en/finance/trial-balance');
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(5, `Trial balance: "${plain(await page.locator('body').innerText()).slice(0, 160)}"`);
  });
  await qa.step(6, async () => {
    await v.open();
    await v.rows().filter({ hasText: /^SV-/ }).first().getByRole('button', { name: 'Open' }).click();
    const buttons = (await v.detail.getByRole('button').allInnerTexts()).map((b) => b.trim());
    qa.note(6, `the detail offers ${buttons.join(', ')}`);
    expect(buttons.some((b) => /journal|approve|post/i.test(b))).toBe(false);
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP019-085', '/finance', 'Finance'],
  ['TC-APP019-086', '/finance/account-maps', 'Account maps'],
  ['TC-APP019-087', '/finance/accounts', 'Chart of accounts'],
  ['TC-APP019-088', '/finance/audit-sheets', 'Audit sheet'],
  ['TC-APP019-089', '/finance/bank-guarantee-settlement-requests', 'Encashment requests'],
  ['TC-APP019-090', '/finance/bank-guarantee-settlements', 'Guarantee settlements'],
  ['TC-APP019-091', '/finance/bank-guarantees', 'Bank guarantees'],
  ['TC-APP019-092', '/finance/bill-adjustments', 'Bill adjustment'],
  ['TC-APP019-093', '/finance/collections', 'Patient collections'],
  ['TC-APP019-094', '/finance/configuration', 'Finance configuration'],
  ['TC-APP019-095', '/finance/cost-centres', 'Cost centres'],
  ['TC-APP019-096', '/finance/currencies', 'Currencies'],
  ['TC-APP019-097', '/finance/documents/bank-receipt', 'Bank receipt'],
  ['TC-APP019-098', '/finance/documents/cash-receipt', 'Cash receipt'],
  ['TC-APP019-099', '/finance/documents/contra', 'Contra'],
  ['TC-APP019-100', '/finance/documents/credit-memo', 'Credit memo'],
  ['TC-APP019-101', '/finance/documents/debit-memo', 'Debit memo'],
  ['TC-APP019-102', '/finance/documents/opening-balance', 'Opening balance'],
  ['TC-APP019-103', '/finance/documents/purchase', 'Purchase'],
  ['TC-APP019-104', '/finance/documents/sales', 'Sales'],
  ['TC-APP019-105', '/finance/erp-invoice-staging', 'ERP invoice staging'],
  ['TC-APP019-106', '/finance/fair-sheets', 'Fair sheet'],
  ['TC-APP019-107', '/finance/financial-years', 'Financial years'],
  ['TC-APP019-108', '/finance/imprest', 'Imprest'],
  ['TC-APP019-109', '/finance/journals', 'Journals'],
  ['TC-APP019-110', '/finance/legal-agreements', 'Legal agreement'],
  ['TC-APP019-111', '/finance/letters-of-credit', 'Letter of credit'],
  ['TC-APP019-112', '/finance/loans', 'Loan'],
  ['TC-APP019-113', '/finance/payment-requests', 'Payment requests'],
  ['TC-APP019-114', '/finance/payments', 'Payments'],
  ['TC-APP019-115', '/finance/posting-rules', 'Budget posting rules'],
  ['TC-APP019-116', '/finance/reconciliation', 'Bank reconciliation'],
  ['TC-APP019-117', '/finance/rough-sheets', 'Rough sheet'],
  ['TC-APP019-118', '/finance/security-accounting', 'Security accounting'],
  ['TC-APP019-119', '/finance/security-disposal', 'Security disposal'],
  ['TC-APP019-120', '/finance/security-disposal-requests', 'Disposal requests'],
  ['TC-APP019-121', '/finance/security-receipts', 'Security receipts'],
  ['TC-APP019-122', '/finance/tariff-maps', 'Tariff account mapping'],
  ['TC-APP019-123', '/finance/trial-balance', 'Trial balance'],
  ['TC-APP019-124', '/finance/vouchers', 'Vouchers'],
  ['TC-APP019-125', '/finance/year-end', 'Year end'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
