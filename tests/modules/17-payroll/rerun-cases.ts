import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { asUser } from '../shared/access';
import { Desk, payrollEmployee, plain, SAVED } from './helpers';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of rerun.spec.ts, shared with the end-to-end chains (chain.run). */

export const periodOf = (qa: Qa) => `2099-10-${qa.token()}`;

/** The row of an employee's payslip on Calculate: "Status | Detail | Code". */
export async function slip(d: Desk, code: string): Promise<string> {
  await d.open('/run', 'Re-run');
  const rows = await d.search(code);
  return (await rows.count()) ? plain(await rows.first().innerText()) : '';
}

export const TC_APP017_039: QaBody = async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await payrollEmployee(page, qa);
  const period = periodOf(qa);
  qa.note(3, `period "${period}" of this test stands in for "2026-10", so the real month is never locked`);

  await qa.step(1, async () => {
    await page.goto('/id/payroll');
    await page.getByRole('complementary').getByRole('link', { name: 'Calculate' }).first().click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Re-run' })).toBeVisible();
    await expect(d.main.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await expect(d.main.getByRole('button', { name: 'Correct' })).toBeVisible();
    for (const h of ['Status', 'Detail', 'Code']) await expect(d.main.getByRole('columnheader', { name: h })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.main.getByRole('button', { name: 'Correct' }).click();
    await expect(d.dialog).toHaveAccessibleName('Re-run');
    for (const f of ['Code', 'Account', 'Period']) await expect(d.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.dialog.getByRole('textbox', { name: 'Amount' }).or(d.dialog.getByRole('spinbutton', { name: 'Amount' }))).toBeVisible();
    await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Correct', 'Re-run', 'Doctor fee', 'Lock month']);
    await expect(d.dialog.getByRole('button', { name: 'Save' })).toBeVisible();
    await d.dialog.getByRole('button', { name: 'Close' }).last().click();
  });

  await qa.step(3, async () => {
    expect(await d.calculate({ Code: e.no, Period: period, Amount: '8000000' }, 'Correct')).toContain(SAVED);
    const row = await slip(d, e.no);
    expect(row).toContain(period);
    // The amounts read with or without cents ("8000000.00" on the Indonesian site).
    expect(row).toMatch(/earning 8000000(\.00)? deduction 0(\.00)? net 8000000(\.00)?/);
    expect(row).toContain(e.no);
  });

  await qa.step(4, async () => {
    expect(await d.calculate({ Code: e.no, Period: period, Amount: '8500000' }, 'Correct')).toContain(SAVED);
    expect(await slip(d, e.no)).toMatch(/earning 8500000(\.00)? deduction 0(\.00)? net 8500000(\.00)?/);
  });

  await qa.step(5, async () => {
    const before = await slip(d, e.no);
    expect(await d.calculate({ Code: e.no, Period: period }, 'Re-run')).toContain(SAVED);
    expect(await slip(d, e.no)).toBe(before);
    qa.note(5, 'the row is unchanged after "Re-run" (TBD in the workbook: what a re-run takes into account)');
  });

  await qa.step(6, async () => {
    expect(await d.calculate({ Period: period }, 'Lock month')).toContain(SAVED);
  });

  await qa.step(7, async () => {
    const toasts = await d.calculate({ Code: e.no, Period: period, Amount: '9000000' }, 'Correct');
    expect(toasts).not.toContain(SAVED);
    qa.note(7, `Correct after the lock: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook: the text shown)`);
    expect(await slip(d, e.no)).toContain('net 8500000');
  });
};

export const TC_APP017_040: QaBody = async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await payrollEmployee(page, qa);
  const locked = periodOf(qa);
  expect(await d.calculate({ Code: e.no, Period: locked, Amount: '8000000' }, 'Correct')).toContain(SAVED);
  expect(await d.calculate({ Period: locked }, 'Lock month')).toContain(SAVED);

  await qa.step(1, async () => {
    const toasts = await d.calculate({ Code: e.no, Period: '', Amount: '8000000' }, 'Correct');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Period" empty: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook: the text shown)`);
  });

  await qa.step(2, async () => {
    const toasts = await d.calculate({ Code: `QA-EMP-TIDAK-ADA-${qa.token()}`, Period: periodOf(qa), Amount: '8000000' }, 'Correct');
    expect(toasts).not.toContain(SAVED);
    qa.note(2, `unknown employee: "${toasts.join(' / ') || 'no toast'}"`);
  });

  await qa.step(3, async () => {
    const toasts = await d.calculate({ Code: e.no, Period: locked }, 'Re-run');
    expect(toasts).not.toContain(SAVED);
    qa.note(3, `"Re-run" of a locked period: "${toasts.join(' / ') || 'no toast'}"`);
  });
};

