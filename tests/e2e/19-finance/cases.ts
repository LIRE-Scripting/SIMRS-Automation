import { clickFor, BR_A, ruleNow, retireAccount, restoreRule, createAccount, addMonths, account, Years, PostingRules, Accounts } from './helpers';
import { todayWib, addDays } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 19-finance that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP019_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const y = new Years(page);
  const code = qa.code('QA-FY-NEXT');
  let latest = '';
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Finance\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Financial years' }).click();
    await expect(y.main.getByRole('heading', { level: 1, name: 'Financial years' })).toBeVisible();
    await expect(y.main.getByText('Financial years and their periods. Other modules, including Budget, read them through the Finance API.', { exact: true })).toBeVisible();
    await expect(y.main.getByRole('table')).toBeVisible();
    await expect(y.main.getByRole('button', { name: 'New financial year' })).toBeVisible();
  });
  await qa.step(2, async () => {
    latest = await y.latestEnd();
    await y.main.getByRole('button', { name: 'New financial year' }).click();
    await expect(y.dialog).toHaveAccessibleName('New financial year');
    await expect(y.dialog.getByText('Leave the start date empty to start the day after the latest year ends. Leave the end date empty for a full year.')).toBeVisible();
    for (const f of ['Code', 'Description', 'Start date', 'End date', 'Account finalization date']) await expect(y.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(y.dialog.getByRole('combobox', { name: 'Period type' })).toHaveValue(/Monthly|MONTHLY|monthly/);
    await y.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  const start = addDays(latest || todayWib(), 1);
  const end = addDays(addMonths(start, 12), -1);
  await qa.step(3, async () => {
    expect(await y.create({ code, description: qa.name('QA Tahun buku uji'), finalization: addMonths(end, 3) })).toContain('Financial year created');
  });
  await qa.step(4, async () => {
    await y.open();
    const c = await y.cells(code);
    expect(c.slice(2, 7)).toEqual([start, end, 'Monthly', '12', 'Open']);
    for (const b of ['Periods', 'Lock']) await expect(y.row(code).getByRole('button', { name: b })).toBeVisible();
  });
};

export const TC_APP019_004 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const acc = new Accounts(page);
  const grp = account(qa, 'QA-1000', 'QA Aset Lancar', 'Asset', { group: true });
  const bank = account(qa, 'QA-1010', 'QA Bank Uji', 'Bank');
  try {
    await qa.step(1, async () => {
      await page.goto('/en/finance');
      await page.getByRole('main').getByRole('link', { name: 'Chart of accounts' }).click();
      await expect(acc.main.getByRole('heading', { level: 1, name: 'Chart of accounts' })).toBeVisible();
      await expect(acc.main.getByText('Group and leaf accounts. Only active leaf accounts take postings; a branch restriction limits a leaf to one branch.', { exact: true })).toBeVisible();
      await expect(acc.main.getByRole('searchbox', { name: 'Search code or name' })).toBeVisible();
      await expect(acc.main.getByRole('combobox', { name: 'Kind' })).toBeVisible();
      await expect(acc.main.getByRole('button', { name: 'New account' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await acc.main.getByRole('button', { name: 'New account' }).click();
      await expect(acc.dialog).toHaveAccessibleName('New account');
      for (const f of ['Code', 'Name']) await expect(acc.dialog.getByRole('textbox', { name: f })).toBeVisible();
      await expect(acc.dialog.getByRole('combobox', { name: 'Kind' })).toHaveValue(/budgetary/i);
      await expect(acc.dialog.getByRole('combobox', { name: 'Parent group' }).locator('option:checked')).toHaveText('No parent (top level)');
      await expect(acc.dialog.getByRole('checkbox', { name: /^Group account \(holds children, takes no postings\)$/ })).not.toBeChecked();
      await expect(acc.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
      const branch = acc.dialog.getByRole('combobox', { name: 'Branch restriction' });
      if (!(await branch.count())) qa.deviation(2, '"Branch restriction" ("All branches")', 'a list "Branches allowed to use this account" (none chosen: "Global account") and a list "Users allowed to use this account"');
      await acc.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(3, async () => {
      expect(await acc.add({ ...grp, code: grp.code.toLowerCase() })).toContain(`Account ${grp.code.toUpperCase()} created.`);
    });
    await qa.step(4, async () => {
      expect(await acc.add({ ...bank, parent: grp.code })).toContain(`Account ${bank.code.toUpperCase()} created.`);
    });
    await qa.step(5, async () => {
      const g = await acc.cells(grp.code);
      expect(g[3]).toBe('Group');
      const b = await acc.cells(bank.code);
      qa.note(5, `rows: ${g.join(' | ')} ; ${b.join(' | ')}`);
      expect(b.slice(2, 6)).toEqual(['Bank', 'Leaf', 'All branches', 'Active']);
      if (!b.join(' ').includes(`under ${grp.code.toUpperCase()}`)) qa.deviation(5, `"QA-1010" "under QA-1000"`, `the row does not name the parent: ${b.join(' | ')}`);
    });
  } finally {
    await retireAccount(page, bank.code);
  }
};

export const TC_APP019_007 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const r = new PostingRules(page);
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank'));
  const other = await createAccount(page, account(qa, 'QA-3010', 'QA Akun Uji 3010', 'Equity'));
  qa.note(3, 'the workbook gives "QA-3010" no name or kind; the test names it "QA Akun Uji 3010", kind Equity');
  const was = await ruleNow(page, CAPITAL);
  try {
    await qa.step(1, async () => {
      await page.goto('/en/finance');
      await page.getByRole('main').getByRole('link', { name: 'Budget posting rules' }).click();
      await expect(r.main.getByRole('heading', { level: 1, name: 'Budget posting rules' })).toBeVisible();
      await expect(r.main.getByRole('combobox', { name: 'Branch' })).toBeVisible();
      for (const k of [CAPITAL, OPERATING, 'Fund release', WITHDRAWAL]) await expect(r.row(k)).toHaveCount(1);
    });
    await qa.step(2, async () => {
      await r.open();
      const statuses = await Promise.all([CAPITAL, OPERATING, 'Fund release', WITHDRAWAL].map((k) => r.status(k)));
      qa.note(2, `BR-A: ${statuses.join(', ')}`);
    });
    await qa.step(3, async () => {
      expect(await r.save(CAPITAL, bank.code, other.code)).toContain(`${CAPITAL} rule saved.`);
      await r.open();
      expect(await r.status(CAPITAL)).toBe('Ready');
      await expect(r.row(CAPITAL).getByRole('button', { name: 'Remove' })).toBeVisible();
    });
    await qa.step(4, async () => {
      await expect(r.row(WITHDRAWAL)).toContainText('The bank account of the withdrawal');
      await expect(r.debit(WITHDRAWAL)).toHaveCount(0);
      await expect(r.credit(WITHDRAWAL)).toBeVisible();
    });
    await qa.step(5, async () => {
      expect(await r.remove(CAPITAL)).toContain(`${CAPITAL} rule removed.`);
      await r.open();
      expect(await r.status(CAPITAL)).toBe('Not set');
    });
  } finally {
    await restoreRule(page, CAPITAL, was);
    await retireAccount(page, bank.code);
    await retireAccount(page, other.code);
  }
};

export const TC_APP019_038 = async ({ page, qa }: CaseArgs): Promise<void> => {
  let main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Currencies' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Currencies' })).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Symbol', 'Lowest denomination', 'Base']);
    for (const f of ['Code', 'Name', 'Symbol', 'Lowest denomination', 'Date', 'Rate']) await expect(main.getByRole('textbox', { name: f })).toBeVisible();
    await expect(main.getByRole('checkbox', { name: 'Active' })).toBeVisible();
    for (const b of ['Save', 'Save rate']) await expect(main.getByRole('button', { name: b, exact: true })).toBeVisible();
    await expect(main.getByRole('combobox', { name: 'Branch' })).toBeVisible();
  });
  await qa.step(2, async () => {
    expect(await saveCurrency(page, { code: XTS, name: qa.prefix('X Mata uang uji'), symbol: 'X', lowest: '0.01' })).toContain('Saved.');
    main = await currencies(page);
    await expect(main.getByRole('row').filter({ has: page.getByRole('cell', { name: XTS, exact: true }) })).toHaveCount(1);
    qa.note(2, `"${XTS}" has no room for a token (three letters); a later run saves it again`);
  });
  await qa.step(3, async () => {
    expect(await saveRate(page, XTS, '15500')).toContain('Rate saved.');
  });
  await qa.step(4, async () => {
    main = await currencies(page);
    const listed = (await main.getByRole('list').last().getByRole('listitem').allInnerTexts()).join(' / ');
    qa.note(4, `rates shown: "${listed || 'none'}"; the screen says "Vouchers stay in IDR; the rate is stored only."`);
    await expect(main.getByText('Vouchers stay in IDR; the rate is stored only.', { exact: false })).toBeVisible();
  });
};

export const TC_APP019_040 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const cat = qa.code('X-KLIN');
  const rj = qa.code('X-RJ');
  const ri = qa.code('X-RI');
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Cost centres' }).first().click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Cost centres' })).toBeVisible();
    await expect(main.getByRole('combobox', { name: 'Branch' })).toBeVisible();
    for (const h of ['Categories', 'Cost centres', 'Pre-allocation']) await expect(main.getByRole('heading', { level: 2, name: h, exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    expect(await category(page, cat, qa.name('X Klinis'))).toContain('Saved.');
    await costCentres(page);
    await expect(section(page, 'Categories').getByRole('listitem').filter({ hasText: cat.toUpperCase() })).toHaveCount(1);
  });
  await qa.step(3, async () => {
    expect(await centre(page, { code: rj, name: qa.name('X Rawat Jalan'), category: cat })).toContain('Saved.');
    expect(await centre(page, { code: ri, name: qa.name('X Rawat Inap'), category: cat, parent: rj })).toContain('Saved.');
    await costCentres(page);
    const items = await section(page, 'Cost centres').getByRole('listitem').allInnerTexts();
    qa.note(3, `listed: ${items.filter((t) => t.includes(rj.toUpperCase()) || t.includes(ri.toUpperCase())).join(' / ')}`);
    expect(items.some((t) => t.includes(rj.toUpperCase()))).toBe(true);
    expect(items.some((t) => t.includes(ri.toUpperCase()))).toBe(true);
  });
  await qa.step(4, async () => {
    expect(await preAllocation(page, { code: qa.code('X-PA'), name: qa.name('X Pra-alokasi'), shares: [[rj, '6000'], [ri, '4000']] })).toContain('Saved.');
  });
  qa.notRun(5, 'a journal with a cost centre needs the Journals flow (U5)');
};

