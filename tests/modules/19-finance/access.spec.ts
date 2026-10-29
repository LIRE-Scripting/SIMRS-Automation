import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { everyPage } from '../../../pages/paging';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, userPage } from '../shared/access';
import { backToIndonesian } from '../shared/language';
import { CAPITAL } from './cases';
import { Accounts, account, BR_A, createAccount, FY_NEXT, ensureFyNext, plain, PostingRules, retireAccount, Vouchers, Years } from './helpers';

/**
 * 19-finance.xlsx, the access test cases of Vouchers, ERP staging, financial
 * years, accounts and posting rules: U2 on "All branches", U3 without any
 * right, and U1 next to a branch of U6 (Kemayoran). FY-OPEN is never locked
 * (it would stop the postings of every module): FY-NEXT stands in for it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

/** The voucher numbers of a user's list, all pages. */
async function voucherNumbers(page: Page): Promise<string[]> {
  const v = new Vouchers(page);
  await v.open();
  return everyPage(page.locator('body'), async () => (await v.rows().allInnerTexts()).map((r) => plain(r).split(' ')[0]));
}

/** Creates a voucher and returns its number (read from the detail). */
async function voucher(page: Page, value: string, party: string): Promise<string> {
  const v = new Vouchers(page);
  expect(await v.create({ value, party, narration: party })).toContain('Voucher created');
  return plain(await v.detail.innerText()).match(/(VCH|SV|DC)-\d+/)?.[0] ?? '';
}

qaTest('TC-APP019-012', async ({ page, qa, browser }) => {
  const v = new Vouchers(page);
  const party = qa.name('QA PT Cabang');
  const branch = v.field('Branch');
  let number = '';

  await qa.step(1, async () => {
    await v.open();
    const headers = (await page.getByRole('table').getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await v.openForm();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await v.field('Voucher value').fill('250000');
    await v.field('Party').fill(party);
    const toasts = await toastsOf(page, () => v.form.getByRole('button', { name: /^(Save|Saving…)$/ }).click());
    expect(toasts).not.toContain('Voucher created');
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: (await branch.locator('option').allInnerTexts()).find((o) => o.includes(BR_B))! });
    expect(await toastsOf(page, () => v.form.getByRole('button', { name: /^(Save|Saving…)$/ }).click())).toContain('Voucher created');
    number = plain(await v.detail.innerText()).match(/(VCH|SV|DC)-\d+/)?.[0] ?? '';
    expect(number).not.toBe('');
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', voucherNumbers)).toContain(number);
    expect(await asUser(browser, 'U1', voucherNumbers)).not.toContain(number);
  });
});

qaTest('TC-APP019-025', async ({ qa, browser }) => {
  // U1 (BR-A, without the "All branches" grant) reads the Branch list of Budget posting rules.
  await asUser(browser, 'U1', async (u1) => {
    const r = new PostingRules(u1);
    await r.open();
    const options = (await r.main.getByRole('combobox', { name: 'Branch' }).locator('option').allInnerTexts()).map((o) => o.trim()).filter(Boolean);
    await qa.step(1, async () => {
      if (options.some((o) => o.includes(BR_B))) qa.deviation(1, 'BR-A only', `the Branch list offers ${options.join(', ')}`);
      else expect(options.every((o) => o.includes('Podomoro'))).toBe(true);
    });
    await qa.step(2, async () => {
      const b = options.find((o) => o.includes(BR_B));
      if (!b) {
        qa.note(2, `${BR_B} cannot be chosen, so its rules cannot be removed`);
        return;
      }
      // Only looked at: "Remove" on a rule of another branch is not clicked.
      await r.main.getByRole('combobox', { name: 'Branch' }).selectOption({ label: b });
      await u1.waitForLoadState('networkidle').catch(() => {});
      const remove = await r.row('Fund release').getByRole('button', { name: 'Remove' }).count();
      if (remove) qa.deviation(2, 'Not possible', `"Remove" is offered on "Fund release" of ${BR_B} (not clicked)`);
    });
  });
});