export const TC_APP017_041: QaBody = async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await payrollEmployee(page, qa);
  const other = await payrollEmployee(page, qa);
  const period = periodOf(qa);

  await qa.step(1, async () => {
    for (const amount of ['0', '-500000']) {
      const toasts = await d.calculate({ Code: e.no, Period: period, Amount: amount }, 'Correct');
      qa.note(1, `amount ${amount}: ${toasts.includes(SAVED) ? `saved; the row reads "${await slip(d, e.no)}"` : `"${toasts.join(' / ')}"`} (TBD in the workbook)`);
    }
  });

  await qa.step(2, async () => {
    const toasts = await d.calculate({ Code: other.no, Period: period }, 'Re-run');
    qa.note(2, `"Re-run" for an employee with no payslip: "${toasts.join(' / ') || 'no toast'}"; row "${await slip(d, other.no)}" (TBD in the workbook)`);
  });

  await qa.step(3, async () => {
    expect(await d.calculate({ Period: period }, 'Lock month')).toContain(SAVED);
    await d.open('/run', 'Re-run');
    await d.main.getByRole('button', { name: 'Correct' }).click();
    const actions = await d.dialog.getByRole('combobox', { name: 'Action' }).locator('option').allInnerTexts();
    await d.dialog.getByRole('button', { name: 'Close' }).last().click();
    qa.note(3, `actions offered: ${actions.join(', ')}; ${actions.some((a) => /unlock/i.test(a)) ? 'an unlock is offered' : 'no way to unlock (TBD in the workbook)'}`);
  });

  await qa.step(4, async () => {
    const toasts = await d.calculate({ Period: `2099-13-${qa.token()}` }, 'Lock month');
    qa.note(4, `period "2099-13-…": ${toasts.includes(SAVED) ? 'accepted; the period is free text' : `"${toasts.join(' / ')}"`} (the workbook's "2026-13" with a token, so no real month is touched)`);
  });

  await qa.step(5, async () => {
    await d.open('/run', 'Re-run');
    await d.main.getByRole('button', { name: 'Correct' }).click();
    const reason = await d.dialog.getByRole('textbox', { name: /reason|note|remark/i }).count();
    await d.dialog.getByRole('button', { name: 'Close' }).last().click();
    qa.note(5, `${reason ? 'a reason field is offered' : 'no reason is asked'} when correcting; the row shows no user (TBD in the workbook: Audit)`);
  });
};

export const TC_APP017_042: QaBody = async ({ page, qa, browser }) => {
  const e = await payrollEmployee(page, qa);
  qa.note(1, 'U2 is the user with "All branches" in the header');
  await asUser(browser, 'U2', async (u2) => {
    const d = new Desk(u2);
    await qa.step(1, async () => {
      await d.open('/run', 'Re-run');
      const text = plain(await d.main.innerText());
      const asks = /choose (a|one) branch/i.test(text);
      qa.note(1, asks ? 'the screen asks to choose one branch' : `the screen does not ask for a branch; it reads "${text.slice(0, 160)}" (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const toasts = await d.calculate({ Code: e.no, Period: periodOf(qa), Amount: '8000000' }, 'Correct');
      expect(toasts).not.toContain(SAVED);
      qa.note(2, `Save on "All branches": "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook: the text shown)`);
    });
  });
};