export const TC_APP019_062 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const main = page.getByRole('main');
  const debit = '1101';
  const credit = '4101';
  qa.note(2, 'debit 1101 Kas and credit 4101 Pendapatan stand in for "patient control" and "revenue" (HO has no finance configuration)');
  const service = qa.code('X-VISITE');
  await qa.step(1, async () => {
    await page.goto('/en/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Tariff mapping' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Tariff account mapping' })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Service code' })).toBeVisible();
    for (const l of ['Debit account', 'Credit account', 'Cost centre']) await expect(main.getByRole('combobox', { name: l })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Share %' })).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['Service code', 'Debit account', 'Credit account']);
  });
  await qa.step(2, async () => {
    expect(await tariff(page, { service, debit, credit })).toContain('Mapping saved.');
    await page.reload();
    await expect(main.getByRole('row').filter({ hasText: service.toUpperCase() }).or(main.getByRole('row').filter({ hasText: service }))).toHaveCount(1);
  });
  await qa.step(3, async () => {
    const ccs = (await main.getByRole('combobox', { name: 'Cost centre' }).first().locator('option').allInnerTexts()).slice(1);
    if (ccs.length < 2 || (await main.getByRole('combobox', { name: 'Cost centre' }).count()) < 2) {
      qa.note(3, `cost centres offered on HO: ${ccs.join(', ') || 'none'}; one share line on the form`);
      const toasts = ccs.length ? await tariff(page, { service: qa.code('X-VISITE'), debit, credit, shares: [[ccs[0].split(' ')[0], '100']] }) : [];
      qa.note(3, `with one centre at 100%: "${toasts.join(' / ')}"`);
      return;
    }
    expect(await tariff(page, { service: qa.code('X-VISITE'), debit, credit, shares: [[ccs[0].split(' ')[0], '60'], [ccs[1].split(' ')[0], '40']] })).toContain('Mapping saved.');
  });
  await qa.step(4, async () => {
    const toasts = await tariff(page, { service: qa.code('X-TIDAK-ADA'), debit, credit });
    qa.note(4, `a code the tariff does not have: "${toasts.join(' / ')}"`);
  });
  await qa.step(5, async () => {
    const row = main.getByRole('row').filter({ hasText: service.toUpperCase() }).or(main.getByRole('row').filter({ hasText: service }));
    expect(await row.getByRole('button').count()).toBe(0);
  });
};

