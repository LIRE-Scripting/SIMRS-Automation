import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { invalidFields } from '../18-settings/helpers';
import {
  Accounts,
  BR_A,
  PostingRules,
  Years,
  account,
  addMonths,
  clickFor,
  createAccount,
  ensureFyNext,
  restoreRule,
  retireAccount,
  ruleNow,
} from './helpers';
import { CAPITAL, category, centre, currencies, OPERATING, pickByPrefix, preAllocation, saveCurrency, saveRate, tariff, TC_APP019_001, TC_APP019_004, TC_APP019_007, TC_APP019_038, TC_APP019_040, TC_APP019_062, WITHDRAWAL } from './cases';
import { sourceOnSite } from '../../../lib/i18n';
import { NotOffered } from '../../../lib/not-offered';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of masters.spec.ts, shared with the end-to-end chains (chain.run). */

export const TC_APP019_002: QaBody = async ({ page, qa }) => {
  const y = new Years(page);
  const fy = await ensureFyNext(page);
  await qa.step(1, async () => {
    await y.open();
    await y.row(fy).getByRole('button', { name: 'Periods' }).click();
    await expect(y.dialog).toHaveAccessibleName(`Periods of ${fy}`);
    await expect(y.dialog.getByRole('listitem')).toHaveCount(12);
  });
  await qa.step(2, async () => {
    const [, , start, end] = await y.cells(fy);
    // A line reads "1 2028-01-01 – 2028-01-31" with the buttons "Lock" and "Mark adjustment" (an open period).
    const lines = (await y.dialog.getByRole('listitem').allInnerTexts()).map((t) => t.match(/(\d+)\s+(\d{4}-\d{2}-\d{2})\s+–\s+(\d{4}-\d{2}-\d{2})/)!.slice(1));
    for (const [i, l] of lines.entries()) {
      expect(l[0]).toBe(String(i + 1));
      await expect(y.dialog.getByRole('listitem').nth(i).getByRole('button', { name: 'Lock' })).toBeVisible();
      if (i > 0) expect(l[1]).toBe(addDays(lines[i - 1][2], 1));
    }
    qa.deviation(2, 'Each line has … "Open"', 'a line shows no status; an open period offers "Lock" and "Mark adjustment"');
    if (start) expect(lines[0][1]).toBe(start);
    if (end) expect(lines[11][2]).toBe(end);
  });
};

export const TC_APP019_003: QaBody = async ({ page, qa }) => {
  const y = new Years(page);
  const fy = await ensureFyNext(page);
  try {
    await qa.step(1, async () => {
      await y.open();
      expect(await clickFor(page, y.row(fy).getByRole('button', { name: 'Lock' }))).toContain('Financial year locked');
      await y.open();
      expect((await y.cells(fy))[6]).toBe('Locked');
      await expect(y.row(fy).getByRole('button', { name: 'Unlock' })).toBeVisible();
    });
    await qa.step(2, async () => {
      expect(await clickFor(page, y.row(fy).getByRole('button', { name: 'Unlock' }))).toContain('Financial year unlocked');
      await y.open();
      expect((await y.cells(fy))[6]).toBe('Open');
    });
  } finally {
    await y.open();
    if (await y.row(fy).getByRole('button', { name: 'Unlock' }).count()) await clickFor(page, y.row(fy).getByRole('button', { name: 'Unlock' }));
  }
};

export const TC_APP019_005: QaBody = async ({ page, qa }) => {
  const acc = new Accounts(page);
  const exp = await createAccount(page, account(qa, 'QA-5010', 'QA Beban Uji', 'Expense'));
  await qa.step(1, async () => {
    await acc.edit(exp.code);
    await expect(acc.dialog).toHaveAccessibleName(`Edit account ${exp.code.toUpperCase()}`);
    await expect(acc.dialog.getByRole('textbox', { name: 'Name' })).toHaveValue(exp.name);
    await expect(acc.dialog.getByRole('combobox', { name: 'Kind' })).toHaveValue(/expense/i);
  });
  await qa.step(2, async () => {
    await acc.fill({ branches: [BR_A] });
    expect(await acc.save()).toContain('Account updated.');
    expect((await acc.cells(exp.code))[4]).toBe('HO');
  });
  await qa.step(3, async () => {
    await acc.edit(exp.code);
    await acc.fill({ active: false });
    expect(await acc.save()).toContain('Account updated.');
    expect((await acc.cells(exp.code))[5]).toBe('Inactive');
  });
};

