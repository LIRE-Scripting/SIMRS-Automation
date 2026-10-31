import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { auditEntries, userPage } from '../shared/access';
import { firstCode } from '../../../lib/qa-data/names';
import { clickFor, createAccount } from './helpers';

/**
 * 19-finance.xlsx, Journals (/finance/journals): manual journals saved as a
 * balanced draft, sent, approved, rejected, cancelled, reversed and
 * pre-closed (Data: "debit expense 1000000; credit cash 1000000"). The
 * account lists of the dialog offer only the first 50 accounts (found
 * blocker 40) in code order: the expense account is a QA-5010 expense
 * account made once per worker with a code that sorts first (firstCode;
 * the QA-5010 accounts of earlier runs are past the first 50 since
 * 2026-10-31), the cash account 1101 · Kas of the seed chart. U1 holds the write and the approval right,
 * so it approves too.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CASH = '1101';
let expense: string | undefined;
/** The expense account of this worker (QA-5010 of the workbook), made at its first use with a code the lists offer. */
async function expenseOf(page: Page, qa: Qa): Promise<string> {
  expense ??= (await createAccount(page, { code: firstCode('QA-5010'), name: qa.name('QA Beban Uji'), kind: 'Expense' })).code;
  return expense;
}
const AMOUNT = '1000000';

type Line = { account: string; debit?: string; credit?: string };

