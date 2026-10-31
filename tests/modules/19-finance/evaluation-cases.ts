import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { CONFIRMED, ownItem, patient, sell } from '../05-pharmacy/helpers';
import { signedOutJourney, userPage } from '../shared/access';
import { account, Accounts, clickFor, createAccount, plain, retireAccount, Vouchers, Years } from './helpers';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { toastMark } from '../../../lib/assertions';
import { toastsAfter } from '../05-pharmacy/helpers';
/**
 * 19-finance.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): pharmacy vouchers, vouchers made by hand,
 * years and dates, document numbers, Finance without a session and two
 * accountants at once. No financial year is locked or made by these tests
 * (they are shared by every test; FY 2026 has no periods, found blocker 45).
 * "Accountant 2" is U4 (qa.admin3); the BR-B accountant is U6 (qa.kemayoran).
 */



/** The newest voucher rows whose number starts with a prefix. */
export async function newest(page: Page, prefix: string): Promise<string[]> {
  const v = new Vouchers(page);
  await v.open();
  return (await v.rows().allInnerTexts()).map(plain).filter((r) => r.startsWith(prefix));
}

export const TC_APP019_010 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const it = await ownItem(page, qa, PHARMACY.para.code, PHARMACY.para.name, [{ quantity: '10', expiry: addDays(todayWib(), 400) }]);
  const pt = await patient(page, qa);
  const before = new Set(await newest(page, 'SV-'));
  expect(await sell(page, pt, [{ item: it, requested: '2', issued: '2' }])).toContain(CONFIRMED);
  qa.note(1, `a sale of 2 × ${it.code} to ${pt.fullName} (not paid: the cashier counter is closed until 07:00 WIB)`);
  const v = new Vouchers(page);
  let sv = '';
  await qa.step(1, async () => {
    await page.waitForTimeout(5000);
    const added = (await newest(page, 'SV-')).filter((r) => !before.has(r));
    qa.note(1, `new SV- vouchers: ${added.join(' ; ') || 'none'}`);
    if (!added.length) return qa.blocked(1, 13);
    sv = added[0];
    if (!sv.includes(pt.fullName)) qa.deviation(1, 'The patient as party', `"${sv}"`);
    if (!/Posted/.test(sv)) qa.deviation(1, 'Status "Posted"', `"${sv}"`);
  });
  await qa.step(2, async () => {
    if (!sv) return qa.blocked(2, 13);
    await v.open();
    await v.rows().filter({ hasText: sv.split(' ')[0] }).first().getByRole('button', { name: 'Open' }).click();
    const detail = plain(await v.detail.innerText());
    qa.note(2, `"${detail.slice(0, 160)}"`);
    expect(detail).toMatch(/Pharmacy sale/);
  });
  await qa.step(3, async () => {
    const beforeSr = new Set(await newest(page, 'SR-'));
    const il = new IssueLinesPage(page);
    const row = () => il.rows().filter({ has: page.getByRole('cell', { name: it.name, exact: true }) });
    await il.open();
    await il.showRow(row, it.name);
    await row().first().getByRole('spinbutton').first().fill('1');
    const mark = await toastMark(page);
    await row().first().getByRole('button', { name: 'Return' }).click();
    expect(await toastsAfter(page, mark)).toContain('Returned.');
    await page.waitForTimeout(5000);
    const added = (await newest(page, 'SR-')).filter((r) => !beforeSr.has(r));
    qa.note(3, `new SR- vouchers: ${added.join(' ; ') || 'none'}`);
    if (!added.length) return qa.blocked(3, 13);
    if (!/Reversal/.test(added[0])) qa.deviation(3, 'Status "Posted · Reversal"', `"${added[0]}"`);
  });
};