export const TC_APP019_006: QaBody = async ({ page, qa }) => {
  const acc = new Accounts(page);
  const codes = () => acc.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 2).map((r) => r.querySelectorAll('td')[0]?.textContent?.trim() ?? ''));
  const kinds = () => acc.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 2).map((r) => r.querySelectorAll('td')[2]?.textContent?.trim() ?? ''));
  await qa.step(1, async () => {
    await acc.open();
    await expect(acc.main.getByRole('columnheader')).toHaveText(['Code', 'Name', 'Kind', 'Type', 'Branch', 'Status', 'Actions']);
    const c = await codes();
    expect(c).toEqual([...c].sort());
  });
  await qa.step(2, async () => {
    await acc.main.getByRole('searchbox', { name: 'Search code or name' }).fill('bank');
    await expect.poll(async () => (await acc.rows().allInnerTexts()).every((t) => /bank/i.test(t))).toBe(true);
    const n = (await codes()).length;
    qa.note(2, `${n} account(s) for "bank"`);
  });
  await qa.step(3, async () => {
    await acc.main.getByRole('searchbox', { name: 'Search code or name' }).fill('');
    await acc.main.getByRole('combobox', { name: 'Kind' }).selectOption('Expense');
    await expect.poll(async () => [...new Set(await kinds())]).toEqual(['Expense']);
  });
  await qa.step(4, async () => {
    await acc.main.getByRole('combobox', { name: 'Kind' }).selectOption('All kinds');
    await expect.poll(async () => new Set(await kinds()).size).toBeGreaterThan(1);
  });
};