class Journals {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto('/id/finance/journals');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Journals' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async openNew(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: 'New journal' }).click();
    await expect(this.dialog).toBeVisible();
  }
  lineBoxes(): { accounts: Locator; debits: Locator; credits: Locator } {
    return {
      accounts: this.dialog.getByRole('combobox', { name: 'Account', exact: true }),
      debits: this.dialog.getByRole('textbox', { name: 'Debit', exact: true }),
      credits: this.dialog.getByRole('textbox', { name: 'Credit', exact: true }),
    };
  }
  /** Fills the dialog: date, narration, the lines (rows added as needed). */
  async fill(v: { date?: string; narration?: string; lines?: Line[]; reversible?: boolean }): Promise<void> {
    if (v.date !== undefined) await this.dialog.getByLabel('Date', { exact: true }).fill(v.date);
    if (v.narration !== undefined) await this.dialog.getByRole('textbox', { name: 'Narration', exact: true }).fill(v.narration);
    if (v.reversible !== undefined) await this.dialog.getByRole('checkbox', { name: 'Reversible' }).setChecked(v.reversible);
    const b = this.lineBoxes();
    for (const [i, l] of (v.lines ?? []).entries()) {
      while ((await b.accounts.count()) <= i) await this.dialog.getByRole('button', { name: 'Add line' }).click();
      const labels = await b.accounts.nth(i).locator('option').evaluateAll((os) => os.map((o) => (o.textContent ?? '').trim()));
      const label = labels.find((o) => o.startsWith(l.account.toUpperCase()));
      expect(label, `an account starting ${l.account} among the ${labels.length - 1} offered (found blocker 40: the first 50)`).toBeTruthy();
      await b.accounts.nth(i).selectOption({ label: label! });
      await b.debits.nth(i).fill(l.debit ?? '');
      await b.credits.nth(i).fill(l.credit ?? '');
    }
  }
  /** Saves the dialog; the toasts and any text the dialog shows. */
  async save(): Promise<string[]> {
    const toasts = await clickFor(this.page, this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }));
    const inDialog = (await this.dialog.isVisible()) ? (await this.dialog.innerText()).replace(/\s+/g, ' ') : '';
    return [...toasts, inDialog];
  }
  row(narration: string): Locator {
    return this.main.getByRole('row').filter({ hasText: narration }).first();
  }
  /** The cells of a journal's row: number, date, narration, amount, approval, document. */
  async cells(narration: string): Promise<string[]> {
    await this.open();
    const r = this.row(narration);
    await expect(r).toBeVisible();
    return (await r.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  async act(narration: string, action: string): Promise<string[]> {
    await this.open();
    return clickFor(this.page, this.row(narration).getByRole('button', { name: action, exact: true }));
  }
}

/** The answer to a journal dated today while the year 2026 has no periods (found blocker 45). */
const NO_PERIOD = 'No financial period covers this date.';

/** A balanced draft journal of the test (expense debit, cash credit); returns its narration and expense account, or noPeriod. */
async function draft(page: Page, qa: Qa, account?: string): Promise<{ narration: string; expense: string; noPeriod: boolean }> {
  const exp = account ?? (await expenseOf(page, qa));
  const j = new Journals(page);
  const narration = qa.prefix('X Jurnal uji');
  await j.openNew();
  await j.fill({ date: todayWib(), narration, lines: [{ account: exp, debit: AMOUNT }, { account: CASH, credit: AMOUNT }] });
  const shown = await j.save();
  if (shown.includes(NO_PERIOD)) return { narration, expense: exp, noPeriod: true };
  expect(shown).toContain('Journal saved');
  return { narration, expense: exp, noPeriod: false };
}

/** Marks steps blocked by 45 when no journal can be saved today; true when it did. */
function noPeriod(qa: Qa, d: { noPeriod: boolean }, steps: number[]): boolean {
  if (!d.noPeriod) return false;
  for (const st of steps) qa.blocked(st, 45);
  return true;
}

/** The movement of an account on Trial balance for the branch and today (its row text). */
async function trialRow(page: Page, code: string): Promise<string> {
  await page.goto('/id/finance/trial-balance');
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.getByRole('main').getByRole('row').filter({ hasText: code.toUpperCase() }).first();
  return (await row.isVisible().catch(() => false)) ? (await row.innerText()).replace(/\s+/g, ' ') : '';
}

qaTest('TC-APP019-044', async ({ page, qa }) => {
  const j = new Journals(page);
  let d = { narration: '', expense: '', noPeriod: false };
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Journals' }).or(j.main.getByRole('link', { name: 'Journals' })).first().click();
    await expect(j.main.getByRole('heading', { level: 1, name: 'Journals' })).toBeVisible();
    await expect(j.main.getByRole('button', { name: 'New journal' })).toBeVisible();
    await expect(j.main.getByRole('columnheader')).toHaveText(['Number', 'Date', 'Narration', 'Amount', 'Approval', 'Document', 'Actions']);
  });
  await qa.step(2, async () => {
    await j.main.getByRole('button', { name: 'New journal' }).click();
    for (const f of ['Date', 'Subtype', 'Narration', 'Reference', 'Reference date']) await expect(j.dialog.getByLabel(f, { exact: true })).toBeVisible();
    await expect(j.dialog.getByRole('checkbox', { name: 'Reversible' })).toBeVisible();
    await expect(j.dialog.getByRole('button', { name: 'Add line' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
  d = await draft(page, qa);
  if (noPeriod(qa, d, [3, 4, 5, 6, 7])) return;
  await qa.step(3, async () => {
    const c = await j.cells(d.narration);
    qa.note(3, `row: ${c.join(' | ')}`);
    expect(c[4]).toBe('Draft');
    await expect(j.row(d.narration).getByRole('button', { name: 'Send', exact: true })).toBeVisible();
  });
  await qa.step(4, async () => {
    await j.act(d.narration, 'Send');
    expect((await j.cells(d.narration))[4]).toBe('Pending');
  });
  await qa.step(5, async () => {
    const toasts = await j.act(d.narration, 'Approve');
    const status = (await j.cells(d.narration))[4];
    if (status !== 'Approved') qa.deviation(5, 'The row shows "Approved"', `approve by U1 (the writer, who holds the approval right too): "${toasts.join(' / ')}"; the row shows "${status}"`);
  });
  await qa.step(6, async () => {
    const exp = await trialRow(page, d.expense);
    qa.note(6, `Trial balance, ${d.expense}: "${exp || 'no row'}"; ${CASH}: "${(await trialRow(page, CASH)) || 'no row'}"`);
    if (!exp.replace(/[.,]/g, '').includes(AMOUNT)) qa.deviation(6, `Movement debit ${AMOUNT} on the expense account`, exp ? `the row reads "${exp}"` : 'the expense account has no row on Trial balance');
  });
  await qa.step(7, async () => {
    const entries = await auditEntries(page, 'finance');
    qa.note(7, `Audit Log, module "finance": ${entries.length} entries; newest "${(entries[0] ?? '').slice(0, 140)}"`);
  });
});

qaTest('TC-APP019-045', async ({ page, qa }) => {
  const j = new Journals(page);
  const exp = await expenseOf(page, qa);
  const narration = qa.prefix('X Jurnal uji');
  const refused = async (step: number, v: Parameters<Journals['fill']>[0], message: string) => {
    await j.openNew();
    await j.fill({ date: todayWib(), narration, ...v });
    const shown = await j.save();
    expect(shown).not.toContain('Journal saved');
    // The period is checked first: while the year has no periods the text of the step is not reached (found blocker 45).
    if (shown[0] === NO_PERIOD && message !== NO_PERIOD) return qa.blocked(step, 45);
    if (!shown.some((t) => t.includes(message))) qa.deviation(step, `The text "${message}"`, `"${shown.join(' / ').slice(-200)}"`);
  };
  await qa.step(1, () => refused(1, { lines: [{ account: exp, debit: AMOUNT }, { account: CASH, credit: '900000' }] }, 'Debit and credit must match, on leaf accounts only.'));
  await qa.step(2, () => refused(2, { lines: [{ account: exp, debit: AMOUNT }] }, 'A journal needs at least two lines.'));
  await qa.step(3, () => refused(3, { narration: '', lines: [{ account: exp, debit: AMOUNT }, { account: CASH, credit: AMOUNT }] }, 'Narration is required.'));
  await qa.step(4, () => refused(4, { reversible: true, lines: [{ account: exp, debit: AMOUNT }, { account: CASH, credit: AMOUNT }] }, 'A reversible journal needs a reverse date.'));
});

qaTest('TC-APP019-046', async ({ page, qa }) => {
  const j = new Journals(page);
  const exp = await expenseOf(page, qa);
  const lines: Line[] = [{ account: exp, debit: AMOUNT }, { account: CASH, credit: AMOUNT }];
  const dated = async (step: number, date: string, message: string) => {
    await j.openNew();
    await j.fill({ date, narration: qa.prefix('X Jurnal uji'), lines });
    const shown = await j.save();
    expect(shown).not.toContain('Journal saved');
    if (shown[0] === NO_PERIOD && message !== NO_PERIOD) return qa.blocked(step, 45);
    if (!shown.some((t) => t.includes(message))) qa.deviation(step, `The text "${message}"`, `"${shown.join(' / ').slice(-200)}"`);
    else qa.note(step, `${date}: "${message}"`);
  };
  await qa.step(1, () => dated(1, addDays(todayWib(), 1), 'The date cannot be in the future.'));
  await qa.step(2, () => dated(2, '2000-01-03', 'No financial period covers this date.'));
  qa.notRun(3, 'needs a locked financial year: locking one closes its books for every user of the hospital');
  qa.notRun(4, '"Mark adjustment" turns an open period of the hospital into an adjustment period for every user');
  await qa.step(5, () => dated(5, addDays(todayWib(), -60), 'The date is outside the allowed back-dated days.'));
});

qaTest('TC-APP019-047', async ({ qa }) => {
  qa.notRun(1, 'needs a user with a transaction limit of 50000000 in the branch configuration (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
  qa.notRun(2, 'needs a user with the finance write right who is not in "Users allowed to transact" (blocker 38)');
  qa.notRun(3, '"Refuse a negative cash or bank balance" is a setting of the branch configuration for every user');
});

qaTest('TC-APP019-048', async ({ page, qa }) => {
  const j = new Journals(page);
  const pending = await draft(page, qa);
  if (noPeriod(qa, pending, [1, 2, 3, 4, 5])) return;
  await j.act(pending.narration, 'Send');
  const cancelled = await draft(page, qa, pending.expense);
  const reversed = await draft(page, qa, pending.expense);
  await j.act(reversed.narration, 'Send');
  await j.act(reversed.narration, 'Approve');
  await qa.step(1, async () => {
    await j.act(pending.narration, 'Reject');
    expect((await j.cells(pending.narration))[4]).toBe('Rejected');
  });
  await qa.step(2, async () => {
    await j.act(cancelled.narration, 'Cancel');
    expect((await j.cells(cancelled.narration))[5]).toBe('Cancelled');
  });
  await qa.step(3, async () => {
    const toasts = await j.act(reversed.narration, 'Reverse');
    await j.open();
    const rows = (await j.main.getByRole('row').filter({ hasText: reversed.narration }).allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
    qa.note(3, `Reverse: "${toasts.join(' / ')}"; rows of the journal: ${rows.join(' ; ')}`);
  });
  await qa.step(4, async () => {
    qa.note(4, `Trial balance, ${pending.expense}: "${(await trialRow(page, pending.expense)) || 'no row'}"`);
  });
  await qa.step(5, async () => {
    const approved = await draft(page, qa, pending.expense);
    await j.act(approved.narration, 'Send');
    await j.act(approved.narration, 'Approve');
    await j.open();
    const pre = j.row(approved.narration).getByRole('button', { name: 'Pre-close', exact: true });
    if (!(await pre.isVisible().catch(() => false))) {
      qa.deviation(5, 'The button "Pre-close" on an approved journal', 'no "Pre-close" on the approved journal');
      return;
    }
    await j.act(approved.narration, 'Pre-close');
    expect((await j.cells(approved.narration))[5]).toBe('Pre-closed');
  });
});

qaTest('TC-APP019-049', async ({ page, qa, browser }) => {
  const j = new Journals(page);
  if (noPeriod(qa, await draft(page, qa), [1, 2, 3])) {
    qa.notRun(4, 'needs a user with the finance write right only (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
    return;
  }
  const second = await userPage(browser, 'U1');
  const j2 = new Journals(second);
  try {
    await qa.step(1, async () => {
      const d = await draft(page, qa);
      await j.act(d.narration, 'Send');
      await j.open();
      await j2.act(d.narration, 'Approve');
      const toasts = await clickFor(page, j.row(d.narration).getByRole('button', { name: 'Cancel', exact: true })).catch(() => ['(no "Cancel" on the row)']);
      const doc = (await j.cells(d.narration))[5];
      expect(doc).not.toBe('Cancelled');
      qa.note(1, `"Cancel" on the stale row: "${toasts.join(' / ') || 'no toast'}"`);
    });
    await qa.step(2, async () => {
      const d = await draft(page, qa);
      await j.act(d.narration, 'Send');
      await j.act(d.narration, 'Approve');
      await j.open();
      await j2.act(d.narration, 'Reverse');
      const toasts = await clickFor(page, j.row(d.narration).getByRole('button', { name: 'Reverse', exact: true })).catch(() => ['(no "Reverse" on the row)']);
      if (!toasts.some((t) => t.includes('This journal is already reversed.'))) qa.deviation(2, 'The text "This journal is already reversed."', `"${toasts.join(' / ') || 'no toast'}"`);
    });
    await qa.step(3, async () => {
      const d = await draft(page, qa);
      await j.open();
      await j2.act(d.narration, 'Send');
      const toasts = await clickFor(page, j.row(d.narration).getByRole('button', { name: 'Send', exact: true })).catch(() => ['(no "Send" on the row)']);
      if (!toasts.some((t) => t.includes('This journal is no longer a draft.'))) qa.deviation(3, 'The text "This journal is no longer a draft."', `"${toasts.join(' / ') || 'no toast'}"`);
    });
    qa.notRun(4, 'needs a user with the finance write right only (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
  } finally {
    await second.context().close();
  }
});