export const TC_APP019_016 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const v = new Vouchers(page);
  const party = qa.name('QA Pihak Uji');
  expect(await v.create({ value: '100000', party, narration: party })).toContain('Voucher created');
  const row = async () => {
    await v.open();
    return v.rows().filter({ hasText: party }).first();
  };
  const actions = async () => (await (await row()).getByRole('button').allInnerTexts()).map(plain).filter(Boolean);
  const status = plain(await (await row()).innerText());
  qa.note(1, `VCH-1 of this test: "${status}"`);
  await qa.step(1, async () => {
    const a = await actions();
    if (!a.some((x) => /edit|ubah/i.test(x))) qa.deviation(1, 'The voucher can be edited while it is open', `the row offers ${a.join(', ') || 'nothing'}`);
  });
  await qa.step(2, async () => {
    const a = await actions();
    if (!a.some((x) => /approve|post|setujui/i.test(x))) qa.deviation(2, 'An approval and a posting step; the status becomes "Posted"', `the row offers ${a.join(', ')}; status "${status}"`);
  });
  await qa.step(3, async () => {
    const a = await actions();
    if (!a.some((x) => /cancel|reverse|batal/i.test(x))) qa.deviation(3, 'A cancellation, or a reversal voucher', `the row offers ${a.join(', ')}`);
  });
};

export const TC_APP019_017 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const y = new Years(page);
  await y.open();
  const years = await y.rows().evaluateAll((rs) => rs.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '')));
  qa.note(1, `financial years: ${years.map((c) => `${c[0]} ${c[2]}–${c[3]} ${c[6] ?? ''}`).join('; ')}`);
  const locked = years.find((c) => /locked|terkunci/i.test(c.join(' ')));
  const v = new Vouchers(page);
  const tryDate = async (date: string) => {
    await v.openForm();
    await v.field('Doc date').fill(date);
    const party = qa.name('QA Tanggal Uji');
    await v.field('Voucher value').fill('100000');
    await v.field('Party').fill(party);
    await v.field('Narration').fill(party);
    return clickFor(page, v.form.getByRole('button', { name: /^(Save|Saving…)$/ }));
  };
  await qa.step(1, async () => {
    if (!locked) return qa.notRun(1, 'no financial year is locked, and the tests lock none (the years are shared by every test)');
    const toasts = await tryDate(locked[2]);
    qa.note(1, `a voucher dated ${locked[2]} (locked year ${locked[0]}): "${toasts.join(' / ')}"`);
    if (toasts.includes('Voucher created')) qa.deviation(1, 'Refused: the financial year is locked', 'the voucher is created in the locked year');
  });
  await qa.step(2, async () => {
    const first = years.map((c) => c[2]).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0];
    if (!first) return qa.note(2, 'the start dates of the years are not shown as dates');
    const before = addDays(first, -1);
    const toasts = await tryDate(before);
    qa.note(2, `a voucher dated ${before} (the day before the first year): "${toasts.join(' / ')}"`);
    if (toasts.includes('Voucher created')) qa.deviation(2, 'Refused: no financial year for this date', `the voucher dated ${before} is created`);
  });
  qa.notRun(3, 'the year that contains today is not locked by the tests (the years are shared by every test)');
};