export const TC_APP019_020: QaBody = async ({ page, qa }) => {
  const y = new Years(page);
  const latest = await y.latestEnd();
  const open = (await y.rows().allInnerTexts()).find((t) => /\bOpen\b/.test(t) && t.includes(todayWib().slice(0, 4)))?.split('\t')[0]?.trim() ?? todayWib().slice(0, 4);
  const start = addDays(latest, 1);
  await qa.step(1, async () => {
    const inside = `${todayWib().slice(0, 4)}-03-01`;
    const toasts = await y.create({ code: qa.code('QA-FY'), description: qa.name('QA Tahun buku uji'), start: inside, end: addDays(addMonths(inside, 12), -1), finalization: addMonths(inside, 15) });
    const text = [...toasts, await y.dialog.innerText().catch(() => '')].join(' ');
    expect(text).toContain('The dates overlap financial year');
    qa.note(1, `"${text.match(/The dates overlap financial year [^.\s]+/)?.[0]}" (the dates also reach into the year after ${open})`);
  });
  await qa.step(2, async () => {
    const toasts = await y.create({ code: open, description: qa.name('QA Tahun buku uji'), finalization: addMonths(start, 15) });
    expect([...toasts, await y.dialog.innerText().catch(() => '')].join(' ')).toContain('That financial year code is already used.');
  });
  await qa.step(3, async () => {
    const toasts = await y.create({ code: qa.code('QA-FY'), description: qa.name('QA Tahun buku uji'), start, end: addDays(addMonths(start, 6), -1), finalization: addMonths(start, 9) });
    expect([...toasts, await y.dialog.innerText().catch(() => '')].join(' ')).toContain('This period type needs at least 12 periods; these dates give 6.');
  });
  await qa.step(4, async () => {
    const shown = await y.create({ code: qa.code('QA-FY'), description: qa.name('QA Tahun buku uji'), start, end: addDays(start, -10), finalization: addMonths(start, 15) });
    const toasts = [...shown, (await y.dialog.innerText().catch(() => '')).split('\n').filter((l) => /end|date/i.test(l) && !/^(End date|Start date|Account finalization date)$/.test(l.trim())).join(' ')].filter(Boolean);
    expect(toasts.join(' ')).not.toContain('Financial year created');
    qa.note(4, `toast "${toasts.join(' / ')}"`);
    if (!toasts.some((t) => /end date is before/i.test(t))) qa.deviation(4, 'A message that the end date is before the start date', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(5, async () => {
    const code = qa.code('QA-FY');
    const toasts = await y.create({ code, description: qa.name('QA Tahun buku uji'), finalization: addDays(start, -30) });
    qa.note(5, `finalization before the start: toast "${toasts.join(' / ')}"`);
    if (toasts.includes('Financial year created')) qa.deviation(5, 'Refused, or a warning', `the year ${code} is saved; the finalization date is not compared with the year`);
  });
};

export const TC_APP019_021: QaBody = async ({ page, qa }) => {
  const y = new Years(page);
  const fy = await ensureFyNext(page);
  await qa.step(1, async () => {
    await y.open();
    const buttons = (await y.row(fy).getByRole('button').allInnerTexts()).map((b) => b.trim());
    if (!buttons.some((b) => /edit/i.test(b))) qa.deviation(1, 'The year can be edited while nothing is booked in it', `the row offers ${buttons.join(', ')}`);
  });
  await qa.step(2, async () => {
    const buttons = (await y.row(fy).getByRole('button').allInnerTexts()).map((b) => b.trim());
    if (!buttons.some((b) => /delete|remove/i.test(b))) qa.deviation(2, 'A delete, offered while the year is empty', `the row offers ${buttons.join(', ')}`);
  });
  await qa.step(3, async () => {
    await y.open();
    // The list shows its first years only; the years the tests make each run can push 2026 off it (found blocker 40).
    if (!(await y.row(todayWib().slice(0, 4)).count())) throw new NotOffered(`${todayWib().slice(0, 4)} is not among the years the list shows (found blocker 40)`);
    await y.row(todayWib().slice(0, 4)).getByRole('button', { name: 'Periods' }).click();
    const lines = await y.dialog.getByRole('listitem').count();
    const locks = await y.dialog.getByRole('button', { name: 'Lock' }).count();
    qa.note(3, `FY-OPEN lists ${lines} period(s)`);
    if (!locks) qa.deviation(3, 'A lock per period', lines ? 'the periods have no lock' : 'FY-OPEN lists no periods');
  });
  await qa.step(4, async () => {
    qa.note(4, 'run on FY-NEXT instead of FY-OPEN: locking the open year would stop the postings of every other module');
    await y.open();
    const toasts = await clickFor(page, y.row(fy).getByRole('button', { name: 'Lock' }));
    const asked = await page.getByRole('alertdialog').count();
    if (!asked) qa.deviation(4, 'A question to confirm before the year is locked', `locked at once ("${toasts.join(' / ')}")`);
    await y.open();
    if (await y.row(fy).getByRole('button', { name: 'Unlock' }).count()) await clickFor(page, y.row(fy).getByRole('button', { name: 'Unlock' }));
  });
};

export const TC_APP019_022: QaBody = async ({ page, qa }) => {
  const acc = new Accounts(page);
  const r = new PostingRules(page);
  const grp = await createAccount(page, account(qa, 'QA-1000', 'QA Aset Lancar', 'Asset', { group: true }));
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank', { parent: grp.code }));
  const other = await createAccount(page, account(qa, 'QA-3010', 'QA Akun Uji 3010', 'Equity'));
  const was = await ruleNow(page, CAPITAL);
  try {
    expect(await (await r.open(), r.save(CAPITAL, bank.code, other.code))).toContain(`${CAPITAL} rule saved.`);
    await qa.step(1, async () => {
      expect(await acc.add({ code: bank.code.toLowerCase(), name: qa.name('QA Bank Uji'), kind: 'Bank' })).toContain('This account code already exists.');
    });
    await qa.step(2, async () => {
      await acc.edit(grp.code);
      await acc.fill({ group: false });
      expect(await acc.save()).toContain('An account with children must stay a group.');
    });
    await qa.step(3, async () => {
      await acc.edit(bank.code);
      await acc.fill({ kind: 'Cash' });
      expect(await acc.save()).toContain('The account is used by a posting rule or voucher; its kind and type cannot change.');
    });
    await qa.step(4, async () => {
      await acc.edit(grp.code);
      const options = await acc.dialog.getByRole('combobox', { name: 'Parent group' }).locator('option').allInnerTexts();
      expect(options.some((o) => o.startsWith(grp.code.toUpperCase()))).toBe(false);
    });
    await qa.step(5, async () => {
      await acc.open();
      await acc.main.getByRole('button', { name: 'New account' }).click();
      const code = acc.dialog.getByRole('textbox', { name: 'Code' });
      await code.fill('Q'.repeat(31));
      expect((await code.inputValue()).length).toBe(30);
    });
  } finally {
    await restoreRule(page, CAPITAL, was);
    await retireAccount(page, bank.code);
    await retireAccount(page, other.code);
  }
};

export const TC_APP019_023: QaBody = async ({ page, qa }) => {
  const acc = new Accounts(page);
  const r = new PostingRules(page);
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank'));
  const other = await createAccount(page, account(qa, 'QA-3010', 'QA Akun Uji 3010', 'Equity'));
  const was = await ruleNow(page, CAPITAL);
  try {
    await r.open();
    expect(await r.save(CAPITAL, bank.code, other.code)).toContain(`${CAPITAL} rule saved.`);
    await qa.step(1, async () => {
      await acc.edit(bank.code);
      await acc.fill({ active: false });
      const toasts = await acc.save();
      if (toasts.includes('Account updated.')) qa.deviation(1, 'A warning that a posting rule uses the account', 'set inactive at once: toast "Account updated." and no warning');
    });
    await qa.step(2, async () => {
      await r.open();
      const status = await r.status(CAPITAL);
      qa.note(2, `the rule reads "${status}"`);
      expect(status).not.toBe('Ready');
    });
  } finally {
    await restoreRule(page, CAPITAL, was);
    await retireAccount(page, other.code);
  }
};

export const TC_APP019_026: QaBody = async ({ page, qa }) => {
  const r = new PostingRules(page);
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank'));
  await createAccount(page, account(qa, 'QA-3010', 'QA Akun Uji 3010', 'Equity'));
  const exp = await createAccount(page, account(qa, 'QA-5010', 'QA Beban Uji', 'Expense', { active: false }));
  const grp = await createAccount(page, account(qa, 'QA-1000', 'QA Aset Lancar', 'Asset', { group: true }));
  const was = { op: await ruleNow(page, OPERATING), wd: await ruleNow(page, WITHDRAWAL) };
  try {
    await qa.step(1, async () => {
      await r.open();
      // No account chosen: prerequisite S09 left an account on the rule, so both boxes are put on "Choose an account".
      for (const box of [r.debit(OPERATING), r.credit(OPERATING)]) await box.selectOption('');
      expect(await r.save(OPERATING)).toContain('Choose the debit and credit accounts.');
    });
    await qa.step(2, async () => {
      await r.open();
      expect(await r.save(OPERATING, bank.code, bank.code)).toContain('Debit and credit accounts must differ.');
    });
    await qa.step(3, async () => {
      await r.open();
      const options = await r.debit(OPERATING).locator('option').allInnerTexts();
      expect(options.some((o) => o.startsWith(exp.code.toUpperCase()))).toBe(false);
      expect(options.some((o) => o.startsWith(grp.code.toUpperCase()))).toBe(false);
    });
    await qa.step(4, async () => {
      await r.open();
      expect(await r.save(WITHDRAWAL)).toContain('Choose the credit account.');
    });
  } finally {
    await restoreRule(page, OPERATING, was.op);
    await restoreRule(page, WITHDRAWAL, was.wd);
    await retireAccount(page, bank.code);
  }
};

// ------------------------------------------------------------ configuration

export const CONFIG_BRANCH = 'BR02 · Daan Mogot';

export async function configuration(page: Page, branch = CONFIG_BRANCH) {
  const main = page.getByRole('main');
  await page.goto('/id/finance/configuration');
  await expect(main.getByRole('heading', { level: 1, name: 'Finance configuration' })).toBeVisible();
  await main.getByRole('combobox', { name: 'Branch' }).selectOption({ label: branch });
  await page.waitForLoadState('networkidle').catch(() => {});
  return main;
}

export const TC_APP019_035: QaBody = async ({ page, qa }) => {
  const bank = await createAccount(page, account(qa, 'QA-1010', 'QA Bank Uji', 'Bank'));
  let main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Configuration' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Finance configuration' })).toBeVisible();
    for (const l of ['Branch', 'Current financial year']) await expect(main.getByRole('combobox', { name: l })).toBeVisible();
    for (const c of ['Automatic account code', 'Refuse a negative cash or bank balance', 'Internal audit approval before paying bills', 'Tenant posts collections to an external ERP'])
      await expect(main.getByRole('checkbox', { name: c })).toBeVisible();
    for (const f of ['Back-dated days', 'Instrument validity (days)']) await expect(main.getByRole('textbox', { name: f })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Control accounts' })).toBeVisible();
    await expect(main.getByText('Users allowed to transact').first()).toBeVisible();
    await expect(main.getByText('Imprest eligibility').first()).toBeVisible();
    await expect(main.getByRole('button', { name: 'Save' }).last()).toBeVisible();
  });
  await qa.step(2, async () => {
    main = await configuration(page);
    const said = new RegExp(['This branch has no finance configuration.', 'This branch already has a configuration. Saving updates it.'].map(sourceOnSite).join('|'));
    const text = (await main.getByText(said).first().innerText()).trim();
    qa.note(2, `Daan Mogot: "${text}"`);
  });
  await qa.step(3, async () => {
    await main.getByRole('combobox', { name: 'Current financial year' }).selectOption({ label: todayWib().slice(0, 4) });
    await main.getByRole('textbox', { name: 'Back-dated days' }).fill('3');
    await main.getByRole('textbox', { name: 'Instrument validity (days)' }).fill('90');
    const cash = main.getByRole('combobox', { name: 'Cash', exact: true });
    const offered = await cash.locator('option').allInnerTexts();
    expect(offered.some((o) => o.startsWith(bank.code.toUpperCase()))).toBe(true);
    for (const [box, code] of [['Cash', '1101'], ['Bank', bank.code], ['Patient cash', '1101'], ['Patient bank', bank.code], ['Patient control', '1101'], ['Revenue', '4101']] as const) {
      const sel = main.getByRole('combobox', { name: box, exact: true });
      const label = (await sel.locator('option').allInnerTexts()).find((o) => o.startsWith(code.toUpperCase()));
      await sel.selectOption({ label: label! });
    }
    qa.note(3, `Cash, Patient cash and Patient control: 1101 Kas; Bank and Patient bank: the test bank account; Revenue: 4101 Pendapatan (the workbook names no accounts)`);
  });
  await qa.step(4, async () => {
    const user = main.getByRole('combobox', { name: 'Users allowed to transact' });
    const label = (await user.locator('option').allInnerTexts()).find((o) => /· rs\.admin2$/.test(o)) ?? (await user.locator('option').allInnerTexts())[1];
    await user.selectOption({ label });
    await main.getByRole('button', { name: 'Add user' }).click();
    const line = main.getByRole('listitem').or(main.getByRole('row')).filter({ has: page.getByRole('checkbox', { name: 'Super user' }) }).last();
    qa.note(4, `user "${label}"`);
    if (!(await line.isVisible({ timeout: 3_000 }).catch(() => false))) {
      qa.deviation(4, 'A line with the user, the limit and the tick box "Super user"', 'no line appears after "Add user"; there is no input for the limit');
      return;
    }
    await line.getByRole('textbox').or(line.getByRole('spinbutton')).first().fill('50000000');
  });
  await qa.step(5, async () => {
    expect(await clickFor(page, main.getByRole('button', { name: 'Save' }).last())).toContain('Configuration saved.');
  });
  await qa.step(6, async () => {
    for (const route of ['/id/finance/collections', '/id/finance/year-end']) {
      await page.goto(route);
      const branch = page.getByRole('main').getByRole('combobox', { name: 'Branch' });
      await page.waitForLoadState('networkidle').catch(() => {});
      if (!(await branch.count())) {
        qa.note(6, `${route} has no branch list; it shows the branch of the header (Podomoro, U1), which has no configuration`);
        continue;
      }
      await branch.selectOption({ label: CONFIG_BRANCH });
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.getByRole('main').getByText(/has no finance configuration/)).toHaveCount(0);
    }
  });
};