export const CAPITAL = 'Allocation — capital';

export const OPERATING = 'Allocation — operating';

export const WITHDRAWAL = 'Fund withdrawal';

// ------------------------------------------------------------ currencies

export async function currencies(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/en/finance/currencies');
  await expect(main.getByRole('heading', { level: 1, name: 'Currencies' })).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => {});
  return main;
}

export async function saveCurrency(page: Page, v: { code: string; name: string; symbol?: string; lowest?: string }): Promise<string[]> {
  const main = await currencies(page);
  await main.getByRole('textbox', { name: 'Code' }).fill(v.code);
  await main.getByRole('textbox', { name: 'Name' }).fill(v.name);
  if (v.symbol !== undefined) await main.getByRole('textbox', { name: 'Symbol' }).fill(v.symbol);
  if (v.lowest !== undefined) await main.getByRole('textbox', { name: 'Lowest denomination' }).fill(v.lowest);
  return clickFor(page, main.getByRole('button', { name: 'Save', exact: true }));
}

export async function saveRate(page: Page, code: string, rate: string): Promise<string[]> {
  const main = await currencies(page);
  await main.getByRole('combobox', { name: 'Branch' }).selectOption({ index: 0 });
  await main.getByRole('combobox', { name: 'Code' }).selectOption({ label: code });
  await main.getByRole('textbox', { name: 'Date' }).fill(todayWib());
  await main.getByRole('textbox', { name: 'Rate' }).fill(rate);
  return clickFor(page, main.getByRole('button', { name: 'Save rate' }));
}