export const TC_APP019_019 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const v = new Vouchers(page);
  const no = qa.code('QA-VCH-001');
  const make = async (p: Page, docNo?: string) => {
    const vv = new Vouchers(p);
    await vv.openForm();
    if (docNo) await vv.field('Doc number').fill(docNo);
    const party = qa.name('QA Nomor Uji');
    await vv.field('Voucher value').fill('100000');
    await vv.field('Party').fill(party);
    await vv.field('Narration').fill(party);
    return clickFor(p, vv.form.getByRole('button', { name: /^(Save|Saving…)$/ }));
  };
  expect(await make(page, no)).toContain('Voucher created');
  await qa.step(1, async () => {
    const toasts = await make(page, no);
    qa.note(1, `"${no}" again: "${toasts.join(' / ')}"`);
    if (toasts.includes('Voucher created')) qa.deviation(1, 'A clear message that the number is already used. No voucher is added', `a second voucher "${no}" is added`);
  });
  await qa.step(2, async () => {
    const p6 = await userPage(browser, 'U6');
    try {
      const toasts = await make(p6, no);
      qa.note(2, `U6 (Kemayoran) with "${no}": "${toasts.join(' / ')}"`);
    } finally {
      await p6.context().close();
    }
  });
  const a2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const [v1, v2] = [new Vouchers(page), new Vouchers(a2)];
      await Promise.all([v1.openForm(), v2.openForm()]);
      const party = qa.name('QA Bersamaan');
      for (const x of [v1, v2]) {
        await x.field('Voucher value').fill('100000');
        await x.field('Party').fill(party);
        await x.field('Narration').fill(party);
      }
      const [m1, m2] = [await toastMark(page), await toastMark(a2)];
      await Promise.all([v1.form.getByRole('button', { name: /^(Save|Saving…)$/ }).click(), v2.form.getByRole('button', { name: /^(Save|Saving…)$/ }).click()]);
      const [t1, t2] = [await toastsAfter(page, m1), await toastsAfter(a2, m2)];
      await v.open();
      const nos = (await v.rows().filter({ hasText: party }).allInnerTexts()).map((r) => plain(r).split(' ')[0]);
      qa.note(3, `at the same moment: "${t1.join(' / ')}" and "${t2.join(' / ')}"; numbers ${nos.join(', ')}`);
      if (nos.length === 2 && nos[0] === nos[1]) qa.deviation(3, 'Two vouchers with different numbers', `both are ${nos[0]}`);
    });
  } finally {
    await a2.context().close();
  }
};

export const TC_APP019_032 = async ({ qa, browser }: { qa: Qa; browser: Browser }): Promise<void> => {
  await signedOutJourney(browser, qa, '/finance/vouchers', /\/(id|en)\/finance\/vouchers/);
  await qa.step(4, async () => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      await page.goto('/id/finance/accounts');
      await expect(page).toHaveURL(/\/login\?next=%2Ffinance%2Faccounts/, { timeout: 20_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } finally {
      await context.close();
    }
  });
};

export const TC_APP019_034 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const v = new Vouchers(page);
  await qa.step(1, async () => {
    const party = qa.name('QA Klik Ganda');
    await v.openForm();
    await v.field('Voucher value').fill('100000');
    await v.field('Party').fill(party);
    await v.field('Narration').fill(party);
    await v.form.getByRole('button', { name: /^(Save|Saving…)$/ }).dblclick();
    await page.waitForTimeout(3000);
    await v.open();
    const n = await v.rows().filter({ hasText: party }).count();
    qa.note(1, `double-click on "Save": ${n} voucher(s)`);
    if (n !== 1) qa.deviation(1, 'One voucher. The button is disabled while it reads "Saving…"', `${n} vouchers`);
  });
  const exp = await createAccount(page, account(qa, 'QA-5010', 'QA Beban Uji', 'Expense'));
  const a2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const [acc1, acc2] = [new Accounts(page), new Accounts(a2)];
      await acc1.edit(exp.code);
      await acc2.edit(exp.code);
      await acc1.fill({ name: qa.name('QA Beban Diubah') });
      const t1 = await acc1.save();
      const list = acc2.dialog.getByRole('listbox', { name: 'Branches allowed to use this account' });
      if (await list.count()) await list.getByRole('option').first().click();
      const t2 = await acc2.save();
      qa.note(2, `first: "${t1.join(' / ')}"; second (dialog opened before): "${t2.join(' / ')}"`);
      if (t2.some((t) => /updated|saved/i.test(t))) qa.deviation(2, 'The second is told that the account was changed in the meantime', `saved with no warning; the row reads ${(await acc1.cells(exp.code)).slice(0, 3).join(' | ')}`);
    });
  } finally {
    await a2.context().close();
    await retireAccount(page, exp.code);
  }
  await qa.step(3, async () => {
    await v.openForm();
    await v.field('Voucher value').fill('123');
    let warned = false;
    page.once('dialog', (x) => {
      warned = true;
      void x.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await v.open();
    if (!warned && !(await v.form.isVisible().catch(() => false))) qa.deviation(3, 'The input is kept, or the accountant is warned', 'the half-typed voucher is lost with no warning');
  });
};