export const TC_APP019_036: QaBody = async ({ page, qa }) => {
  let main = page.getByRole('main');
  await qa.step(1, async () => {
    main = await configuration(page);
    await main.getByRole('combobox', { name: 'Current financial year' }).selectOption({ index: 0 });
    const toasts = await clickFor(page, main.getByRole('button', { name: 'Save' }).last());
    expect(toasts).not.toContain('Configuration saved.');
    if (!toasts.includes('A financial year is required.') && !(await main.getByText('A financial year is required.').count())) {
      const invalid = await invalidFields(main);
      qa.deviation(1, 'The text "A financial year is required."', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
    }
  });
  await qa.step(2, async () => {
    main = await configuration(page);
    await main.getByRole('combobox', { name: 'Current financial year' }).selectOption({ label: todayWib().slice(0, 4) });
    for (const b of await main.getByRole('button', { name: /^Remove/ }).all()) await b.click().catch(() => {});
    const toasts = await clickFor(page, main.getByRole('button', { name: 'Save' }).last());
    if (!toasts.includes('At least one user must be allowed to transact.') && !(await main.getByText('At least one user must be allowed to transact.').count())) {
      qa.deviation(2, 'The text "At least one user must be allowed to transact."', `toast "${toasts.join(' / ')}": saved with no user ("Add user" adds no line, TC-APP019-035)`);
    }
  });
  await qa.step(3, async () => {
    main = await configuration(page);
    const add = main.getByRole('button', { name: /Add (imprest|row)/i });
    if (!(await add.count())) {
      qa.note(3, 'no button to add an imprest row was found');
      return;
    }
    const inputs = await main.locator('input, select').count();
    await add.first().click();
    if ((await main.locator('input, select').count()) === inputs) {
      qa.deviation(3, 'The text that imprest eligibility needs a type, an amount, an account and a department, employee or party', '"Add row" adds no row to fill');
      return;
    }
    const type = main.getByRole('textbox', { name: /type/i }).or(main.getByRole('combobox', { name: /type/i })).last();
    if ((await type.evaluate((e) => e.tagName)) === 'SELECT') await type.selectOption({ index: 1 });
    else await type.fill(qa.code('X-ATK'));
    const toasts = await clickFor(page, main.getByRole('button', { name: 'Save' }).last());
    const shown = await main.getByText(/needs a type, an amount|Imprest eligibility needs/i).count();
    if (toasts.includes('Configuration saved.')) {
      qa.deviation(3, 'The text that imprest eligibility needs a type, an amount, an account and a department, employee or party', 'the row with only a type is saved ("Configuration saved.")');
      return;
    }
    if (!shown) {
      const invalid = await invalidFields(main);
      qa.deviation(3, 'The text that imprest eligibility needs a type, an amount, an account and a department, employee or party', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
    }
  });
  qa.notRun(4, 'needs a tenant with no financial year');
};

export const TC_APP019_037: QaBody = async ({ qa }) => {
  // Each step saves a payment or a journal dated today (step 2: yesterday): none can be saved, the year 2026 has no periods (found blocker 45).
  for (const st of [1, 2, 3]) qa.blocked(st, 45);
};

export const TC_APP019_039: QaBody = async ({ page, qa }) => {
  const idr = async () => (await (await currencies(page)).getByRole('row').filter({ has: page.getByRole('cell', { name: 'IDR', exact: true }) }).getByRole('cell').allInnerTexts()).map((t) => t.trim());
  const before = await idr();
  try {
    await qa.step(1, async () => {
      const toasts = await saveCurrency(page, { code: 'IDR', name: qa.prefix('X Rupiah uji') });
      const after = await idr();
      qa.note(1, `toast "${toasts.join(' / ')}"; IDR now reads ${after.join(' | ')}`);
    });
  } finally {
    const now = await idr();
    if (now[1] !== before[1]) await saveCurrency(page, { code: 'IDR', name: before[1], symbol: before[2], lowest: before[3] });
  }
  await qa.step(2, async () => {
    const zero = await saveRate(page, 'USD', '0');
    const negative = await saveRate(page, 'USD', '-1');
    qa.note(2, `rate 0: "${zero.join(' / ')}"; rate -1: "${negative.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const two = await saveCurrency(page, { code: 'XT', name: qa.prefix('X Mata uang uji') });
    const five = await saveCurrency(page, { code: 'XTSXX', name: qa.prefix('X Mata uang uji') });
    qa.note(3, `"XT": "${two.join(' / ')}"; "XTSXX": "${five.join(' / ')}"`);
  });
};

export const TC_APP019_041: QaBody = async ({ page, qa }) => {
  const cat = qa.code('X-KLIN');
  const rj = qa.code('X-RJ');
  const ri = qa.code('X-RI');
  expect(await category(page, cat, qa.name('X Klinis'))).toContain('Saved.');
  expect(await centre(page, { code: rj, name: qa.name('X Rawat Jalan'), category: cat })).toContain('Saved.');
  expect(await centre(page, { code: ri, name: qa.name('X Rawat Inap'), category: cat, parent: rj })).toContain('Saved.');
  await qa.step(1, async () => {
    const toasts = await preAllocation(page, { code: qa.code('X-PA'), name: qa.name('X Pra-alokasi'), shares: [[rj, '6000'], [ri, '3000']] });
    const shown = await page.getByRole('main').getByText('The shares must total 100%.').count();
    expect(toasts).not.toContain('Saved.');
    if (!shown && !toasts.includes('The shares must total 100%.')) qa.deviation(1, 'The text "The shares must total 100%."', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await centre(page, { code: rj, name: qa.name('X Rawat Jalan'), category: cat, parent: rj }).catch((e) => [`not offered: ${String(e).slice(0, 60)}`]);
    const shown = await page.getByRole('main').getByText('A cost centre cannot sit under itself.').count();
    qa.note(2, `the centre under itself: "${toasts.join(' / ')}"${shown ? ' (text shown)' : ''}`);
    expect(toasts).not.toContain('Saved.');
  });
  qa.notRun(3, 'needs the Journals flow (U5)');
  qa.notRun(4, 'needs the Journals flow (U5) and a cost centre of another branch');
};

// ------------------------------------------------------------ account maps

export async function accountMaps(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/id/finance/account-maps');
  await expect(main.getByRole('heading', { level: 1, name: 'Account maps' })).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => {});
  return main;
}

export const mapSection = (page: Page, heading: string) =>
  page.getByRole('main').locator('section, form, div').filter({ has: page.getByRole('heading', { level: 2, name: heading, exact: true }) }).filter({ has: page.getByRole('button', { name: 'Save' }) }).last();

export const TC_APP019_042: QaBody = async ({ page, qa }) => {
  const tax = await createAccount(page, account(qa, 'QA-2110', 'QA PPN Keluaran Uji', 'Liability'));
  const exp = await createAccount(page, account(qa, 'QA-5010', 'QA Beban Uji', 'Expense'));
  const atk = qa.code('X-ATK');
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Account maps' }).first().click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Account maps' })).toBeVisible();
    for (const h of ['Tax code', 'Salary component', 'Imprest transaction type']) {
      await expect(main.getByRole('heading', { level: 2, name: h })).toBeVisible();
      await expect(mapSection(page, h).getByRole('combobox', { name: 'Account' })).toBeVisible();
    }
  });
  await qa.step(2, async () => {
    await accountMaps(page);
    const s = mapSection(page, 'Tax code');
    await pickByPrefix(s.getByRole('combobox', { name: 'Tax code' }), 'QA-PPN');
    qa.note(2, 'a QA tax code (18 Settings) instead of the seed PPN, so the real PPN keeps its account');
    await pickByPrefix(s.getByRole('combobox', { name: 'Account' }), tax.code);
    expect(await clickFor(page, s.getByRole('button', { name: 'Save' }))).toContain('Saved.');
  });
  await qa.step(3, async () => {
    await accountMaps(page);
    const s = mapSection(page, 'Salary component');
    await s.getByRole('combobox', { name: 'Side' }).selectOption('Expenditure');
    await pickByPrefix(s.getByRole('combobox', { name: 'Account' }), exp.code);
    const component = await s.getByRole('combobox', { name: 'Salary component' }).evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
    qa.note(3, `component "${component}" (the site has GAPOK, POTBPJS and TUNJAB, found blocker 37)`);
    expect(await clickFor(page, s.getByRole('button', { name: 'Save' }))).toContain('Saved.');
  });
  await qa.step(4, async () => {
    await accountMaps(page);
    const s = mapSection(page, 'Imprest transaction type');
    await s.getByRole('textbox', { name: 'Code' }).fill(atk);
    await s.getByRole('textbox', { name: 'Description' }).fill(qa.name('X Alat tulis'));
    await pickByPrefix(s.getByRole('combobox', { name: 'Account' }), exp.code);
    expect(await clickFor(page, s.getByRole('button', { name: 'Save' }))).toContain('Saved.');
    await page.goto('/id/finance/imprest');
    await page.waitForLoadState('networkidle').catch(() => {});
    const offered = (await page.getByRole('main').getByRole('combobox', { name: /Transaction type/i }).locator('option').allInnerTexts().catch(() => [])).some((o) => o.includes(atk.toUpperCase()));
    qa.note(4, `the type is ${offered ? '' : 'not '}offered on Imprest under "Transaction type"`);
  });
  await qa.step(5, async () => {
    const main = await accountMaps(page);
    const listed = (await main.getByRole('list').allInnerTexts()).join(' / ');
    qa.note(5, `shown on the screen: "${listed.slice(0, 200)}"`);
  });
};

export const TC_APP019_043: QaBody = async ({ page, qa }) => {
  const a1 = await createAccount(page, account(qa, 'QA-2110', 'QA PPN Keluaran Uji', 'Liability'));
  const a2 = await createAccount(page, account(qa, 'QA-2111', 'QA PPN Keluaran Uji', 'Liability'));
  const off = await createAccount(page, account(qa, 'QA-2112', 'QA Akun nonaktif', 'Liability', { active: false }));
  const grp = await createAccount(page, account(qa, 'QA-2000', 'QA Kewajiban', 'Liability', { group: true }));
  await qa.step(1, async () => {
    const save = async (acc: string) => {
      await accountMaps(page);
      const s = mapSection(page, 'Tax code');
      await pickByPrefix(s.getByRole('combobox', { name: 'Tax code' }), 'QA-PPN');
      await pickByPrefix(s.getByRole('combobox', { name: 'Account' }), acc);
      return clickFor(page, s.getByRole('button', { name: 'Save' }));
    };
    const first = await save(a1.code);
    const second = await save(a2.code);
    qa.note(1, `first "${first.join(' / ')}", second with another account "${second.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    await accountMaps(page);
    const options = await mapSection(page, 'Tax code').getByRole('combobox', { name: 'Account' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.startsWith(off.code.toUpperCase()))).toBe(false);
    expect(options.some((o) => o.startsWith(grp.code.toUpperCase()))).toBe(false);
  });
};

// ------------------------------------------------------------ bill adjustment and tariff mapping

export const TC_APP019_056: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Bill adjustment' }).first().click();
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Bill adjustment' })).toBeVisible();
    for (const l of ['Group', 'Account']) await expect(main.getByRole('combobox', { name: l })).toBeVisible();
    for (const b of ['Show', 'Auto adjust', 'Save', 'Re-open']) await expect(main.getByRole('button', { name: b })).toBeVisible();
    for (const h of ['Advance', 'Bill']) await expect(main.getByRole('heading', { level: 2, name: h })).toBeVisible();
  });
  for (const s of [2, 3, 4, 5, 6]) qa.notRun(s, 'needs a party account with an approved advance and open bills (Payments, U5)');
};