export const XTS = 'XTS';

// ------------------------------------------------------------ cost centres

export async function costCentres(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/en/finance/cost-centres');
  await expect(main.getByRole('heading', { level: 1, name: 'Cost centres' })).toBeVisible();
  await main.getByRole('combobox', { name: 'Branch' }).selectOption({ label: BR_A });
  await page.waitForLoadState('networkidle').catch(() => {});
  return main;
}

/** The form of one section of Cost centres (the inputs under its heading). */
export function section(page: Page, heading: string) {
  return page.getByRole('main').locator('section, form, div').filter({ has: page.getByRole('heading', { level: 2, name: heading, exact: true }) }).filter({ has: page.getByRole('button', { name: 'Save' }) }).last();
}

export async function centre(page: Page, v: { code: string; name: string; category: string; parent?: string }): Promise<string[]> {
  await costCentres(page);
  const s = section(page, 'Cost centres');
  await s.getByRole('textbox', { name: 'Code' }).fill(v.code);
  await s.getByRole('textbox', { name: 'Name' }).fill(v.name);
  const cat = s.getByRole('combobox', { name: 'Categories' });
  await cat.selectOption({ label: (await cat.locator('option').allInnerTexts()).find((o) => o.startsWith(v.category.toUpperCase()))! });
  if (v.parent) {
    const p = s.getByRole('combobox', { name: 'Parent' });
    await p.selectOption({ label: (await p.locator('option').allInnerTexts()).find((o) => o.includes(v.parent!.toUpperCase()))! });
  }
  return clickFor(page, s.getByRole('button', { name: 'Save' }));
}

export async function preAllocation(page: Page, v: { code: string; name: string; shares: [string, string][] }): Promise<string[]> {
  await costCentres(page);
  const s = section(page, 'Pre-allocation');
  await s.getByRole('textbox', { name: 'Code' }).fill(v.code);
  await s.getByRole('textbox', { name: 'Name' }).fill(v.name);
  for (const [i, [cc, share]] of v.shares.entries()) {
    const box = s.getByRole('combobox', { name: 'Cost centres' }).nth(i);
    await box.selectOption({ label: (await box.locator('option').allInnerTexts()).find((o) => o.includes(cc.toUpperCase()))! });
    await s.getByRole('textbox', { name: 'Share (basis points, 10000 = 100%)' }).nth(i).fill(share);
  }
  return clickFor(page, s.getByRole('button', { name: 'Save' }));
}

export async function category(page: Page, code: string, name: string): Promise<string[]> {
  await costCentres(page);
  const s = section(page, 'Categories');
  await s.getByRole('textbox', { name: 'Code' }).fill(code);
  await s.getByRole('textbox', { name: 'Name' }).fill(name);
  return clickFor(page, s.getByRole('button', { name: 'Save' }));
}

export async function tariff(page: Page, v: { service: string; debit?: string; credit?: string; shares?: [string, string][] }): Promise<string[]> {
  const main = page.getByRole('main');
  await page.goto('/en/finance/tariff-maps');
  await expect(main.getByRole('heading', { level: 1, name: 'Tariff account mapping' })).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => {});
  await main.getByRole('textbox', { name: 'Service code' }).fill(v.service);
  if (v.debit) await pickByPrefix(main.getByRole('combobox', { name: 'Debit account' }), v.debit);
  if (v.credit) await pickByPrefix(main.getByRole('combobox', { name: 'Credit account' }), v.credit);
  for (const [i, [cc, share]] of (v.shares ?? []).entries()) {
    await pickByPrefix(main.getByRole('combobox', { name: 'Cost centre' }).nth(i), cc);
    await main.getByRole('textbox', { name: 'Share %' }).nth(i).fill(share);
  }
  return clickFor(page, main.getByRole('button', { name: 'Save' }));
}

export async function pickByPrefix(box: import('@playwright/test').Locator, prefix: string): Promise<void> {
  const label = (await box.locator('option').allInnerTexts()).find((o) => o.toUpperCase().startsWith(prefix.toUpperCase()));
  if (!label) throw new Error(`no option ${prefix}`);
  await box.selectOption({ label });
}
