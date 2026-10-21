import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { OT } from '../../../lib/ot-data';
import { OtRequestsPage, type RowAction } from '../../../pages/ot/OtPages';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { act, cellsOf, procedure, request } from './helpers';

/**
 * 08-operation-theater.xlsx, the access test cases of OT requests: U2 on
 * "All branches", U3 without any right, and U1 next to a branch of U6
 * (Kemayoran). Each request carries the workbook procedure plus a token.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Rows of a request (by its procedure) on the OT requests list of a user, paging through it. */
async function listed(page: Page, p: string): Promise<number> {
  const ot = new OtRequestsPage(page);
  await ot.open();
  return (await ot.row(p)).count();
}

/** Presses a row action of a user without the right (the buttons run past the screen's edge: keyboard). */
async function press(page: Page, p: string, name: RowAction): Promise<() => Promise<unknown>> {
  const ot = new OtRequestsPage(page);
  await ot.open();
  const button = ot.action(await ot.row(p), name);
  return () => button.press('Enter');
}

qaTest('TC-APP008-006', async ({ page, qa, browser }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  const branch = ot.dialog.getByRole('combobox', { name: 'Branch' });

  await qa.step(1, async () => {
    await ot.open();
    await expect(ot.rows().first()).toBeVisible();
    const headers = (await ot.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')}); ${(await ot.pager().innerText().catch(() => '')).trim()}`);
  });

  await qa.step(2, async () => {
    await ot.openNew();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await ot.fill({ procedure: p });
    const toasts = await toastsOf(page, () => ot.save().click());
    expect(toasts).not.toContain('Request created');
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => ot.save().click())).toContain('Request created');
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', (u6) => listed(u6, p))).toBe(1);
    expect(await asUser(browser, 'U1', (u1) => listed(u1, p))).toBe(0);
  });
});

qaTest('TC-APP008-018', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): RQ-NEW, and RQ-PREP scheduled (its list prepared), both with the blocked amount.
  const rqNew = procedure(qa);
  const rqPrep = procedure(qa);
  await request(page, { procedure: rqNew, amount: OT.amount });
  await request(page, { procedure: rqPrep, amount: OT.amount });
  expect(await act(page, rqPrep, 'Schedule')).toContain('Scheduled');
  const prepBefore = await cellsOf(page, rqPrep);

  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const ot = new OtRequestsPage(staff);
      const other = procedure(qa);
      await ot.open();
      await ot.openNew();
      await ot.fill({ procedure: other });
      await tryRefused(qa, 1, staff, 'Save', /^Request created$/, () => ot.save().click());
      expect(await listed(page, other)).toBe(0);
    });

    await qa.step(2, async () => {
      await tryRefused(qa, 2, staff, 'Schedule', /^Scheduled$/, await press(staff, rqNew, 'Schedule'));
      expect((await cellsOf(page, rqNew))[4]).toBe('No');
    });

    await qa.step(3, async () => {
      await tryRefused(qa, 3, staff, 'Consume', /^Consumed$/, await press(staff, rqPrep, 'Consume'));
      expect((await cellsOf(page, rqPrep))[3]).toBe(prepBefore[3]);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP008-019', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Operation Theater\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/ot/requests']));
  });
});

qaTest('TC-APP008-020', async ({ page, qa, browser }) => {
  // Precondition: RQ-B, a request of BR-B made by U6.
  const rqB = procedure(qa);
  await asUser(browser, 'U6', (u6) => request(u6, { procedure: rqB, amount: OT.amount }));

  await qa.step(1, async () => {
    expect(await listed(page, rqB)).toBe(0);
  });

  await qa.step(2, () => headerOneBranch(page, qa, 2));
});