export const TC_APP019_057: QaBody = async ({ page, qa }) => {
  for (const s of [1, 2, 3]) qa.notRun(s, 'needs a party account with an approved advance and open bills (Payments, U5)');
  await qa.step(4, async () => {
    await page.goto('/id/finance/bill-adjustments');
    const main = page.getByRole('main');
    const save = main.getByRole('button', { name: 'Save' });
    if (await save.isDisabled()) qa.note(4, '"Save" is disabled with nothing chosen');
    else {
      const toasts = await clickFor(page, save, 4_000);
      qa.note(4, toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing is said');
    }
  });
};

export const TC_APP019_063: QaBody = async ({ page, qa }) => {
  const service = qa.code('X-VISITE');
  expect(await tariff(page, { service, debit: '1101', credit: '4101' })).toContain('Mapping saved.');
  await qa.step(1, async () => {
    const toasts = await tariff(page, { service, debit: '1101', credit: '4101' });
    const shown = await page.getByRole('main').getByText('This service is already mapped.').count();
    expect(shown || toasts.includes('This service is already mapped.')).toBeTruthy();
  });
  await qa.step(2, async () => {
    const ccs = (await page.getByRole('main').getByRole('combobox', { name: 'Cost centre' }).first().locator('option').allInnerTexts()).slice(1);
    if (!ccs.length) {
      qa.note(2, 'HO has no cost centre to split on');
      return;
    }
    const toasts = await tariff(page, { service: qa.code('X-VISITE'), debit: '1101', credit: '4101', shares: [[ccs[0].split(' ')[0], '60']] });
    const shown = await page.getByRole('main').getByText('Shares must total 100%.').count();
    expect(toasts).not.toContain('Mapping saved.');
    expect(shown || toasts.includes('Shares must total 100%.')).toBeTruthy();
  });
  await qa.step(3, async () => {
    const toasts = await tariff(page, { service: qa.code('X-VISITE'), debit: '1101' });
    expect(toasts).not.toContain('Mapping saved.');
    const invalid = await invalidFields(page.getByRole('main'));
    qa.note(3, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
  });
};