qaTest('TC-APP019-028', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): FY-NEXT stands in for FY-OPEN; ACC-EXP is an expense account of this test.
  await ensureFyNext(page);
  const exp = await createAccount(page, account(qa, 'QA-5010', 'QA Beban Uji', 'Expense'));
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const party = qa.name('QA Tanpa Hak');
      const toasts = await new Vouchers(staff).create({ value: '100000', party, narration: party });
      expect(toasts).not.toContain('Voucher created');
      qa.note(1, `New voucher: "${toasts.join(' / ') || 'no toast'}"`);
    });

    await qa.step(2, async () => {
      const y = new Years(staff);
      const toasts = await y.create({ code: qa.code('QA-FY-TANPA-HAK'), description: 'QA Tahun tanpa hak' });
      expect(toasts.filter((t) => /created/i.test(t))).toEqual([]);
      await y.open();
      const lock = await y.row(FY_NEXT).getByRole('button', { name: 'Lock' }).count();
      const lockToasts = lock ? await toastsOf(staff, () => y.row(FY_NEXT).getByRole('button', { name: 'Lock' }).click()) : [];
      qa.note(2, `New financial year: "${toasts.join(' / ') || 'no toast'}"; Lock: "${lockToasts.join(' / ') || (lock ? 'no toast' : 'no button')}"`);
      const mine = new Years(page);
      await mine.open();
      const state = (await mine.cells(FY_NEXT))[6];
      if (state === 'Locked') {
        // Put back what U3 changed.
        await toastsOf(page, () => mine.row(FY_NEXT).getByRole('button', { name: 'Unlock' }).click());
      }
      expect(state).not.toBe('Locked');
    });

    await qa.step(3, async () => {
      const acc = new Accounts(staff);
      const code = qa.code('QA-9999');
      const added = await acc.add({ code, name: qa.name('QA Akun Tanpa Hak'), kind: 'Expense' });
      expect(added).not.toContain(`Account ${code.toUpperCase()} created.`);
      await acc.edit(exp.code);
      await acc.fill({ active: false });
      const edited = await acc.save();
      qa.note(3, `New account: "${added.join(' / ') || 'no toast'}"; edit ACC-EXP: "${edited.join(' / ') || 'no toast'}"`);
      expect((await new Accounts(page).cells(exp.code)).join(' ')).toMatch(/Active|Yes/);
    });

    await qa.step(4, async () => {
      const r = new PostingRules(staff);
      await r.open(BR_A);
      const toasts = await r.save(CAPITAL);
      expect(toasts).not.toContain(`${CAPITAL} rule saved.`);
      qa.note(4, `Save rule: "${toasts.join(' / ') || 'no toast'}"`);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
    await retireAccount(page, exp.code);
  }
});

qaTest('TC-APP019-029', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Finance\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/finance/vouchers']));
    await qa.step(3, () => routesRefused(staff, qa, 3, ['/finance/erp-invoice-staging']));
  });
});

qaTest('TC-APP019-030', async ({ page, qa, browser }) => {
  // A voucher of BR-B (made by U6).
  const numberB = await asUser(browser, 'U6', (u6) => voucher(u6, '250000', qa.name('QA PT Cabang')));

  await qa.step(1, async () => {
    expect(numberB).not.toBe('');
    expect(await voucherNumbers(page)).not.toContain(numberB);
  });

  await qa.step(2, async () => {
    const read = async (p: Page) => {
      await p.goto('/id/finance/erp-invoice-staging');
      await p.waitForLoadState('networkidle').catch(() => {});
      return everyPage(p.getByRole('main'), async () => (await p.getByRole('main').getByRole('rowgroup').nth(1).getByRole('row').allInnerTexts()).map((r) => plain(r).split(' ')[0]));
    };
    const ofB = new Set((await asUser(browser, 'U6', read)).filter(Boolean));
    const ofA = (await read(page)).filter(Boolean);
    expect(ofA.filter((x) => ofB.has(x))).toEqual([]);
    qa.note(2, `ERP staging: ${ofB.size} rows of ${BR_B}, none among the ${ofA.length} of U1`);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});
